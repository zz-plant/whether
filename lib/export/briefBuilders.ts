import { formatNumberWithUnit } from "../formatters";
import type { RegimeAssessment } from "../regimeEngine";
import type { MacroSeriesReading, SensorReading, TreasuryData } from "../types";
import { buildBriefPermalinkLine } from "./briefPermalink";
import { buildComplianceStamp } from "../exportNotices";
import { getRegimePublicLabel } from "../regimePresentation";
import type { InterpretationLayer } from "../report/interpretationLayer";
import { buildSharedCorridorRails, formatPointsToLine, type ActionStripItem } from "../report/operatingCalls";
import { DECISION_CONTRACT_LABELS } from "../report/reportCopy";
import { NO_LIVE_READING_CALL } from "../report/reportCopy";
import type { PostureStateContract } from "../report/postureStateContract";
import { publicDecisionLabels } from "../report/reportFormatting";
import { regimeSignalLabel } from "../report/signalTranslations";
import { decisionAreaLabel, decisionAreaOrder } from "../report/boundedDecisionRules";
import { operatingLeverToDecisionArea } from "../report/businessAreaMap";
import { buildScoreReferenceLines, type ScorePair } from "./scoreReference";

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
  confidenceLabel?: "HIGH" | "MED" | "LOW";
  freshnessLabel?: string;
  postureState?: PostureStateContract;
  modeledDecision?: ModeledExportDecisionPayload;
  /**
   * Last week's two scores, when the caller's read carries a previous week
   * (`previousScoresFromDynamics` off `reportDynamics`). Null or absent prints
   * no "last week" part rather than a stand-in for one.
   */
  previousScores?: ScorePair | null;
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
const FALLBACK_CHANGE_COURSE_IF = "Re-open when live data is back and the call has held for a week.";
/** The stamp's confidence note when no label was modeled: what the number measures. */
const CONFIDENCE_STAMP_NOTE = "how far the scores sit from the line that changes the call";

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
  const pauseIf =
    firstMeaningful(leadItem?.triggerThreshold, modeled.guardrailThreshold)
    ?? FALLBACK_PAUSE_IF;
  const changeCourseIf =
    firstMeaningful(leadItem?.reversalCondition, modeled.reversalTrigger)
    ?? FALLBACK_CHANGE_COURSE_IF;

  return [
    `• ${publicDecisionLabels.call}: ${currentCall}`,
    `• ${publicDecisionLabels.action}: ${actionNow}`,
    `• ${publicDecisionLabels.threshold}: ${pauseIf}`,
    `• ${publicDecisionLabels.reversal}: ${changeCourseIf}`,
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
    return kind === "pause" ? item.triggerThreshold : item.reversalCondition;
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
const buildReadingLines = (assessment: RegimeAssessment, options?: ExportLayerOptions): string[] => {
  const items = resolveModeledDecisionPayload(options).actionStripItems ?? [];
  const scores = { tightness: assessment.scores.tightness, riskAppetite: assessment.scores.riskAppetite };
  return buildScoreReferenceLines({
    scores,
    thresholds: assessment.thresholds,
    rails: buildSharedCorridorRails(items, scores),
    previous: options?.previousScores ?? null,
  });
};

const buildViralArtifactBlock = (assessment: RegimeAssessment, options?: ExportLayerOptions) => {
  const modeled = resolveModeledDecisionPayload(options);

  if (!modeled.operatingStanceLine) {
    return [];
  }

  const trustMarkers = [
    options?.postureState?.currentState.confidenceLabel !== "HIGH" ? "Confidence: Guarded" : "",
    !options?.freshnessLabel || options.freshnessLabel === "Unavailable" ? "Freshness: Stale" : "",
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
    `• ${item.label}`,
    `  ${publicDecisionLabels.action}: ${item.areaActionNow}`,
    `  ${publicDecisionLabels.threshold}: ${item.triggerThreshold}`,
    `  ${publicDecisionLabels.reversal}: ${item.reversalCondition}`,
    ...(item.latencyLine ? [`  ${DECISION_CONTRACT_LABELS.timing.latency}: ${item.latencyLine}`] : []),
  ]);

  return [
    "",
    "This week's call:",
    `• Conditions: ${modeled.postureWithStageLabel ?? "Current read"}`,
    `• Trend: ${(options?.trendLabel ?? "Stable").toUpperCase()}`,
    `• Points from the line that changes the call: ${(options?.regimeDistancePoints ?? 0).toFixed(1)}`,
    `• Could the call change next week: ${options?.transitionWatch === "ON" ? "yes" : "no"}`,
    `• ${publicDecisionLabels.call}: ${currentCall}`,
    `• ${publicDecisionLabels.action}: ${actionNow}`,
    ...(options?.postureState?.whatFlipsNext.thresholds ?? []).map((condition) => `• ${publicDecisionLabels.reversal}: ${condition}`),
    "• Re-check: whoever owns the plan, at the next weekly review.",
    ...(trustMarkers.length > 0 ? [`• Data: ${trustMarkers.join(" · ")}`] : []),
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
      `Runway risk: ${layer.financialAction.runwayRisk}`,
      `Raise timing: ${layer.financialAction.raiseTiming}`,
      `Burn adjustment: ${layer.financialAction.burnAdjustment}`,
    ]
    : [];

  return [
    "",
    `Interpretation context: ${layer.label} (${layer.view})`,
    `Interpretation summary: ${layer.summary}`,

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
const buildWhyThisCouldBeWrongBlock = (assessment: RegimeAssessment, options?: ExportLayerOptions) => {
  const mode = options?.failureModes?.[0];
  const confidenceLine = options?.confidenceLabel
    ? `${options.confidenceLabel} confidence`
    : `${assessment.diagnostics.confidence} confidence`;
  const whyCouldBeWrong = mode?.warning
    ?? "The scores sit near a line; a small move changes the call. Hold anything you can't undo.";

  return [
    "",
    "Why this could be wrong:",
    `• Confidence: ${confidenceLine}`,
    `• ${whyCouldBeWrong}`,
    ...(mode?.mitigationCheck ? [`• Check: ${mode.mitigationCheck}`] : []),
    `• If it is: see "${publicDecisionLabels.reversal}" above, plus the readings.`,
  ];
};

const buildHistoricalAnalogsBlock = (options?: ExportLayerOptions) => {
  const analogs = options?.historicalAnalogs ?? [];
  if (analogs.length === 0) return [];

  return [
    "",
    "Historical analogs:",
    ...analogs.slice(0, 3).map((analog) =>
      `• ${analog.date} · ${(analog.similarityScore * 100).toFixed(0)}% match · ${analog.implication}`
    ),
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
    `Conditions: ${resolveModeledDecisionPayload(options).postureWithStageLabel ?? getRegimePublicLabel(assessment.regime)}`,
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
  const postureLabel = modeled.postureWithStageLabel ?? getRegimePublicLabel(assessment.regime);
  const areaRows = buildAreaRowLines(options);

  /*
   * The page's order: the call, what changed, what that changes for you, what
   * would change the call, then sources. The readings and the rate inputs used
   * to lead, above the call they explain.
   */
  return [
    `Whether Weekly Brief — ${treasury.record_date}`,
    `Conditions: ${postureLabel}`,
    "",
    `This week's decision (${publicDecisionLabels.call} / ${publicDecisionLabels.action} / ${publicDecisionLabels.threshold} / ${publicDecisionLabels.reversal}):`,
    ...buildCallLines(assessment, options),
    "",
    `${EXPORT_SECTION_HEADINGS.changed}:`,
    ...buildReadingLines(assessment, options),
    `${regimeSignalLabel.baseRate}: ${formatNumberWithUnit(baseRate?.value ?? null, "%")} (${assessment.scores.baseRateUsed})`,
    `Recession warning gauge (10-year minus 2-year rate): ${formatNumberWithUnit(curveSlope?.value ?? null, "%")}`,
    ...macroLines,
    ...(areaRows.length > 0 ? ["", `${EXPORT_SECTION_HEADINGS.areas}:`, ...areaRows] : []),
    "",
    "What to hold:",
    ...assessment.constraints.map((item) => `• ${item}`),
    ...buildWhyThisCouldBeWrongBlock(assessment, options),
    ...buildViralArtifactBlock(assessment, options),
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
  `Conditions: ${options?.postureWithStageLabel ?? getRegimePublicLabel(assessment.regime)}`,
  `Confidence: ${assessment.diagnostics.confidence} (how far the scores sit from the line that changes the call)`,
  `Source note: ${treasury.source}`,
  buildBriefPermalinkLine(treasury.record_date),
  ...buildInterpretationLayerBlock(options),
].join("\n");
