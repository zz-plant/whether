import { formatNumberValue } from "../formatters";
import type { RegimeAssessment } from "../regimeEngine";
import type { MacroSeriesReading, SensorReading, TreasuryData } from "../types";
import { buildComplianceStamp } from "../exportNotices";
import { formatRegimeLabel } from "../regimeFormat";

const formatNumber = (value: number | null, unit: string) => {
  const formatted = formatNumberValue(value);
  return formatted === "—" ? formatted : `${formatted}${unit}`;
};

const buildExportStamp = (treasury: TreasuryData, confidence: string) =>
  buildComplianceStamp({
    sourceLine: treasury.source,
    timestamp: treasury.record_date,
    confidence,
  });

const buildDecisionHighlights = (assessment: RegimeAssessment) =>
  assessment.constraints.slice(0, 3).map((constraint) => `• ${constraint}`);

const buildCitationLines = (treasury: TreasuryData, macros: MacroSeriesReading[]) => [
  `Treasury source: ${treasury.source} (${treasury.record_date})`,
  ...macros.map((macro) => `${macro.label}: ${macro.sourceUrl} (${macro.record_date})`),
];

const buildSlideBullets = (
  assessment: RegimeAssessment,
  treasury: TreasuryData,
  macros: MacroSeriesReading[],
) => [
  `Capital posture: ${assessment.regime}`,
  `Tightness ${assessment.scores.tightness} / Risk ${assessment.scores.riskAppetite}`,
  ...macros.map((macro) => `${macro.label}: ${formatNumber(macro.value, macro.unit)}`),
  ...assessment.constraints.map((item) => `Guardrail: ${item}`),
  "",
  ...buildExportStamp(treasury, "Score-based posture confidence"),
].join("\n");

export const buildSlackBrief = (
  assessment: RegimeAssessment,
  treasury: TreasuryData,
  sensors: SensorReading[],
  macros: MacroSeriesReading[],
) => {
  const baseRate = sensors.find((sensor) => sensor.id === "BASE_RATE");
  const curveSlope = sensors.find((sensor) => sensor.id === "CURVE_SLOPE");
  const macroLines = macros.map(
    (macro) => `• ${macro.label}: ${formatNumber(macro.value, macro.unit)} · refreshed ${macro.record_date}`,
  );
  const decisionHighlights = buildDecisionHighlights(assessment);
  const citations = buildCitationLines(treasury, macros);

  return [
    `Whether Report Brief — ${treasury.record_date}`,
    `Capital posture: ${assessment.regime}`,
    `Tightness: ${assessment.scores.tightness} | Risk appetite: ${assessment.scores.riskAppetite}`,
    `Base rate: ${formatNumber(baseRate?.value ?? null, "%")} (${assessment.scores.baseRateUsed})`,
    `Curve slope: ${formatNumber(curveSlope?.value ?? null, "%")}`,
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
) => {
  const briefing = buildSlackBrief(assessment, treasury, sensors, macros);
  const slideBullets = buildSlideBullets(assessment, treasury, macros);
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
