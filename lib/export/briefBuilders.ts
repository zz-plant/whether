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

export const buildBoundedDecisionLines = (assessment: RegimeAssessment, options?: ExportLayerOptions) => {
  const modeled = resolveModeledDecisionPayload(options);
  const topActionStripItems = (modeled.actionStripItems ?? []).slice(0, 3);
  const currentCall =
    firstMeaningful(modeled.currentCall, assessment.description)
    ?? FALLBACK_CURRENT_CALL;
  // Never `assessment.constraints`: that is the operating-limits list printed
  // in full further down, and a constraint in this slot printed "Do now" as a
  // verbatim copy of operating limit 1.
  const actionNow =
    firstMeaningful(
      modeled.actionNow,
      topActionStripItems[0]?.areaActionNow,
    ) ?? FALLBACK_ACTION_NOW;
  const pauseIf =
    firstMeaningful(topActionStripItems[0]?.triggerThreshold, modeled.guardrailThreshold)
    ?? FALLBACK_PAUSE_IF;
  const changeCourseIf =
    firstMeaningful(topActionStripItems[0]?.reversalCondition, modeled.reversalTrigger)
    ?? FALLBACK_CHANGE_COURSE_IF;

  return [
    `• ${publicDecisionLabels.call}: ${currentCall}`,
    `• ${publicDecisionLabels.action}: ${actionNow}`,
    `• ${publicDecisionLabels.threshold}: ${pauseIf}`,
    `• ${publicDecisionLabels.reversal}: ${changeCourseIf}`,
    ...topActionStripItems.slice(1).flatMap((item) => [
      `• ${item.label}: ${item.areaActionNow}`,
      `  ${publicDecisionLabels.threshold}: ${formatItemLines(item, "pause")}`,
      `  ${publicDecisionLabels.reversal}: ${formatItemLines(item, "resume")}`,
      ...(item.latencyLine ? [`  ${DECISION_CONTRACT_LABELS.timing.latency}: ${item.latencyLine}`] : []),
    ]),
  ];
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
 * The readings against the corridor, one line per signal.
 *
 * `Funding pressure: 32/100 · pause > 76 (44 pts away) · re-open < 66 (holds)`.
 * The sentences elsewhere in the brief say the rule; this says where the
 * reading sits against it, so nobody pastes a paragraph to answer "how close".
 */
const buildReadingLines = (assessment: RegimeAssessment, options?: ExportLayerOptions): string[] => {
  const items = resolveModeledDecisionPayload(options).actionStripItems ?? [];
  const scores = { tightness: assessment.scores.tightness, riskAppetite: assessment.scores.riskAppetite };
  const rails = buildSharedCorridorRails(items, scores);
  const readings: Array<{ metric: "tightness" | "riskAppetite"; label: string; value: number }> = [
    { metric: "tightness", label: "Funding pressure", value: scores.tightness },
    { metric: "riskAppetite", label: "Risk appetite", value: scores.riskAppetite },
  ];
  return readings.map((reading) => {
    const rail = rails.find((candidate) => candidate.metric === reading.metric);
    /*
     * No delta segment. It read `diagnostics.tightnessDelta` and printed it as
     * "vs last week", and that field is a distance from the regime threshold —
     * so an unchanged week still claimed a move. The honest version of that
     * number is "how far from a line", which the two rails after this already
     * say, against the guardrail the reader is actually deciding on. Restating
     * it against a second line is the restatement this repo declutters for.
     */
    return [
      `${reading.label}: ${reading.value}/100`,
      rail ? `pause ${rail.invert ? "<" : ">"} ${rail.guardrail} (${formatPointsToLine(rail.pointsToGuardrail, "pause", rail.guardrailTripped)})` : null,
      rail && rail.clearsAt !== undefined
        ? `re-open ${rail.invert ? ">" : "<"} ${rail.clearsAt} (${formatPointsToLine(rail.pointsToClear, "resume", rail.clearHolds)})`
        : null,
    ]
      .filter((part): part is string => Boolean(part))
      .join(" · ");
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
) => [
  `Conditions: ${resolveModeledDecisionPayload(options).postureWithStageLabel ?? getRegimePublicLabel(assessment.regime)}`,
  `Funding pressure ${assessment.scores.tightness} / Risk appetite ${assessment.scores.riskAppetite}`,
  ...macros.map((macro) => `${macro.label}: ${formatNumberWithUnit(macro.value, macro.unit)}`),
  ...buildBoundedDecisionLines(assessment, options),
  ...buildInterpretationLayerBlock(options),
  "",
  ...buildExportStamp(treasury, CONFIDENCE_STAMP_NOTE),
].join("\n");

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
  const decisionHighlights = buildBoundedDecisionLines(assessment, options);
  const modeled = resolveModeledDecisionPayload(options);
  const citations = buildCitationLines(treasury, macros);
  const postureLabel = modeled.postureWithStageLabel ?? getRegimePublicLabel(assessment.regime);

  return [
    `Whether Weekly Brief — ${treasury.record_date}`,
    `Conditions: ${postureLabel}`,
    ...buildReadingLines(assessment, options),
    `${regimeSignalLabel.baseRate}: ${formatNumberWithUnit(baseRate?.value ?? null, "%")} (${assessment.scores.baseRateUsed})`,
    `Recession warning gauge (10-year minus 2-year rate): ${formatNumberWithUnit(curveSlope?.value ?? null, "%")}`,
    "",
    "The readings:",
    ...macroLines,
    "",
    `This week's decision (${publicDecisionLabels.call} / ${publicDecisionLabels.action} / ${publicDecisionLabels.threshold} / ${publicDecisionLabels.reversal}):`,
    ...decisionHighlights,
    ...buildWhyThisCouldBeWrongBlock(assessment, options),
    "",
    "What to hold:",
    ...assessment.constraints.map((item) => `• ${item}`),
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
