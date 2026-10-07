import { createCloudflareEmailAdapter, getActiveSubscriptions } from "./emailDelivery";
import { emailTextFooter, escapeHtml, renderEmailShell } from "./emailShell";
import type { OperatingSnapshot } from "../operatingState/types";
import { weeklyCallChangeLines, type WeeklyCallContract } from "../report/weeklyCallContract";
import { assessSnapshotReadiness, resolveOperatingSnapshot } from "../operatingState/resolveSnapshot";
import { DECISION_CONTRACT_LABELS } from "../report/reportCopy";
import { getRegimePublicLabel, getRegimeWeatherRationale } from "../regimePresentation";
import { formatExportConfidenceWord } from "../export/exportTerms";
import { regimeSignalLabel, signalReadingMeaning } from "../report/signalTranslations";
import { siteUrl } from "../siteUrl";
import { fanOut } from "../delivery/fanOut";
import { onceFor, weeklyPeriodKey } from "../delivery/onceFor";
import type { BriefDocument } from "../report/briefArtifact";
import { briefSourceFromSnapshot, buildBriefDocument } from "../report/briefDocument";
import { briefWeekChangeLine, EXPORT_SECTION_HEADINGS } from "../export/briefBuilders";

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
  /* A score one point off its line read "1 points above the line…". */
  const unit = points === 1 ? "point" : "points";
  return { label: `${points} ${unit} ${side} the line where conditions change`, worse: side === worseSide };
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
/* Exactly the fields the readings row reads: the brief document's readings and
   its published confidence, resolved once for every format. A full
   `BriefDocument` is assignable, and a test can build these without asserting
   its way past the fields it does not touch. */
type WeeklyEmailReadingSource = {
  readings: Pick<BriefDocument["readings"], "scores" | "vsThreshold">;
  confidence: BriefDocument["confidence"];
};

export const buildWeeklyEmailReadings = (document: WeeklyEmailReadingSource | undefined) => {
  if (!document) return [];
  const { scores, vsThreshold } = document.readings;
  /* Each score carries what it means, because the inbox has no page beside it
     to say which end of the scale is bad. */
  return [
    {
      label: regimeSignalLabel.tightness,
      value: `${scores.tightness}/100`,
      meaning: signalReadingMeaning("tightness", scores.tightness),
      /* Above the line is the tighter regime, so above is the worse side here. */
      distance: distanceFromLine(vsThreshold.tightness, "above"),
    },
    {
      label: regimeSignalLabel.riskAppetite,
      value: `${scores.riskAppetite}/100`,
      meaning: signalReadingMeaning("riskAppetite", scores.riskAppetite),
      /* The risk line is a floor: below it is risk-off. */
      distance: distanceFromLine(vsThreshold.riskAppetite, "below"),
    },
    {
      label: "Confidence",
      value: formatExportConfidenceWord(document.confidence),
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
  /** Subscribers who already had this week's brief and were not sent it again. Absent when none. */
  skipped?: number;
};

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
  /** Send to subscribers who already had this week's brief. The manual route's explicit opt-in; the cron never passes it. */
  force?: boolean;
}): Promise<SendWeeklyBriefResult> => {
  const now = options?.now ?? new Date();
  const subscriptions = await getActiveSubscriptions();
  const adapter = createCloudflareEmailAdapter();
  const deliveryMode = adapter.mode ?? "live";
  if (subscriptions.length === 0) {
    return { ok: true, sent: 0, errors: 0, total: 0, deliveryMode, message: "No active subscriptions." };
  }

  /* The cron's snapshot, or the stored one for a manual run; with neither there
     is no guidance to send, and this refuses rather than filling the gap. */
  const reading = await resolveOperatingSnapshot({
    given: { snapshot: options?.snapshot, weeklyCall: options?.weeklyCall },
    onMiss: "refuse",
  });

  const refuse = (reason: string): SendWeeklyBriefResult => ({
    ok: false,
    sent: 0,
    errors: 0,
    total: subscriptions.length,
    deliveryMode,
    error: `refused_unpublishable: ${reason}`,
  });

  if (!reading) {
    return refuse("No operating snapshot is available; there is no guidance to send.");
  }
  const { snapshot, weeklyCall } = reading;

  /*
   * What this send is allowed to claim, given the reading behind it. Until
   * 2026-09-17 this path, the one artifact that leaves the building and cannot
   * be corrected afterwards, filled every gap with a constant and mailed a call
   * nobody computed (the automation-and-deploy-gate lesson). The staleness
   * limit is the archive's, deliberately: a brief mailed as this week's and a
   * week frozen into the archive make the same claim about which week it is.
   * The Slack post asks the same question the same way.
   */
  const readiness = assessSnapshotReadiness(snapshot, now);
  if (!readiness.ok) {
    return refuse(readiness.reason);
  }

  /* Past the guard, every line below is a reading rather than a stand-in for one,
     from the brief document every other format renders. */
  const document = buildBriefDocument(briefSourceFromSnapshot(snapshot), weeklyCall);
  const regime = document.conditions.regime;
  const regimeLabel = getRegimePublicLabel(regime);
  const readings = buildWeeklyEmailReadings(document);
  /* What moved since the earlier reading, named by its date, as every paste opens
     "What changed this week". Absent on a week with nothing compared. */
  const weekChange = briefWeekChangeLine(document);
  const actionNow = document.slots.actionNow;
  const pauseIf = document.slots.pauseIf;
  const changeLines = weeklyCallChangeLines(document.slots);
  const recordDate = document.recordDateLabel;

  const tally = await fanOut(
    subscriptions,
    async (recipient) => {
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
        `Conditions: ${document.conditions.line}`,
        ...readingsText(readings),
        ...(weekChange ? [`${EXPORT_SECTION_HEADINGS.changed}: ${weekChange}`] : []),
        `${DECISION_CONTRACT_LABELS.action.actionNow}: ${actionNow}`,
        `${DECISION_CONTRACT_LABELS.threshold.pauseIf}: ${pauseIf}`,
        ...changeLines.map(({ label, value }) => `${label}: ${value}`),
        `Move these lines for your own plan, and hear the day one is crossed: ${planLinesUrl}`,
        ...(isContraction ? [] : [`\nView the full brief, toolkits, and trends:`]),
        briefUrl,
        ...emailTextFooter(recipient.token),
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
        ...(weekChange
          ? [`<p style="font-size:0.9rem;margin:12px 0 0;color:#cbd5e1;"><strong style="color:#f1f5f9;">${EXPORT_SECTION_HEADINGS.changed}:</strong> ${escapeHtml(weekChange)}</p>`]
          : []),
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

      const html = renderEmailShell({
        title: "Whether Weekly Brief",
        body: [
          `<p style="color:#94a3b8;font-size:0.85rem;margin:0 0 20px;">${recordDate}</p>`,
          ...sections,
        ].join("\n"),
        unsubscribeToken: recipient.token,
      });

      const result = await adapter.send({ to: recipient, subject, html, text });
      return result.ok ? "sent" : "failed";
    },
    /* Once per subscriber per ISO week, so a manual run after the Monday cron
       does not mail the brief twice, and a run that failed part-way reaches
       only the ones it missed. A stub delivers nothing, so it records nothing. */
    deliveryMode === "live"
      ? {
          once: {
            markers: onceFor(weeklyPeriodKey("weekly-email", now), { force: options?.force }),
            keyOf: (recipient) => recipient.email,
          },
        }
      : {},
  );

  const sent = tally.sent;
  const errors = tally.failed;
  const skipped = tally.skipped;

  const ok = errors === 0;
  const error = ok
    ? undefined
    : deliveryMode === "stub"
      ? `email_binding_missing: 0/${subscriptions.length} delivered`
      : `${errors}/${subscriptions.length} sends failed`;

  const alreadySent = skipped > 0 && sent === 0 && errors === 0;
  return {
    ok,
    sent,
    errors,
    total: subscriptions.length,
    deliveryMode,
    ...(error ? { error } : {}),
    ...(skipped > 0 ? { skipped } : {}),
    ...(alreadySent ? { message: "Every subscriber already has this week's brief; nothing was sent again. Pass force to re-send." } : {}),
  };
};
