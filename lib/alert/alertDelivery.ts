import type { KvNamespace as KvNamespaceLike } from "../runtime/kv";
import type { AlertDecision, AlertConditions, LastAlertState } from "./alertEvaluator";
import { loadReportData } from "../report/reportData";
import { evaluateAlert } from "./alertEvaluator";
import { decisionVerdictEmail, thresholdCrossingEmail } from "./alertTemplates";
import {
  createCloudflareEmailAdapter,
  type EmailDeliveryAdapter,
} from "../email/emailDelivery";
import { getSubscriberStore, type Subscriber } from "../email/subscriberStore";
import type { OperatingSnapshot } from "../operatingState/types";
import type { WeeklyCallContract } from "../report/weeklyCallContract";
import { getOperatingSnapshotStore } from "../operatingState/snapshotStore";

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

/**
 * The people who opted into alert mail: active, verified, `alerts: true`.
 *
 * This used to scan an `alert-pref:` keyspace instead. The browser wrote those records
 * keyed on a random client UUID, and the recipient lookup below only ever accepted a
 * subscriber token — so every record the alerts panel wrote was counted and then
 * skipped, and the enrollment path the tests described ("enrolled by token") had no
 * surface that could take it. The opt-in now rides the subscription, where the verified
 * address and the consent already live.
 */
const listAlertSubscribers = async (): Promise<Subscriber[]> => {
  try {
    return await getSubscriberStore().listAlertSubscribers();
  } catch {
    return [];
  }
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
  unsubscribeToken?: string | null,
): Promise<boolean> => {
  try {
    let template: ReturnType<typeof decisionVerdictEmail>;
    if (alert.type === "regime_change") {
      template = decisionVerdictEmail({
        headline: "RECONSIDER OPERATING POSTURE",
        why: `The operating regime shifted to ${conditions.regime}. The assumptions behind the current posture have moved.`,
        actionNow: conditions.posture,
        reversal: "Revert only if the prior regime state holds across two consecutive updates.",
        unsubscribeToken,
      });
    } else if (alert.metric === "credit") {
      const threshold = alert.severity === "warning" ? 75 : 50;
      template = thresholdCrossingEmail(
        "credit",
        conditions.tightness,
        threshold,
        unsubscribeToken,
      );
    } else {
      const threshold = alert.severity === "warning" ? 75 : 50;
      template = thresholdCrossingEmail(
        "sentiment",
        conditions.riskAppetite,
        threshold,
        unsubscribeToken,
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
 * branch of POST /api/alert-deliveries, projecting the authoritative OperatingSnapshot.
 */
export const runScheduledAlertDelivery = async (options?: {
  snapshot?: OperatingSnapshot;
  weeklyCall?: WeeklyCallContract;
}): Promise<DeliveryResult> => {
  let assessment;

  let recordDate = new Date().toISOString();

  if (options?.snapshot) {
    assessment = options.snapshot.assessment;
    recordDate = options.snapshot.provenance.recordDateLabel;
  } else {
    const stored = await getOperatingSnapshotStore().readLatest();
    if (stored) {
      assessment = stored.assessment;
      recordDate = stored.provenance.recordDateLabel;
    } else {
      const reportResult = await loadReportData();
      assessment = reportResult.assessment;
      recordDate = reportResult.recordDateLabel;
    }
  }

  const conditions: AlertConditions = {
    regime: assessment.regime,
    tightness: assessment.scores.tightness,
    riskAppetite: assessment.scores.riskAppetite,
    posture: assessment.description,
    recordDate,
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
    for (const alert of alerts) {
      // Keyed on the address rather than on the record, because two records could once
      // resolve to one inbox and each got its own "already delivered" marker — the
      // reader received two copies of the same alert.
      const already = await wasAlreadyDelivered(sub.email, alert.type);
      if (already) {
        skipped++;
        continue;
      }
      const ok = await deliverAlertToSubscriber(
        sub.email,
        alert,
        conditions,
        adapter,
        sub.token,
      );
      if (ok) {
        sent++;
        await trackAlertDelivery(sub.email, alert.type);
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
