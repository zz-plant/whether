import { formatNumberWithUnit } from "../formatters";
import type { RegimeAssessment } from "../regimeEngine";
import type { MacroSeriesReading, SensorReading, TreasuryData } from "../types";
import { buildBriefPermalinkLine } from "./briefPermalink";
import { buildComplianceStamp } from "../exportNotices";
import type { InterpretationLayer } from "../report/interpretationLayer";
import { buildSharedCorridorRails, formatPointsToLine, type ActionStripItem } from "../report/operatingCalls";
import { DECISION_CONTRACT_LABELS } from "../report/reportCopy";
import { NO_LIVE_READING_CALL } from "../report/reportCopy";
import { buildFlipThreshold } from "../report/reportEvidence";
import type { PostureStateContract } from "../report/postureStateContract";
import { resolvePublishedConfidence } from "../report/confidence";
import { comparisonBasis } from "../report/comparisonBasis";
import { formatDecisionReversal, formatDecisionThreshold, publicDecisionLabels } from "../report/reportFormatting";
import { regimeSignalLabel } from "../report/signalTranslations";
import { decisionAreaLabel, decisionAreaOrder } from "../report/boundedDecisionRules";
import { operatingLeverToDecisionArea } from "../report/businessAreaMap";
import { buildScoreReferenceLines, type PreviousReading } from "./scoreReference";
import { describeBaseRateSource, describeConditions, describeWeeklyDirection, formatExportConfidence } from "./exportTerms";

/*
 * Every paste reads in the page's order: the call, what changed, what it
 * changes for you (one row per area, in the page's row order), what would
 * change the call, then sources. The headings are the page's own.
 */
export const EXPORT_SECTION_HEADINGS = {
  changed: "What changed this week",
  areas: "What that changes for you",
} as const;

export type ModeledExportDecisionPayload = {
  postureWithStageLabel?: string;
  currentCall?: string;
  actionNow?: string;
  operatingStanceLine?: string;
  guardrailThreshold?: string;
  reversalTrigger?: string;
  actionStripItems?: ActionStripItem[];
};

const buildExportStamp = (treasury: TreasuryData, confidence: string) =>
  buildComplianceStamp({
    sourceLine: treasury.source,
    timestamp: treasury.record_date,
    confidence,
  });

type PublishedConfidenceLabel = ReturnType<typeof resolvePublishedConfidence>["label"];

type ExportLayerOptions = {
  interpretationLayer?: InterpretationLayer;
  postureWithStageLabel?: string;
  operatingStanceLine?: string;
  trendLabel?: string;
  transitionWatch?: "ON" | "OFF";
  regimeDistancePoints?: number;
  historicalAnalogs?: Array<{ date: string; similarityScore: number; implication: string }>;
  failureModes?: Array<{ warning: string; mitigationCheck: string }>;
  actionStripItems?: ActionStripItem[];
  freshnessLabel?: string;
  postureState?: PostureStateContract;
  modeledDecision?: ModeledExportDecisionPayload;
  /**
   * The earlier two scores and the date they are from, when the caller's read
   * carries a comparison (`previousScoresFromDynamics` off `reportDynamics`).
   * Null or absent prints no earlier-reading part rather than a stand-in for one.
   */
  previousScores?: PreviousReading | null;
};

const resolveModeledDecisionPayload = (options?: ExportLayerOptions): ModeledExportDecisionPayload => {
  const actionStripItems = options?.modeledDecision?.actionStripItems ?? options?.actionStripItems;
  const currentCall =
    options?.modeledDecision?.currentCall
    ?? options?.modeledDecision?.operatingStanceLine
    ?? options?.operatingStanceLine;

  return {
    postureWithStageLabel: options?.modeledDecision?.postureWithStageLabel ?? options?.postureWithStageLabel,
    currentCall,
    actionNow:
      options?.modeledDecision?.actionNow
      ?? actionStripItems?.[0]?.areaActionNow
      ?? currentCall,
    operatingStanceLine: currentCall,
    guardrailThreshold: options?.modeledDecision?.guardrailThreshold,
    reversalTrigger: options?.modeledDecision?.reversalTrigger,
    actionStripItems,
  };
};

/*
 * What the brief says when no reading reached it. Each names the thing that is
 * missing and the one thing to hold; "Hold bounded operating discipline" named
 * neither, and was pasted into Slack as if it were a call.
 */
const FALLBACK_CURRENT_CALL = NO_LIVE_READING_CALL.currentCall;
const FALLBACK_ACTION_NOW = "Keep last week's approvals as they are; start nothing new.";
const FALLBACK_PAUSE_IF = NO_LIVE_READING_CALL.pauseIf;
const FALLBACK_RESUME_WHEN = "Live data is back and conditions have held for a week.";
/** The curve reading's name on first use, per the vocabulary table in `lib/report/AGENTS.md`. */
export const RECESSION_GAUGE_LABEL = `${regimeSignalLabel.curveSlope} (10-year minus 2-year rate)`;
/** The stamp's confidence note when no label was modeled: what the number measures. */
const CONFIDENCE_STAMP_NOTE = "how far the scores sit from the line where conditions change";

/** `??` only falls through on null/undefined, and several of these fields are
 *  optional strings that arrive as "". An empty string in a decision slot prints
 *  a bullet with a label and nothing after it. */
const firstMeaningful = (...values: Array<string | undefined | null>) =>
  values.find((value) => typeof value === "string" && value.trim().length > 0);

/** The call itself: the four slots every surface prints first. */
export const buildCallLines = (assessment: RegimeAssessment, options?: ExportLayerOptions) => {
  const modeled = resolveModeledDecisionPayload(options);
  const leadItem = modeled.actionStripItems?.[0];
  const currentCall =
    firstMeaningful(modeled.currentCall, assessment.description)
    ?? FALLBACK_CURRENT_CALL;
  // Never `assessment.constraints`: that is the operating-limits list printed
  // in full further down, and a constraint in this slot printed "Do now" as a
  // verbatim copy of operating limit 1.
  const actionNow =
    firstMeaningful(
      modeled.actionNow,
      leadItem?.areaActionNow,
    ) ?? FALLBACK_ACTION_NOW;
  // A rule sentence carries its own verb ("Resume staged approvals when …"),
  // and under a slot label that already carries that verb it read twice. Only
  // the rule's condition goes under the label; the fallbacks are written for it.
  const leadPause = firstMeaningful(leadItem?.triggerThreshold, modeled.guardrailThreshold);
  // Only an area's own resume line: `modeled.reversalTrigger` is where the call
  // changes, and falling back to it printed the flip trigger as a resume line.
  const leadResume = firstMeaningful(leadItem?.reversalCondition);
  const pauseIf = leadPause ? formatDecisionThreshold(leadPause) : FALLBACK_PAUSE_IF;
  const resumeWhen = leadResume ? formatDecisionReversal(leadResume) : FALLBACK_RESUME_WHEN;
  // Where the call itself changes, in a slot of its own beside the resume line.
  const callChangesIf =
    firstMeaningful(modeled.reversalTrigger, options?.postureState?.whatFlipsNext.flipTrigger)
    ?? buildFlipThreshold(assessment);

  return [
    `• ${publicDecisionLabels.call}: ${currentCall}`,
    `• ${publicDecisionLabels.action}: ${actionNow}`,
    `• ${publicDecisionLabels.threshold}: ${pauseIf}`,
    `• ${publicDecisionLabels.reversal}: ${resumeWhen}`,
    `• ${DECISION_CONTRACT_LABELS.watch.postureFlips}: ${callChangesIf}`,
  ];
};

const areaOrderIndex = (item: ActionStripItem) => decisionAreaOrder.indexOf(operatingLeverToDecisionArea[item.lever]);

/**
 * One row per decision area, in the page's row order (`decisionAreaOrder`),
 * each with its rule, its pause and resume lines with a distance, and its
 * timing. The rows used to follow the model's priority order and skip the
 * lead item, so a reader who checks Fundraising every Monday found it in a
 * different place in every paste — and never in the same place as on the page.
 */
export const buildAreaRowLines = (options?: ExportLayerOptions) => {
  const items = resolveModeledDecisionPayload(options).actionStripItems ?? [];
  return [...items]
    .sort((left, right) => areaOrderIndex(left) - areaOrderIndex(right))
    .flatMap((item) => [
      `• ${decisionAreaLabel(operatingLeverToDecisionArea[item.lever])}: ${item.areaActionNow}`,
      `  ${publicDecisionLabels.threshold}: ${formatItemLines(item, "pause")}`,
      `  ${publicDecisionLabels.reversal}: ${formatItemLines(item, "resume")}`,
      ...(item.latencyLine ? [`  ${DECISION_CONTRACT_LABELS.timing.latency}: ${item.latencyLine}`] : []),
    ]);
};

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
 * export and the page's `ScoreCell` share (`lib/export/scoreReference.ts`).
 * The sentences elsewhere in the brief say the rule; this says where the
 * reading sits against it, so nobody pastes a paragraph to answer "how close".
 *
 * "Last week" prints only from `options.previousScores`. An earlier version
 * read `diagnostics.tightnessDelta` as a weekly move, and that field was a
 * distance from the regime threshold — so an unchanged week still claimed one.
 */
export const buildReadingLines = (assessment: RegimeAssessment, options?: ExportLayerOptions): string[] => {
  const items = resolveModeledDecisionPayload(options).actionStripItems ?? [];
  const scores = { tightness: assessment.scores.tightness, riskAppetite: assessment.scores.riskAppetite };
  return buildScoreReferenceLines({
    scores,
    thresholds: assessment.thresholds,
    rails: buildSharedCorridorRails(items, scores),
    previous: options?.previousScores ?? null,
  });
};

const buildViralArtifactBlock = (
  assessment: RegimeAssessment,
  confidenceLabel: PublishedConfidenceLabel,
  options?: ExportLayerOptions,
) => {
  const modeled = resolveModeledDecisionPayload(options);

  if (!modeled.operatingStanceLine) {
    return [];
  }

  /* This read the posture state's label, and every caller but one passed no
     posture state, so "confidence is not high" printed on every /share paste
     whatever the reading. */
  const trustMarkers = [
    confidenceLabel !== "HIGH" ? "confidence is not high" : "",
    !options?.freshnessLabel || options.freshnessLabel === "Unavailable" ? "no live reading this week" : "",
  ].filter((marker) => marker.length > 0);
  const actionStripItems = modeled.actionStripItems ?? [];
  const currentCall =
    modeled.currentCall
    ?? assessment.constraints[0]
    ?? FALLBACK_CURRENT_CALL;
  const actionNow =
    modeled.actionNow
    ?? actionStripItems[0]?.areaActionNow
    ?? currentCall;

  const actionStrip = actionStripItems.slice(1, 3).flatMap((item) => [
    `• ${decisionAreaLabel(operatingLeverToDecisionArea[item.lever])}`,
    `  ${publicDecisionLabels.action}: ${item.areaActionNow}`,
    `  ${publicDecisionLabels.threshold}: ${formatDecisionThreshold(item.triggerThreshold)}`,
    `  ${publicDecisionLabels.reversal}: ${formatDecisionReversal(item.reversalCondition)}`,
    ...(item.latencyLine ? [`  ${DECISION_CONTRACT_LABELS.timing.latency}: ${item.latencyLine}`] : []),
  ]);

  return [
    "",
    "This week's guidance:",
    `• Conditions: ${describeConditions(assessment.regime, modeled.postureWithStageLabel)}`,
    ...(options?.trendLabel
      ? [`• ${comparisonBasis(options.previousScores?.comparedWith).versus}: ${describeWeeklyDirection(options.trendLabel)}`]
      : []),
    `• Points from the change line: ${(options?.regimeDistancePoints ?? 0).toFixed(1)}`,
    `• Could conditions change next week: ${options?.transitionWatch === "ON" ? "yes" : "no"}`,
    `• ${publicDecisionLabels.call}: ${currentCall}`,
    `• ${publicDecisionLabels.action}: ${actionNow}`,
    /* The posture contract's thresholds mix call-change and resume conditions,
       so they print as one list under the heading that covers both. */
    ...((options?.postureState?.whatFlipsNext.thresholds ?? []).length > 0
      ? [
          `• ${DECISION_CONTRACT_LABELS.watch.flipWatch}:`,
          ...(options?.postureState?.whatFlipsNext.thresholds ?? []).map((condition) => `  - ${condition}`),
        ]
      : []),
    "• Re-check: whoever owns the plan, at the next weekly review.",
    ...(trustMarkers.length > 0 ? [`• Read with care: ${trustMarkers.join("; ")}`] : []),
    ...actionStrip,
  ];
};

const buildInterpretationLayerBlock = (options?: ExportLayerOptions) => {
  if (!options?.interpretationLayer || options.interpretationLayer.view === "default") {
    return [];
  }

  const layer = options.interpretationLayer;
  const boundedBullets = layer.bullets.slice(0, 3);
  const financialSummary = layer.financialAction
    ? [
      `Runway: ${layer.financialAction.runwayRisk}`,
      `When to raise: ${layer.financialAction.raiseTiming}`,
      `Spending: ${layer.financialAction.burnAdjustment}`,
    ]
    : [];

  return [
    "",
    `${layer.label}: ${layer.summary}`,

    ...boundedBullets.map((bullet) => `• ${bullet}`),
    ...financialSummary.map((line) => `• ${line}`),
  ];
};



/*
 * One block, not two. The transmission check and the "false-signal warning"
 * both printed `failureModes[0].warning`, so a brief with a warning carried it
 * twice under two headers; the mitigation check now sits under the warning it
 * belongs to.
 */
const buildWhyThisCouldBeWrongBlock = (confidenceLabel: PublishedConfidenceLabel, options?: ExportLayerOptions) => {
  const mode = options?.failureModes?.[0];
  const confidenceLine = formatExportConfidence(confidenceLabel);
  const whyCouldBeWrong = mode?.warning
    ?? "The scores sit near a line; a small move could change conditions. Hold anything you can't undo.";

  return [
    "",
    "Why this could be wrong:",
    `• ${confidenceLine}`,
    `• ${whyCouldBeWrong}`,
    ...(mode?.mitigationCheck ? [`• Check: ${mode.mitigationCheck}`] : []),
    `• If it is: see "${DECISION_CONTRACT_LABELS.watch.postureFlips}" above, plus the readings.`,
  ];
};

const buildHistoricalAnalogsBlock = (options?: ExportLayerOptions) => {
  const analogs = options?.historicalAnalogs ?? [];
  if (analogs.length === 0) return [];

  return [
    "",
    "Past weeks that looked like this one:",
    ...analogs.slice(0, 3).map((analog) => `• ${analog.date}: ${analog.implication}`),
  ];
};

const buildCitationLines = (treasury: TreasuryData, macros: MacroSeriesReading[]) => [
  `Treasury source: ${treasury.source} (${treasury.record_date})`,
  ...macros.map((macro) => `${macro.label}: ${macro.sourceUrl} (${macro.record_date})`),
];

export const buildBoardSlideBullets = (
  assessment: RegimeAssessment,
  treasury: TreasuryData,
  macros: MacroSeriesReading[],
  options?: ExportLayerOptions,
) => {
  const areaRows = buildAreaRowLines(options);
  return [
    `Conditions: ${describeConditions(assessment.regime, resolveModeledDecisionPayload(options).postureWithStageLabel)}`,
    ...buildCallLines(assessment, options),
    "",
    `${EXPORT_SECTION_HEADINGS.changed}:`,
    ...buildReadingLines(assessment, options),
    ...macros.map((macro) => `${macro.label}: ${formatNumberWithUnit(macro.value, macro.unit)}`),
    ...(areaRows.length > 0 ? ["", `${EXPORT_SECTION_HEADINGS.areas}:`, ...areaRows] : []),
    ...buildInterpretationLayerBlock(options),
    "",
    ...buildExportStamp(treasury, CONFIDENCE_STAMP_NOTE),
  ].join("\n");
};

export const buildSlackBrief = (
  assessment: RegimeAssessment,
  treasury: TreasuryData,
  sensors: SensorReading[],
  macros: MacroSeriesReading[],
  options?: ExportLayerOptions,
) => {
  const baseRate = sensors.find((sensor) => sensor.id === "BASE_RATE");
  const curveSlope = sensors.find((sensor) => sensor.id === "CURVE_SLOPE");
  const macroLines = macros.map(
    (macro) => `• ${macro.label}: ${formatNumberWithUnit(macro.value, macro.unit)} · refreshed ${macro.record_date}`,
  );
  const modeled = resolveModeledDecisionPayload(options);
  const citations = buildCitationLines(treasury, macros);
  const conditionsLabel = describeConditions(assessment.regime, modeled.postureWithStageLabel);
  const areaRows = buildAreaRowLines(options);
  const confidenceLabel = resolvePublishedConfidence({ assessment, record: treasury }).label;

  /*
   * The page's order: the call, what changed, what that changes for you, what
   * would change the call, then sources. The readings and the rate inputs used
   * to lead, above the call they explain.
   */
  return [
    `Whether Weekly Brief — ${treasury.record_date}`,
    `Conditions: ${conditionsLabel}`,
    "",
    `This week's decision (${publicDecisionLabels.call} / ${publicDecisionLabels.action} / ${publicDecisionLabels.threshold} / ${publicDecisionLabels.reversal} / ${DECISION_CONTRACT_LABELS.watch.postureFlips}):`,
    ...buildCallLines(assessment, options),
    "",
    `${EXPORT_SECTION_HEADINGS.changed}:`,
    ...buildReadingLines(assessment, options),
    `${regimeSignalLabel.baseRate}: ${formatNumberWithUnit(baseRate?.value ?? null, "%")} (read from ${describeBaseRateSource(assessment.scores.baseRateUsed)})`,
    `${RECESSION_GAUGE_LABEL}: ${formatNumberWithUnit(curveSlope?.value ?? null, "%")}`,
    ...macroLines,
    ...(areaRows.length > 0 ? ["", `${EXPORT_SECTION_HEADINGS.areas}:`, ...areaRows] : []),
    "",
    "What to hold:",
    ...assessment.constraints.map((item) => `• ${item}`),
    ...buildWhyThisCouldBeWrongBlock(confidenceLabel, options),
    ...buildViralArtifactBlock(assessment, confidenceLabel, options),
    ...buildHistoricalAnalogsBlock(options),
    ...buildInterpretationLayerBlock(options),
    "",
    "Citations:",
    ...citations,
    "",
    buildBriefPermalinkLine(treasury.record_date),
    "",
    ...buildExportStamp(treasury, CONFIDENCE_STAMP_NOTE),
  ].join("\n");
};

export const buildBoardBrief = (
  assessment: RegimeAssessment,
  treasury: TreasuryData,
  sensors: SensorReading[],
  macros: MacroSeriesReading[],
  options?: ExportLayerOptions,
) => {
  const briefing = buildSlackBrief(assessment, treasury, sensors, macros, options);
  const slideBullets = buildBoardSlideBullets(assessment, treasury, macros, options);
  return [briefing, "", "---", "", slideBullets].join("\n");
};

export const buildCallCitation = (
  assessment: RegimeAssessment,
  treasury: TreasuryData,
  options?: ExportLayerOptions,
) => [
  `Whether Weekly Brief — ${treasury.record_date}`,
  `Conditions: ${describeConditions(assessment.regime, options?.postureWithStageLabel)}`,
  `${formatExportConfidence(resolvePublishedConfidence({ assessment, record: treasury }).label)} (how far the scores sit from the line where conditions change)`,
  `Source note: ${treasury.source}`,
  buildBriefPermalinkLine(treasury.record_date),
  ...buildInterpretationLayerBlock(options),
].join("\n");
