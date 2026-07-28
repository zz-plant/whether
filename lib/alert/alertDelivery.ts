import type { AlertDecision, AlertConditions, LastAlertState } from "./alertEvaluator";
import { evaluateAlert } from "./alertEvaluator";
import { regimeChangeEmail, thresholdCrossingEmail } from "./alertTemplates";
import {
  createCloudflareEmailAdapter,
  type EmailDeliveryAdapter,
} from "../email/emailDelivery";
import {
  getAlertPreferenceRepository,
  type AlertPreferences,
} from "../storage/alertPreferenceRepository";
import { getSubscriberStore } from "../email/subscriberStore";

type KvNamespaceLike = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  list(options?: {
    prefix?: string;
    cursor?: string;
    limit?: number;
  }): Promise<{
    keys: Array<{ name: string }>;
    list_complete: boolean;
    cursor?: string;
  }>;
};

const ALERT_STATE_KEY = "alert:state";
const ALERT_DELIVERED_PREFIX = "alert:delivered:";

const getKv = (): KvNamespaceLike | null => {
  const binding = (globalThis as {
    WHETHER_DURABLE_KV?: KvNamespaceLike;
  }).WHETHER_DURABLE_KV;
  if (
    !binding ||
    typeof binding.get !== "function" ||
    typeof binding.put !== "function" ||
    typeof binding.list !== "function"
  ) {
    return null;
  }
  return binding;
};

const readAlertState = async (): Promise<LastAlertState | null> => {
  const kv = getKv();
  if (!kv) return null;
  try {
    const raw = await kv.get(ALERT_STATE_KEY);
    return raw ? (JSON.parse(raw) as LastAlertState) : null;
  } catch {
    return null;
  }
};

const writeAlertState = async (state: LastAlertState): Promise<void> => {
  const kv = getKv();
  if (!kv) return;
  try {
    await kv.put(ALERT_STATE_KEY, JSON.stringify(state));
  } catch {
    /* non-fatal */
  }
};

const listAlertSubscribers = async (): Promise<
  Array<{ clientId: string; preferences: AlertPreferences }>
> => {
  const kv = getKv();
  if (!kv) return [];
  const repository = getAlertPreferenceRepository();
  const subscribers: Array<{
    clientId: string;
    preferences: AlertPreferences;
  }> = [];
  let cursor: string | undefined;
  const PREF_PREFIX = "alert-pref:";
  const PREFERENCE_READ_CONCURRENCY = 32;
  do {
    try {
      const page = await kv.list({ prefix: PREF_PREFIX, cursor, limit: 500 });
      const clientIds = page.keys
        .map((key) => key.name.slice(PREF_PREFIX.length))
        .filter(Boolean);

      // Previously one serial KV read per key, so this scaled linearly in wall-clock with
      // the subscriber count. Batched with a bound on simultaneous subrequests.
      for (let offset = 0; offset < clientIds.length; offset += PREFERENCE_READ_CONCURRENCY) {
        const batch = clientIds.slice(offset, offset + PREFERENCE_READ_CONCURRENCY);
        const resolved = await Promise.all(batch.map((clientId) => repository.get(clientId)));

        for (let i = 0; i < batch.length; i++) {
          const prefs = resolved[i];
          if (prefs?.email) {
            subscribers.push({ clientId: batch[i], preferences: prefs });
          }
        }
      }
      cursor = page.cursor;
      if (page.list_complete) break;
    } catch {
      break;
    }
  } while (cursor);
  return subscribers;
};

const wasAlreadyDelivered = async (
  email: string,
  alertType: string,
): Promise<boolean> => {
  const kv = getKv();
  if (!kv) return false;
  try {
    const raw = await kv.get(`${ALERT_DELIVERED_PREFIX}${email}:${alertType}`);
    if (!raw) return false;
    const deliveredMs = Date.parse(raw);
    if (Number.isNaN(deliveredMs)) return false;
    return Date.now() - deliveredMs < 7 * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
};

const isValidEmail = (raw: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw.trim());

const resolveRecipientEmail = async (clientId: string): Promise<string | null> => {
  if (isValidEmail(clientId)) return clientId.trim();
  try {
    const store = getSubscriberStore();
    const sub = (await store.getSubscriberByEmail(clientId)) ?? (await store.getSubscriberByToken(clientId));
    return sub && sub.email && isValidEmail(sub.email) ? sub.email : null;
  } catch {
    return null;
  }
};

const recordDelivery = async (
  email: string,
  alertType: string,
): Promise<void> => {
  const kv = getKv();
  if (!kv) return;
  try {
    await kv.put(
      `${ALERT_DELIVERED_PREFIX}${email}:${alertType}`,
      new Date().toISOString(),
    );
  } catch {
    /* non-fatal */
  }
};

export type DeliveryResult = {
  sent: number;
  skipped: number;
  errors: number;
  alerts: AlertDecision[];
};

export const deliverAlertToSubscriber = async (
  email: string,
  alert: AlertDecision,
  conditions: AlertConditions,
  adapter: EmailDeliveryAdapter,
): Promise<boolean> => {
  try {
    let template: ReturnType<typeof regimeChangeEmail>;
    if (alert.type === "regime_change") {
      template = regimeChangeEmail(conditions.regime, conditions.posture);
    } else if (
      alert.headline.toLowerCase().includes("tightness")
    ) {
      const threshold = alert.severity === "warning" ? 75 : 50;
      template = thresholdCrossingEmail(
        "credit",
        conditions.tightness,
        threshold,
      );
    } else {
      const threshold = alert.severity === "warning" ? 75 : 50;
      template = thresholdCrossingEmail(
        "sentiment",
        conditions.riskAppetite,
        threshold,
      );
    }
    const result = await adapter.send({
      to: { email },
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
    return result.ok;
  } catch {
    return false;
  }
};

export const trackAlertDelivery = async (
  email: string,
  alertType: string,
): Promise<void> => {
  await recordDelivery(email, alertType);
};

export const deliverAlerts = async (
  conditions: AlertConditions,
): Promise<DeliveryResult> => {
  const lastKnown = await readAlertState();
  const alerts = evaluateAlert(conditions, lastKnown);

  if (alerts.length === 0) {
    return { sent: 0, skipped: 0, errors: 0, alerts: [] };
  }

  const subscribers = await listAlertSubscribers();
  if (subscribers.length === 0) {
    await writeAlertState({
      regime: conditions.regime,
      tightness: conditions.tightness,
      riskAppetite: conditions.riskAppetite,
      lastSentAt: new Date().toISOString(),
    });
    return { sent: 0, skipped: 0, errors: 0, alerts };
  }

  const adapter = createCloudflareEmailAdapter();
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const sub of subscribers) {
    const targetEmail = await resolveRecipientEmail(sub.clientId);
    if (!targetEmail) {
      errors++;
      continue;
    }
    for (const alert of alerts) {
      const already = await wasAlreadyDelivered(sub.clientId, alert.type);
      if (already) {
        skipped++;
        continue;
      }
      const ok = await deliverAlertToSubscriber(
        targetEmail,
        alert,
        conditions,
        adapter,
      );
      if (ok) {
        sent++;
        await trackAlertDelivery(sub.clientId, alert.type);
      } else {
        errors++;
      }
    }
  }

  await writeAlertState({
    regime: conditions.regime,
    tightness: conditions.tightness,
    riskAppetite: conditions.riskAppetite,
    lastSentAt: new Date().toISOString(),
  });

  return { sent, skipped, errors, alerts };
};
