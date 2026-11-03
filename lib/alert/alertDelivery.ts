import { z } from "zod";
import { getJson, getWhetherKv } from "../runtime/kv";
import type { AlertDecision, AlertConditions, LastAlertState } from "./alertEvaluator";
import { alertDeliveryKey, evaluateAlert } from "./alertEvaluator";
import { decisionVerdictEmail, flashMoveEmail, planLineEmail, thresholdCrossingEmail } from "./alertTemplates";
import { describePlanLineCrossing, evaluatePlanLineCrossings, planLineDeliveryKey } from "./planLines";
import { evaluateFlashMoves, flashInputsFrom } from "./flashMoves";
import {
  createCloudflareEmailAdapter,
  type EmailDeliveryAdapter,
} from "../email/emailDelivery";
import { unsubscribeHeaders } from "../email/emailShell";
import { getSubscriberStore, type Subscriber } from "../email/subscriberStore";
import type { OperatingSnapshot } from "../operatingState/types";
import type { WeeklyCallContract } from "../report/weeklyCallContract";
import { assessReadingReadiness, resolveOperatingSnapshot } from "../operatingState/resolveSnapshot";
import { getRegimePublicLabel } from "../regimePresentation";
import { sentMarkers } from "../delivery/onceFor";
import { describeConditions } from "../export/exportTerms";
import { buildBriefDocumentFromReport } from "../report/briefDocument";
import { getRegimeAlertRepository } from "../storage/regimeAlertRepository";
import { buildLineage } from "../storage/lineage";
import { sha256Hex } from "../crypto";

const ALERT_STATE_KEY = "alert:state";
const ALERT_DELIVERED_PREFIX = "alert:delivered:";

/* What `writeAlertState` stores. A record that does not match reads as no state, as an unparseable one always did. */
const lastAlertStateSchema: z.ZodType<LastAlertState> = z.object({
  regime: z.string(),
  tightness: z.number(),
  riskAppetite: z.number(),
  lastSentAt: z.string(),
});

const readAlertState = async (): Promise<LastAlertState | null> => {
  const kv = getWhetherKv();
  if (!kv) return null;
  try {
    return await getJson(kv, ALERT_STATE_KEY, lastAlertStateSchema);
  } catch {
    return null;
  }
};

const writeAlertState = async (state: LastAlertState): Promise<void> => {
  const kv = getWhetherKv();
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

/** The same alert reaches an inbox at most once in this window. */
const ALERT_REDELIVERY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/* The shared sent-marker store (`lib/delivery/onceFor.ts`) with a rolling
   window instead of a period, under the keys these markers have always had. */
const deliveredMarkers = () =>
  sentMarkers({
    kv: getWhetherKv(),
    keyFor: (key) => `${ALERT_DELIVERED_PREFIX}${key}`,
    withinMs: ALERT_REDELIVERY_WINDOW_MS,
  });

const wasAlreadyDelivered = (email: string, alertType: string): Promise<boolean> =>
  deliveredMarkers().wasSent(`${email}:${alertType}`);

const recordDelivery = (email: string, alertType: string): Promise<void> =>
  deliveredMarkers().markSent(`${email}:${alertType}`);

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
  baseUrl?: string,
): Promise<boolean> => {
  try {
    let template: ReturnType<typeof decisionVerdictEmail>;
    if (alert.type === "flash" && alert.flash) {
      template = flashMoveEmail(alert.flash, unsubscribeToken, baseUrl);
    } else if (alert.type === "regime_change") {
      /* The engine key reached every subscriber here ("shifted to SCARCITY");
         the weather word and what it means for money is what a reader acts on.
         The action slot printed the assessment's description ("Capital is
         expensive…"), which is not an action, and the change slot printed "The
         readings return to the previous conditions for two updates in a row.",
         which on Oct 5 was wrong: risk appetite clearing 50 alone moved
         Freezing to Cloudy, not back to Sunny. Both are the week's guidance now,
         the sentences the brief prints under the same labels. */
      template = decisionVerdictEmail({
        headline: `CONDITIONS TURNED ${getRegimePublicLabel(conditions.regime).toUpperCase()}`,
        why: `Conditions are now ${describeConditions(conditions.regime)}. Last week's plan rested on the previous conditions.`,
        actionNow: conditions.actionNow,
        reversal: conditions.callChangesIf,
        unsubscribeToken,
        baseUrl,
      });
    } else if (alert.line) {
      template = thresholdCrossingEmail(alert.line, conditions[alert.line.metric], unsubscribeToken, baseUrl);
    } else {
      return false;
    }
    const result = await adapter.send({
      to: { email },
      subject: template.subject,
      html: template.html,
      text: template.text,
      headers: unsubscribeHeaders(unsubscribeToken, baseUrl),
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
  baseUrl?: string,
): Promise<boolean> => {
  try {
    const template = planLineEmail(crossing, sub.token, baseUrl);
    const result = await adapter.send({
      to: { email: sub.email },
      subject: template.subject,
      html: template.html,
      text: template.text,
      headers: unsubscribeHeaders(sub.token, baseUrl),
    });
    return result.ok;
  } catch {
    return false;
  }
};

/**
 * A successful send leaves two records: the marker that keeps the same alert out of this
 * inbox for a week, and a row in the delivery log that `GET /api/alert-deliveries` lists and
 * `/api/weekly-digest` counts. Only the marker was written once the unauthenticated route
 * that appended rows was removed, so both read zero however many alerts went out. The row
 * names the recipient by the address's hash, as the weekly send markers do, not the address.
 */
const trackAlertDelivery = async (
  email: string,
  alertType: string,
  summary: string,
): Promise<void> => {
  await recordDelivery(email, alertType);
  try {
    const lineage = buildLineage("request-received-at");
    await getRegimeAlertRepository().appendDelivery({
      ...lineage,
      canonicalTimestampSource: "request-received-at",
      id: lineage.eventId,
      clientId: await sha256Hex(email.trim()),
      alertId: alertType,
      channel: "email",
      deliveredAt: new Date().toISOString(),
      status: "sent",
      summary,
    });
  } catch {
    /* The mail went out; a missing log row must not count it as a failed send. */
  }
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
  /** The origin the mail's links carry; a request-triggered run passes its own host. */
  baseUrl?: string;
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
  /* The call the brief prints for this reading: the snapshot's own contract, or
     for a report read the one the Slack brief builds from the same read. */
  const weeklyCall = reading.source === "report"
    ? (await buildBriefDocumentFromReport(reading.report, { degraded: reading.degraded })).slots
    : reading.weeklyCall;

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
    actionNow: weeklyCall.actionNow,
    callChangesIf: weeklyCall.callChangesIf,
    recordDate,
    thresholds: assessment.thresholds,
    previousScores,
    ...(flashMoves && flashMoves.length > 0 ? { flashMoves } : {}),
  };

  return deliverAlerts(conditions, { baseUrl: options?.baseUrl });
};

export const deliverAlerts = async (
  conditions: AlertConditions,
  options: { baseUrl?: string } = {},
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
        options.baseUrl,
      );
      if (ok) {
        sent++;
        await trackAlertDelivery(sub.email, alertDeliveryKey(alert), alert.headline);
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
      const described = describePlanLineCrossing(crossing, current, { regime: conditions.regime, runway: sub.planRunway });
      const ok = await sendPlanLineEmail(sub, described, adapter, options.baseUrl);
      if (ok) {
        sent++;
        await trackAlertDelivery(sub.email, key, described.headline);
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
