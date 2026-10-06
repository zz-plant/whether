import { formatNumberWithUnit } from "../formatters";
import type { RegimeAssessment } from "../regimeEngine";
import type { BriefDocument } from "../report/briefArtifact";
import { buildComplianceStamp } from "../exportNotices";
import { buildSharedCorridorRails, formatPointsToLine, type ActionStripItem } from "../report/operatingCalls";
import { DECISION_CONTRACT_LABELS } from "../report/reportCopy";
import { formatDecisionReversal, formatDecisionThreshold, publicDecisionLabels } from "../report/reportFormatting";
import { regimeSignalLabel } from "../report/signalTranslations";
import { decisionAreaLabel, decisionAreaOrder } from "../report/boundedDecisionRules";
import { operatingLeverToDecisionArea } from "../report/businessAreaMap";
import { buildScoreMovementLine, buildScoreReferenceLines, type PreviousReading } from "./scoreReference";
import { areaLinesFromActionStrip, buildDecisionMovement } from "../report/decisionMovement";
import { describeBaseRateSource, formatExportConfidence } from "./exportTerms";

/*
 * Every paste reads in the page's order: the call, what changed, what it
 * changes for you (one row per area, in the page's row order), what would
 * change the call, then sources. The headings are the page's own.
 *
 * Each builder here renders a `BriefDocument` (`lib/report/briefDocument.ts`).
 * They used to take the assessment, the treasury record, the sensors and the
 * macro series, plus an options bag (`ExportLayerOptions`, with a
 * `ModeledExportDecisionPayload` inside it) carrying a fallback chain of its
 * own: the call from the stance line or the assessment's description, the
 * action from the lead area, the change line from the posture state. Every
 * caller filled a different part of it, so the Monday post, the GET route, the
 * weekly artifact script and /share printed four calls for one week.
 */
export const EXPORT_SECTION_HEADINGS = {
  changed: "What changed this week",
  areas: "What that changes for you",
} as const;

/** The curve reading's name on first use, per the vocabulary table in `lib/report/AGENTS.md`. */
export const RECESSION_GAUGE_LABEL = `${regimeSignalLabel.curveSlope} (10-year minus 2-year rate)`;
/** The stamp's confidence note when no label was modeled: what the number measures. */
const CONFIDENCE_STAMP_NOTE = "how far the scores sit from the line where conditions change";

const buildExportStamp = (document: BriefDocument, confidence: string) =>
  buildComplianceStamp({
    sourceLine: document.provenance.sourceUrl,
    timestamp: document.provenance.recordDate,
    confidence,
  });

type CallSlot = { label: string; value: string };

/**
 * The call's slots, in the order every paste prints them: the contract's call,
 * action and pause line (its condition only, as the email prints it), the
 * resume line, and where conditions change. The resume line is the lead area's,
 * then a stage's discipline when one is chosen: both say when a hold lifts. A
 * held call prints none, because its change line is its one resume line
 * (`applyStageToWeeklyCall` keeps a stage's out for the same reason) and an
 * area's would compete with it.
 */
/** The resume line beside the call, or null for a held call or a week with none. */
export const briefResumeLine = (document: BriefDocument): string | null => {
  const { slots } = document;
  if (slots.policyOverrideActive) return null;
  const leadResume = document.areaRows[0]?.reversalCondition?.trim();
  const lines = [
    ...(leadResume ? [formatDecisionReversal(leadResume)] : []),
    ...(slots.resumeWhen ? [slots.resumeWhen] : []),
  ];
  return lines.length > 0 ? lines.join("; ") : null;
};

const briefCallSlots = (document: BriefDocument): CallSlot[] => {
  const { slots } = document;
  const resumeLine = briefResumeLine(document);
  return [
    { label: publicDecisionLabels.call, value: slots.currentCall },
    { label: publicDecisionLabels.action, value: slots.actionNow },
    { label: publicDecisionLabels.threshold, value: slots.pauseIf },
    ...(resumeLine ? [{ label: publicDecisionLabels.reversal, value: resumeLine }] : []),
    { label: DECISION_CONTRACT_LABELS.watch.postureFlips, value: slots.callChangesIf },
  ];
};

/** The call itself: the slots every surface prints first. */
export const buildCallLines = (document: BriefDocument) =>
  briefCallSlots(document).map(({ label, value }) => `• ${label}: ${value}`);

const areaOrderIndex = (item: ActionStripItem) => decisionAreaOrder.indexOf(operatingLeverToDecisionArea[item.lever]);

/**
 * One row per decision area, in the page's row order (`decisionAreaOrder`),
 * each with its rule, its pause and resume lines with a distance, and its
 * timing. The rows used to follow the model's priority order and skip the
 * lead item, so a reader who checks Fundraising every Monday found it in a
 * different place in every paste — and never in the same place as on the page.
 */
export const buildAreaRowLines = (document: BriefDocument) =>
  [...document.areaRows]
    .sort((left, right) => areaOrderIndex(left) - areaOrderIndex(right))
    .flatMap((item) => [
      `• ${decisionAreaLabel(operatingLeverToDecisionArea[item.lever])}: ${item.areaActionNow}`,
      `  ${publicDecisionLabels.threshold}: ${formatItemLines(item, "pause")}`,
      `  ${publicDecisionLabels.reversal}: ${formatItemLines(item, "resume")}`,
      ...(item.latencyLine ? [`  ${DECISION_CONTRACT_LABELS.timing.latency}: ${item.latencyLine}`] : []),
    ]);

/**
 * A lever's lines as `Funding pressure > 76 (44 pts away)`, or its sentence
 * when it carries no numeric line.
 */
const formatItemLines = (item: ActionStripItem, kind: "pause" | "resume") => {
  const lines = kind === "pause" ? item.pauseConditions : item.resumeConditions;
  const nearest = kind === "pause" ? item.nearestPause : item.nearestResume;
  const qualifier = kind === "pause" ? item.pauseQualifier : item.resumeQualifier;
  if (!lines || lines.length === 0) {
    return kind === "pause" ? formatDecisionThreshold(item.triggerThreshold) : formatDecisionReversal(item.reversalCondition);
  }
  return [
    ...lines.map((line) =>
      nearest && nearest.metric === line.metric && nearest.value === line.value
        ? `${line.label} (${formatPointsToLine(nearest.pointsToLine, kind, nearest.satisfied)})`
        : line.label,
    ),
    // The qualifier is part of the rule, not decoration: "or two consecutive
    // weaker weekly reads print" is a second way the pause fires.
    ...(qualifier ? [qualifier] : []),
  ].join(` ${kind === "pause" ? "or" : "and"} `);
};

/**
 * The readings against their lines, one line per score, in the shape every
 * export and the page's `ScoreCell` share (`lib/export/scoreReference.ts`),
 * then one line saying what the scores' moves are made of when the week has a
 * split to print. The sentences elsewhere in the brief say the rule; this says
 * where the reading sits against it, so nobody pastes a paragraph to answer
 * "how close".
 *
 * "Last week" prints only from `previousScores`. An earlier version read
 * `diagnostics.tightnessDelta` as a weekly move, and that field was a distance
 * from the regime threshold — so an unchanged week still claimed one.
 *
 * Takes the reading rather than the document because the plan page prints the
 * same lines above its own picker from the report read.
 */
export const buildReadingLines = (
  reading: {
    scores: { tightness: number; riskAppetite: number };
    thresholds: RegimeAssessment["thresholds"];
    regime: RegimeAssessment["regime"];
  },
  options: { actionStripItems?: readonly ActionStripItem[]; previousScores?: PreviousReading | null } = {},
): string[] => {
  const items = options.actionStripItems ?? [];
  const scores = { tightness: reading.scores.tightness, riskAppetite: reading.scores.riskAppetite };
  const previous = options.previousScores ?? null;
  const movementLine = buildScoreMovementLine(previous);
  /* What the week did to the decisions leads: the readings under it are the evidence,
     and a paste read by someone who never sees the page should get the consequence
     first. Absent, like the earlier reading it is measured against, without one. */
  const decisionLine = buildDecisionMovement({
    scores,
    previous,
    thresholds: reading.thresholds,
    regime: reading.regime,
    areas: areaLinesFromActionStrip(items),
  })?.sentence;
  return [
    ...(decisionLine ? [decisionLine] : []),
    ...buildScoreReferenceLines({
      scores,
      thresholds: reading.thresholds,
      rails: buildSharedCorridorRails(items, scores),
      previous,
    }),
    ...(movementLine ? [movementLine] : []),
  ];
};

/** The document's readings against its own area rows and comparison. */
export const briefReadingLines = (document: BriefDocument) =>
  buildReadingLines(
    { scores: document.readings.scores, thresholds: document.readings.thresholds, regime: document.conditions.regime },
    { actionStripItems: document.areaRows, previousScores: document.readings.previous },
  );

/*
 * One block, not two. The transmission check and the "false-signal warning"
 * both printed `failureModes[0].warning`, so a brief with a warning carried it
 * twice under two headers. No caller has passed a failure mode since, so the
 * block states what the confidence measures and where to look if it is wrong.
 */
const buildWhyThisCouldBeWrongBlock = (document: BriefDocument) => [
  "",
  "Why this could be wrong:",
  `• ${formatExportConfidence(document.confidence)}`,
  "• The scores sit near a line; a small move could change conditions. Hold anything you can't undo.",
  `• If it is: see "${DECISION_CONTRACT_LABELS.watch.postureFlips}" above, plus the readings.`,
];

const buildCitationLines = (document: BriefDocument) => [
  `Treasury source: ${document.provenance.sourceUrl} (${document.provenance.recordDate})`,
  ...document.readings.macros.map((macro) => `${macro.label}: ${macro.sourceUrl} (${macro.record_date})`),
];

export const buildBoardSlideBullets = (document: BriefDocument) => {
  const areaRows = buildAreaRowLines(document);
  return [
    `Conditions: ${document.conditions.line}`,
    ...buildCallLines(document),
    "",
    `${EXPORT_SECTION_HEADINGS.changed}:`,
    ...briefReadingLines(document),
    ...document.readings.macros.map((macro) => `${macro.label}: ${formatNumberWithUnit(macro.value, macro.unit)}`),
    ...(areaRows.length > 0 ? ["", `${EXPORT_SECTION_HEADINGS.areas}:`, ...areaRows] : []),
    "",
    ...buildExportStamp(document, CONFIDENCE_STAMP_NOTE),
  ].join("\n");
};

/**
 * The weekly Slack brief: the Monday post, `GET /api/brief/slack` and the
 * weekly artifact script all print this, from the same document.
 */
export const buildSlackBrief = (document: BriefDocument) => {
  const { readings } = document;
  const macroLines = readings.macros.map(
    (macro) => `• ${macro.label}: ${formatNumberWithUnit(macro.value, macro.unit)} · refreshed ${macro.record_date}`,
  );
  const areaRows = buildAreaRowLines(document);
  const callSlots = briefCallSlots(document);

  /*
   * The page's order: the call, what changed, what that changes for you, what
   * would change the call, then sources. The readings and the rate inputs used
   * to lead, above the call they explain.
   */
  return [
    `Whether Weekly Brief — ${document.provenance.recordDate}`,
    `Conditions: ${document.conditions.line}`,
    "",
    `This week's decision (${callSlots.map(({ label }) => label).join(" / ")}):`,
    ...callSlots.map(({ label, value }) => `• ${label}: ${value}`),
    "",
    `${EXPORT_SECTION_HEADINGS.changed}:`,
    ...briefReadingLines(document),
    `${regimeSignalLabel.baseRate}: ${formatNumberWithUnit(readings.baseRate, "%")} (read from ${describeBaseRateSource(readings.baseRateUsed)})`,
    `${RECESSION_GAUGE_LABEL}: ${formatNumberWithUnit(readings.curveSlope, "%")}`,
    ...macroLines,
    ...(areaRows.length > 0 ? ["", `${EXPORT_SECTION_HEADINGS.areas}:`, ...areaRows] : []),
    "",
    "What to hold:",
    ...document.constraints.map((item) => `• ${item}`),
    ...buildWhyThisCouldBeWrongBlock(document),
    "",
    "Citations:",
    ...buildCitationLines(document),
    "",
    `Full brief: ${document.provenance.permalink}`,
    "",
    ...buildExportStamp(document, CONFIDENCE_STAMP_NOTE),
  ].join("\n");
};

/**
 * The dated reference the answer pages print under their own reading. It reads
 * the document's fields rather than the assessment, the treasury record and a
 * label of the caller's choosing, so the confidence is the published one and
 * the conditions carry the brief's own label. The share formats' citation is
 * the document's (`formatBriefArtifact(document, "citation")`); /share offered
 * both, two citations for one week, and offers that one now.
 */
export const buildCallCitation = ({
  conditions,
  confidence,
  provenance,
}: {
  conditions: Pick<BriefDocument["conditions"], "line">;
  confidence: BriefDocument["confidence"];
  provenance: Pick<BriefDocument["provenance"], "sourceUrl" | "recordDate" | "permalink">;
}) => [
  `Whether Weekly Brief — ${provenance.recordDate}`,
  `Conditions: ${conditions.line}`,
  `${formatExportConfidence(confidence)} (how far the scores sit from the line where conditions change)`,
  `Source note: ${provenance.sourceUrl}`,
  `Full brief: ${provenance.permalink}`,
].join("\n");
