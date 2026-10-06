import type { KvNamespace as KvNamespaceLike } from "../runtime/kv";
import type { AlertDecision, AlertConditions, LastAlertState } from "./alertEvaluator";
import { alertDeliveryKey, evaluateAlert } from "./alertEvaluator";
import { decisionVerdictEmail, flashMoveEmail, planLineEmail, thresholdCrossingEmail } from "./alertTemplates";
import { describePlanLineCrossing, evaluatePlanLineCrossings, planLineDeliveryKey } from "./planLines";
import { evaluateFlashMoves, flashInputsFrom } from "./flashMoves";
import {
  createCloudflareEmailAdapter,
  type EmailDeliveryAdapter,
} from "../email/emailDelivery";
import { getSubscriberStore, type Subscriber } from "../email/subscriberStore";
import type { OperatingSnapshot } from "../operatingState/types";
import type { WeeklyCallContract } from "../report/weeklyCallContract";
import { assessReadingReadiness, resolveOperatingSnapshot } from "../operatingState/resolveSnapshot";
import { getRegimePublicLabel } from "../regimePresentation";
import { describeConditions } from "../export/exportTerms";

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

type DeliveryResult = {
  sent: number;
  skipped: number;
  errors: number;
  alerts: AlertDecision[];
  /** Set when the only reading available was not one to act on; nothing was judged or sent. */
  refused?: string;
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
    if (alert.type === "flash" && alert.flash) {
      template = flashMoveEmail(alert.flash, unsubscribeToken);
    } else if (alert.type === "regime_change") {
      /* The engine key reached every subscriber here ("shifted to SCARCITY");
         the weather word and what it means for money is what a reader acts on. */
      template = decisionVerdictEmail({
        headline: `CONDITIONS TURNED ${getRegimePublicLabel(conditions.regime).toUpperCase()}`,
        why: `Conditions are now ${describeConditions(conditions.regime)}. Last week's plan rested on the previous conditions.`,
        actionNow: conditions.posture,
        reversal: "The readings return to the previous conditions for two updates in a row.",
        unsubscribeToken,
      });
    } else if (alert.line) {
      template = thresholdCrossingEmail(alert.line, conditions[alert.line.metric], unsubscribeToken);
    } else {
      return false;
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

const sendPlanLineEmail = async (
  sub: Subscriber,
  crossing: { headline: string; body: string },
  adapter: EmailDeliveryAdapter,
): Promise<boolean> => {
  try {
    const template = planLineEmail(crossing, sub.token);
    const result = await adapter.send({
      to: { email: sub.email },
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
    return result.ok;
  } catch {
    return false;
  }
};

const trackAlertDelivery = async (
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
  /** The read before `snapshot`, so a flash can be judged on consecutive reads. */
  previousSnapshot?: OperatingSnapshot | null;
}): Promise<DeliveryResult> => {
  /* The cron's snapshot, else the stored one, else a report read — the manual
     route's path when nothing is stored. */
  const reading = await resolveOperatingSnapshot({
    given: { snapshot: options?.snapshot, weeklyCall: options?.weeklyCall },
    onMiss: "report",
    route: "alert-deliveries",
  });

  /* A report read serves the bundled copy on an outage. Judged as a reading, a
     first run mailed every opted-in subscriber a regime change and wrote
     `alert:state` from the copy; the regime check refuses the same reading for
     the same reason (lib/alert/checkRegimeChange.ts). */
  if (reading.source === "report") {
    const readiness = assessReadingReadiness(reading, new Date());
    if (!readiness.ok) {
      return { sent: 0, skipped: 0, errors: 0, alerts: [], refused: `refused_unpublishable: ${readiness.reason}` };
    }
  }

  const assessment = reading.source === "report" ? reading.report.assessment : reading.snapshot.assessment;
  const recordDate =
    reading.source === "report" ? reading.report.recordDateLabel : reading.snapshot.provenance.recordDateLabel;

  /* Consecutive reads exist only when the cron handed both over. */
  let flashMoves: AlertConditions["flashMoves"];
  let previousScores: AlertConditions["previousScores"] = null;
  if (reading.source === "given") {
    previousScores = options?.previousSnapshot ? options.previousSnapshot.assessment.scores : null;
    flashMoves = evaluateFlashMoves(
      flashInputsFrom(reading.snapshot),
      options?.previousSnapshot ? flashInputsFrom(options.previousSnapshot) : null,
    );
  }

  const conditions: AlertConditions = {
    regime: assessment.regime,
    tightness: assessment.scores.tightness,
    riskAppetite: assessment.scores.riskAppetite,
    posture: assessment.description,
    recordDate,
    thresholds: assessment.thresholds,
    previousScores,
    ...(flashMoves && flashMoves.length > 0 ? { flashMoves } : {}),
  };

  return deliverAlerts(conditions);
};

export const deliverAlerts = async (
  conditions: AlertConditions,
): Promise<DeliveryResult> => {
  const lastKnown = await readAlertState();
  const alerts = evaluateAlert(conditions, lastKnown);

  /* Plan lines are judged reading against reading, so with a previous reading
     every run has to look at the subscribers even when no published alert fired:
     a subscriber's own line can be crossed on a day nothing else moved. */
  if (alerts.length === 0 && !conditions.previousScores) {
    return { sent: 0, skipped: 0, errors: 0, alerts: [] };
  }

  const subscribers = await listAlertSubscribers();
  if (subscribers.length === 0) {
    if (alerts.length === 0) return { sent: 0, skipped: 0, errors: 0, alerts };
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
      const already = await wasAlreadyDelivered(sub.email, alertDeliveryKey(alert));
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
        await trackAlertDelivery(sub.email, alertDeliveryKey(alert));
      } else {
        errors++;
      }
    }

    const current = { tightness: conditions.tightness, riskAppetite: conditions.riskAppetite };
    for (const crossing of evaluatePlanLineCrossings(sub.planLines, current, conditions.previousScores)) {
      const key = planLineDeliveryKey(crossing);
      if (await wasAlreadyDelivered(sub.email, key)) {
        skipped++;
        continue;
      }
      const ok = await sendPlanLineEmail(
        sub,
        describePlanLineCrossing(crossing, current, { regime: conditions.regime, runway: sub.planRunway }),
        adapter,
      );
      if (ok) {
        sent++;
        await trackAlertDelivery(sub.email, key);
      } else {
        errors++;
      }
    }
  }

  /* The published-line state moves only when a published alert fired, as before:
     it is "where the scores were when we last wrote", not the previous reading. */
  if (alerts.length === 0) return { sent, skipped, errors, alerts };

  await writeAlertState({
    regime: conditions.regime,
    tightness: conditions.tightness,
    riskAppetite: conditions.riskAppetite,
    lastSentAt: new Date().toISOString(),
  });

  return { sent, skipped, errors, alerts };
};
