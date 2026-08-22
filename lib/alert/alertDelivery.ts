import type { KvNamespace as KvNamespaceLike } from "../runtime/kv";
import type { AlertDecision, AlertConditions, LastAlertState } from "./alertEvaluator";
import { loadReportData } from "../report/reportData";
import { evaluateAlert } from "./alertEvaluator";
import { decisionVerdictEmail, thresholdCrossingEmail } from "./alertTemplates";
import {
  createCloudflareEmailAdapter,
  type EmailDeliveryAdapter,
} from "../email/emailDelivery";
import {
  getAlertPreferenceRepository,
  type AlertPreferences,
} from "../storage/alertPreferenceRepository";
import { getSubscriberStore } from "../email/subscriberStore";

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

/**
 * Only a verified, still-active subscriber is a recipient.
 *
 * The clientId on an alert-pref record is self-asserted: POST /api/alert-preferences
 * authorizes it by comparing the body's clientId to a header the same caller sets. This
 * used to return an email-shaped clientId as its own recipient, so that unauthenticated
 * write was enough to enroll any address in recurring alert mail — an address whose owner
 * had never asked for it, and had no record to unsubscribe from. The subscriber record is
 * the only evidence that the address consented, so require it on both lookups.
 */
export const resolveRecipientEmail = async (clientId: string): Promise<string | null> => {
  try {
    const store = getSubscriberStore();
    const subscriber =
      (await store.getSubscriberByEmail(clientId)) ?? (await store.getSubscriberByToken(clientId));

    if (!subscriber?.verified || !subscriber.active) return null;
    return isValidEmail(subscriber.email) ? subscriber.email : null;
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
    let template: ReturnType<typeof decisionVerdictEmail>;
    if (alert.type === "regime_change") {
      template = decisionVerdictEmail({
        headline: "RECONSIDER OPERATING POSTURE",
        why: `The operating regime shifted to ${conditions.regime}. The assumptions behind the current posture have moved.`,
        actionNow: conditions.posture,
        reversal: "Revert only if the prior regime state holds across two consecutive updates.",
      });
    } else if (alert.metric === "credit") {
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

/**
 * Cron entry point: derive current alert conditions from report data and deliver.
 * Shared by the cron trigger (direct call from worker/index.ts) and the authenticated
 * branch of POST /api/alert-deliveries, so the cron never fetches its own endpoint.
 */
export const runScheduledAlertDelivery = async (): Promise<DeliveryResult> => {
  const reportResult = await loadReportData();
  const { assessment } = reportResult;

  const conditions: AlertConditions = {
    regime: assessment.regime,
    tightness: assessment.scores.tightness,
    riskAppetite: assessment.scores.riskAppetite,
    posture: assessment.description,
    recordDate: reportResult.recordDateLabel ?? new Date().toISOString(),
  };

  return deliverAlerts(conditions);
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
      // Not a failure: a preference record whose clientId names no verified subscriber is
      // simply not owed mail. Counting it as an error would bury real send failures.
      skipped++;
      continue;
    }
    for (const alert of alerts) {
      // Keyed on the address, not on the preference record. Two records can resolve to one
      // inbox — the address itself and that subscriber's token — and a clientId key gave
      // each of them its own "already delivered" marker, so the reader got two copies.
      const already = await wasAlreadyDelivered(targetEmail, alert.type);
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
        await trackAlertDelivery(targetEmail, alert.type);
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
