import { createCloudflareEmailAdapter, getActiveSubscriptions } from "./emailDelivery";
import { unsubscribeFooterHtml, unsubscribeFooterText } from "../alert/alertTemplates";
import type { OperatingSnapshot } from "../operatingState/types";
import { weeklyCallChangeLines, type WeeklyCallContract } from "../report/weeklyCallContract";
import { getOperatingSnapshotStore } from "../operatingState/snapshotStore";
import { DECISION_CONTRACT_LABELS } from "../report/reportCopy";
import { getRegimePublicLabel, getRegimeWeatherRationale } from "../regimePresentation";
import { describeConditions, formatExportConfidenceWord, pauseConditionOnly } from "../export/exportTerms";
import { signalReadingMeaning } from "../report/signalTranslations";
import { assessPublishReadiness } from "../report/briefPublishGuard";
import { siteUrl } from "../siteUrl";
import { resolvePublishedConfidence, type ConfidenceInputs, type ConfidenceRecord } from "../report/confidence";

/**
 * How far a reading sits from the line that would change the call, and which
 * side of it.
 *
 * The label above this number said "vs last week", which it never was, and the
 * fix for that made it "vs the regime line" — true, and still not the language
 * of the person reading it in an inbox. "The regime line" is the engine's name
 * for a threshold, and a bare "+9.0" leaves a reader to work out on their own
 * which direction is the bad one. Same number, said the way a recipient would
 * say it, with the side folded into the model rather than re-derived in the
 * renderer by checking whether the string starts with a plus.
 */
const distanceFromLine = (
  vsThreshold: number | null | undefined,
  worseSide: "above" | "below",
): { label: string; worse: boolean } | null => {
  if (typeof vsThreshold !== "number" || !Number.isFinite(vsThreshold)) return null;

  const points = Math.round(Math.abs(vsThreshold) * 10) / 10;
  if (points === 0) return { label: "sitting on the line where conditions change", worse: true };

  const side = vsThreshold > 0 ? "above" : "below";
  return { label: `${points} points ${side} the line where conditions change`, worse: side === worseSide };
};

/**
 * The numbers the call was scored on, as one row.
 *
 * This is the highest-fanout artifact the product sends and it used to carry
 * no number at all — four sentences and a link. The scores, where they sit
 * against the regime line, and the confidence label are what a reader forwards.
 *
 * The second number is a distance from the threshold, and this said "vs last
 * week" under it for as long as it has carried numbers. It never was a weekly
 * move: two identical weeks reported the same non-zero figure, because the
 * figure is how far the score sits above or below the line. The snapshot this
 * reads has no previous week in it, so the honest fix is the label — the
 * published archive, which does have one, now carries the real move instead.
 */
/* Exactly the fields the readings row reads. A full `OperatingSnapshot` is
   assignable, and a test can build these five without asserting its way past
   the thirty it does not touch. */
type WeeklyEmailReadingSource = {
  assessment: ConfidenceInputs & {
    diagnostics: Pick<OperatingSnapshot["assessment"]["diagnostics"], "tightnessVsThreshold" | "riskAppetiteVsThreshold">;
  };
  /** The record the scores were read from, which decides whether they have gone stale. */
  treasury?: ConfidenceRecord;
};

export const buildWeeklyEmailReadings = (snapshot: WeeklyEmailReadingSource | undefined) => {
  if (!snapshot) return [];
  const { scores, diagnostics } = snapshot.assessment;
  /* Each score carries what it means, because the inbox has no page beside it
     to say which end of the scale is bad. */
  return [
    {
      label: "Funding pressure",
      value: `${scores.tightness}/100`,
      meaning: signalReadingMeaning("tightness", scores.tightness),
      /* Above the line is the tighter regime, so above is the worse side here. */
      distance: distanceFromLine(diagnostics.tightnessVsThreshold, "above"),
    },
    {
      label: "Risk appetite",
      value: `${scores.riskAppetite}/100`,
      meaning: signalReadingMeaning("riskAppetite", scores.riskAppetite),
      /* The risk line is a floor: below it is risk-off. */
      distance: distanceFromLine(diagnostics.riskAppetiteVsThreshold, "below"),
    },
    {
      label: "Confidence",
      value: formatExportConfidenceWord(resolvePublishedConfidence({ assessment: snapshot.assessment, record: snapshot.treasury }).label),
      meaning: null,
      distance: null,
    },
  ];
};

/** One line per reading, as the plain-text email renders it. Exported so a test reads the line rather than the fields behind it. */
export const readingsText = (readings: ReturnType<typeof buildWeeklyEmailReadings>) =>
  readings.map(
    (reading) =>
      `${reading.label}: ${reading.value}${reading.meaning ? `, ${reading.meaning}` : ""}${reading.distance ? ` (${reading.distance.label})` : ""}`,
  );

const readingsHtml = (readings: ReturnType<typeof buildWeeklyEmailReadings>) =>
  readings.length === 0
    ? ""
    : [
        `<table role="presentation" style="width:100%;border-collapse:collapse;margin-top:12px;"><tr>`,
        ...readings.map((reading) => {
          const deltaColor = reading.distance ? (reading.distance.worse ? "#f59e0b" : "#10b981") : "#64748b";
          return [
            `<td style="padding:12px 16px;border:1px solid rgba(148,163,184,0.15);border-radius:8px;background:#1a1a1a;vertical-align:top;">`,
            `<p style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin:0 0 4px;">${reading.label}</p>`,
            `<p style="font-size:1.25rem;font-weight:600;margin:0;color:#f1f5f9;font-variant-numeric:tabular-nums;">${reading.value}</p>`,
            reading.meaning ? `<p style="font-size:0.8rem;margin:4px 0 0;color:#cbd5e1;">${reading.meaning}</p>` : "",
            reading.distance ? `<p style="font-size:0.8rem;margin:4px 0 0;color:${deltaColor};">${reading.distance.label}</p>` : "",
            `</td>`,
          ].join("");
        }),
        `</tr></table>`,
      ].join("");

type SendWeeklyBriefResult = {
  ok: boolean;
  sent: number;
  errors: number;
  total: number;
  /** "stub" means the EMAIL binding is missing and nothing was delivered. */
  deliveryMode: "live" | "stub";
  error?: string;
  message?: string;
};

/**
 * What this send is allowed to claim, given the reading behind it.
 *
 * `scripts/freezeWeeklyBrief.ts` and `scripts/generateWeeklySlackBrief.ts` have
 * asked this since 2026-08-29, and this path — the one artifact that leaves the
 * building and cannot be corrected afterwards — did not. It read the snapshot
 * with `?.` throughout and filled every gap with a constant: no snapshot meant
 * regime `"DEFENSIVE"`, "Hold bounded operating discipline.", and a record date
 * reading "this week". That is a call nobody computed, mailed to every
 * subscriber, returning `ok: true` so the Monday `cron-step` row on /trust went
 * green for it.
 *
 * The flags to judge on were already in hand: `buildOperatingSnapshot` writes
 * `provenance.isLive` and `freshness.status`, which are what `assessPublishReadiness`
 * takes. The staleness limit is the archive's, deliberately — a brief mailed as
 * this week's and a week frozen into the archive make the same claim about which
 * week it is.
 */
const assessSendReadiness = (snapshot: OperatingSnapshot, now: Date) =>
  assessPublishReadiness({
    degraded: false,
    isFallback: snapshot.freshness.status === "fallback",
    isLive: snapshot.provenance.isLive,
    recordDate: snapshot.recordDate,
    now,
  });

/**
 * Send the weekly brief to all active subscribers. Shared by the cron trigger
 * (direct call from worker/index.ts) and the POST /api/email/send-weekly route,
 * projecting the authoritative OperatingSnapshot. Slack delivery is its own cron
 * step — lib/slack/deliverSlackBrief.
 */
export const sendWeeklyBrief = async (options?: {
  snapshot?: OperatingSnapshot;
  weeklyCall?: WeeklyCallContract;
  now?: Date;
}): Promise<SendWeeklyBriefResult> => {
  const subscriptions = await getActiveSubscriptions();
  const adapter = createCloudflareEmailAdapter();
  const deliveryMode = adapter.mode ?? "live";
  if (subscriptions.length === 0) {
    return { ok: true, sent: 0, errors: 0, total: 0, deliveryMode, message: "No active subscriptions." };
  }

  let snapshot = options?.snapshot;
  let weeklyCall = options?.weeklyCall;

  if (!snapshot || !weeklyCall) {
    const store = getOperatingSnapshotStore();
    const stored = await store.readLatest();
    if (stored) {
      snapshot = stored;
      weeklyCall = stored.weeklyCall;
    }
  }

  const refuse = (reason: string): SendWeeklyBriefResult => ({
    ok: false,
    sent: 0,
    errors: 0,
    total: subscriptions.length,
    deliveryMode,
    error: `refused_unpublishable: ${reason}`,
  });

  if (!snapshot || !weeklyCall) {
    return refuse("No operating snapshot is available; there is no guidance to send.");
  }

  const readiness = assessSendReadiness(snapshot, options?.now ?? new Date());
  if (!readiness.ok) {
    return refuse(readiness.reason);
  }

  /* Past the guard, every line below is a reading rather than a stand-in for one. */
  const regime = snapshot.assessment.regime;
  const regimeLabel = getRegimePublicLabel(regime);
  const readings = buildWeeklyEmailReadings(snapshot);
  const actionNow = weeklyCall.actionNow;
  const pauseIf = pauseConditionOnly(weeklyCall.pauseIf);
  const changeLines = weeklyCallChangeLines(weeklyCall);
  const recordDate = snapshot.provenance.recordDateLabel;

  const results = await Promise.allSettled(
    subscriptions.map((recipient) => {
      const subject = regime === "SCARCITY" || regime === "DEFENSIVE"
        ? `Whether — ${regimeLabel}: ${actionNow}`
        : `Whether Brief — ${regimeLabel}`;
      const briefUrl = siteUrl;
      /* The lines above are the published ones. The use the record fits is a plan's
         own lines and an email the day one is crossed, and this is the one page
         every subscriber opens each week. */
      const planLinesUrl = `${siteUrl}/operate#ops-plan-lines`;
      const isContraction = regime === "SCARCITY" || regime === "DEFENSIVE";

      const text = [
        `Whether Weekly Brief — ${recordDate}`,
        `Conditions: ${describeConditions(regime)}`,
        ...readingsText(readings),
        `${DECISION_CONTRACT_LABELS.action.actionNow}: ${actionNow}`,
        `${DECISION_CONTRACT_LABELS.threshold.pauseIf}: ${pauseIf}`,
        ...changeLines.map(({ label, value }) => `${label}: ${value}`),
        `Move these lines for your own plan, and hear the day one is crossed: ${planLinesUrl}`,
        ...(isContraction ? [] : [`\nView the full brief, toolkits, and trends:`]),
        briefUrl,
        `---`,
        `Whether · weekly operating brief`,
        ...unsubscribeFooterText(recipient.token),
      ].join("\n");

      /* Regime-adaptive email */
      const sections = [];
      sections.push(
        `<table role="presentation" style="width:100%;border-collapse:collapse;"><tr>`,
        `<td style="padding:16px;border:1px solid rgba(148,163,184,0.15);border-radius:8px;background:#1a1a1a;">`,
        `<p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin:0 0 6px;">Conditions</p>`,
        `<p style="font-size:1.1rem;font-weight:600;margin:0;color:#f1f5f9;">${regimeLabel}</p>`,
        `<p style="font-size:0.85rem;margin:4px 0 0;color:#cbd5e1;">${getRegimeWeatherRationale(regime)}</p>`,
        `</td></tr></table>`,
        readingsHtml(readings),
      );
      sections.push(
        `<table role="presentation" style="width:100%;border-collapse:collapse;margin-top:12px;"><tr>`,
        `<td style="padding:16px;border:1px solid rgba(148,163,184,0.15);border-radius:8px;background:#1a1a1a;">`,
        `<p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:#38bdf8;margin:0 0 6px;">${DECISION_CONTRACT_LABELS.action.actionNow}</p>`,
        `<p style="font-size:1.05rem;font-weight:600;margin:0 0 12px;color:#f1f5f9;">${actionNow}</p>`,
        `<p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:#f59e0b;margin:0 0 6px;">${DECISION_CONTRACT_LABELS.threshold.pauseIf}</p>`,
        `<p style="font-size:0.9rem;margin:0 0 12px;color:#cbd5e1;">${pauseIf}</p>`,
        ...changeLines.flatMap(({ label, value }, index) => [
          `<p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:#10b981;margin:${index === 0 ? "0" : "12px"} 0 6px;">${label}</p>`,
          `<p style="font-size:0.9rem;margin:0;color:#cbd5e1;">${value}</p>`,
        ]),
        `<p style="font-size:0.8rem;margin:16px 0 0;color:#94a3b8;"><a href="${planLinesUrl}" style="color:#7dd3fc;text-decoration:underline;">Move these lines for your own plan</a>, and hear the day one is crossed.</p>`,
        `</td></tr></table>`
      );

      const html = [
        `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#0a0a0a;color:#e2e8f0;">`,
        `<h1 style="font-size:1.25rem;font-weight:600;margin:0 0 4px;color:#f1f5f9;">Whether Weekly Brief</h1>`,
        `<p style="color:#94a3b8;font-size:0.85rem;margin:0 0 20px;">${recordDate}</p>`,
        ...sections,
        `<div style="margin-top:24px;">`,
        `<a href="${briefUrl}" style="display:inline-block;padding:12px 24px;border-radius:8px;background:linear-gradient(135deg,rgba(56,189,248,0.9),rgba(14,116,144,0.85));color:white;text-decoration:none;font-weight:600;font-size:0.9rem;">View full brief →</a>`,
        `</div>`,
        `<p style="margin-top:32px;font-size:0.75rem;color:#64748b;">Based on public data. Your situation may vary.</p>`,
        `<hr style="border:none;border-top:1px solid rgba(148,163,184,0.15);margin-top:24px;" />`,
        `<table role="presentation" style="width:100%;border-collapse:collapse;"><tr>`,
        `<td style="font-size:0.7rem;color:#64748b;padding-top:12px;">`,
        `<a href="${siteUrl}/trust" style="color:#64748b;text-decoration:underline;">Methodology</a>`,
        ` · `,
        `<a href="${siteUrl}/share" style="color:#64748b;text-decoration:underline;">Share</a>`,
        ` · `,
        `<a href="${siteUrl}" style="color:#64748b;text-decoration:underline;">whether.work</a>`,
        unsubscribeFooterHtml(recipient.token),
        `</td></tr></table>`,
        `</body></html>`,
      ].join("\n");

      return adapter.send({ to: recipient, subject, html, text });
    }),
  );

  const sent = results.filter((r) => r.status === "fulfilled" && r.value.ok).length;
  const errors = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)).length;

  const ok = errors === 0;
  const error = ok
    ? undefined
    : deliveryMode === "stub"
      ? `email_binding_missing: 0/${subscriptions.length} delivered`
      : `${errors}/${subscriptions.length} sends failed`;

  return { ok, sent, errors, total: subscriptions.length, deliveryMode, ...(error ? { error } : {}) };
};
