import { formatNumberWithUnit } from "../formatters";
import type { RegimeAssessment } from "../regimeEngine";
import type { MacroSeriesReading, SensorReading, TreasuryData } from "../types";
import { buildComplianceStamp } from "../exportNotices";
import { formatRegimeLabel } from "../regimeFormat";
import type { InterpretationLayer } from "../report/interpretationLayer";
import type { ActionStripItem } from "../report/operatingCalls";
import {
  buildRunwayPlan,
  formatRunwayPlanCompactBlock,
  getRunwayPlannerBaselineInput,
  type PlannerPosture,
} from "../report/runwayPlanner";

const buildExportStamp = (treasury: TreasuryData, confidence: string) =>
  buildComplianceStamp({
    sourceLine: treasury.source,
    timestamp: treasury.record_date,
    confidence,
  });

const buildDecisionHighlights = (assessment: RegimeAssessment) =>
  assessment.constraints.slice(0, 3).map((constraint) => `• ${constraint}`);

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
};

const buildViralArtifactBlock = (options?: ExportLayerOptions) => {
  if (!options?.operatingStanceLine) {
    return [];
  }

  const actionStrip = (options.actionStripItems ?? []).slice(0, 2).flatMap((item) => [
    `• ${item.label}`,
    `  Action now: ${item.actionNow}`,
    `  Trigger/threshold to tighten or loosen: ${item.triggerThreshold}`,
    `  Reversal condition: ${item.reversalCondition}`,
  ]);

  return [
    "",
    "Startup environment — weekly call:",
    `• Posture: ${options.postureWithStageLabel ?? "Current posture"}`,
    `• Trend: ${(options.trendLabel ?? "Stable").toUpperCase()}`,
    `• Distance to regime change: ${(options.regimeDistancePoints ?? 0).toFixed(1)} points`,
    `• Regime shift watch: ${options.transitionWatch ?? "OFF"}`,
    `• Operating posture: ${options.operatingStanceLine}`,
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
    "Interpretation trust: translation layer only; canonical posture/confidence/thresholds unchanged.",
    ...boundedBullets.map((bullet) => `• ${bullet}`),
    ...financialSummary.map((line) => `• ${line}`),
  ];
};



const buildFailureModeBlock = (options?: ExportLayerOptions) => {
  const mode = options?.failureModes?.[0];
  if (!mode) return [];

  return [
    "",
    "False-signal warning:",
    `• ${mode.warning}`,
    `• ${mode.mitigationCheck}`,
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

const mapPolicyPostureToPlannerPosture = (posture: RegimeAssessment["policyAssessment"]["posture"]): PlannerPosture => {
  if (posture === "RISK_ON") return "RISK_ON";
  if (posture === "TRANSITION") return "TRANSITION";
  return "SAFETY_MODE";
};

const buildFinancialImplicationsBlock = (assessment: RegimeAssessment) => {
  const baseline = getRunwayPlannerBaselineInput(
    assessment.regime,
    mapPolicyPostureToPlannerPosture(assessment.policyAssessment.posture),
  );
  const plan = buildRunwayPlan(baseline);
  return formatRunwayPlanCompactBlock(plan);
};

const buildCitationLines = (treasury: TreasuryData, macros: MacroSeriesReading[]) => [
  `Treasury source: ${treasury.source} (${treasury.record_date})`,
  ...macros.map((macro) => `${macro.label}: ${macro.sourceUrl} (${macro.record_date})`),
];

const buildSlideBullets = (
  assessment: RegimeAssessment,
  treasury: TreasuryData,
  macros: MacroSeriesReading[],
  options?: ExportLayerOptions,
) => [
  `Capital posture: ${options?.postureWithStageLabel ?? assessment.regime}`,
  `Tightness ${assessment.scores.tightness} / Risk ${assessment.scores.riskAppetite}`,
  ...macros.map((macro) => `${macro.label}: ${formatNumberWithUnit(macro.value, macro.unit)}`),
  ...assessment.constraints.map((item) => `Guardrail: ${item}`),
  ...buildInterpretationLayerBlock(options),
  "",
  ...buildExportStamp(treasury, "Score-based posture confidence"),
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
  const decisionHighlights = buildDecisionHighlights(assessment);
  const citations = buildCitationLines(treasury, macros);
  const financialImplications = buildFinancialImplicationsBlock(assessment);

  return [
    `Whether Report Brief — ${treasury.record_date}`,
    `Capital posture: ${options?.postureWithStageLabel ?? assessment.regime}`,
    `Tightness: ${assessment.scores.tightness} | Risk appetite: ${assessment.scores.riskAppetite}`,
    `Base rate: ${formatNumberWithUnit(baseRate?.value ?? null, "%")} (${assessment.scores.baseRateUsed})`,
    `Curve slope: ${formatNumberWithUnit(curveSlope?.value ?? null, "%")}`,
    "",
    "Macro signals:",
    ...macroLines,
    "",
    "Decision Shield highlights (top 3):",
    ...decisionHighlights,
    "",
    "Constraints:",
    ...assessment.constraints.map((item) => `• ${item}`),
    "",
    financialImplications,
    ...buildViralArtifactBlock(options),
    ...buildFailureModeBlock(options),
    ...buildHistoricalAnalogsBlock(options),
    ...buildInterpretationLayerBlock(options),
    "",
    "Citations:",
    ...citations,
    "",
    ...buildExportStamp(treasury, "Score-based posture confidence"),
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
  const slideBullets = buildSlideBullets(assessment, treasury, macros, options);
  return [briefing, "", "---", "", slideBullets].join("\n");
};

export const buildConstraintHeadlines = (
  assessment: RegimeAssessment,
  treasury: TreasuryData,
) => {
  const regimeLabel = formatRegimeLabel(assessment.regime);
  const headline = `${regimeLabel}: capital tightness ${assessment.scores.tightness}/100 with bravery ${assessment.scores.riskAppetite}/100.`;
  const constraints = assessment.constraints.map((item) => `• ${item}`);

  return [
    `Whether Report Headlines — ${treasury.record_date}`,
    headline,
    "",
    "Execution constraints:",
    ...constraints,
    "",
    `Source: ${treasury.source}`,
    "",
    ...buildExportStamp(treasury, "Score-based posture confidence"),
  ].join("\n");
};

export const buildCallCitation = (
  assessment: RegimeAssessment,
  treasury: TreasuryData,
  options?: ExportLayerOptions,
) => [
  `Whether call — ${treasury.record_date}`,
  `Posture: ${options?.postureWithStageLabel ?? formatRegimeLabel(assessment.regime)} (${assessment.regime})`,
  `Confidence: Score-based posture confidence`,
  `Signal refresh cadence: 15m`,
  `Source: ${treasury.source}`,
  ...buildInterpretationLayerBlock(options),
].join("\n");
