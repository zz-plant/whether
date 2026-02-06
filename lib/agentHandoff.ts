/**
 * Agent handoff helpers for autonomous PM assistants.
 * Provides structured payloads and prompts for downstream automation.
 */
import type { RegimeAssessment } from "./regimeEngine";
import { agentSkills } from "./agentSkills";
import type { MacroSeriesReading, SensorReading, TreasuryData } from "./types";

const getRegimeLabel = (regime: RegimeAssessment["regime"]) => {
  switch (regime) {
    case "SCARCITY":
      return "Survival Mode";
    case "DEFENSIVE":
      return "Safety Mode";
    case "VOLATILE":
      return "Stability Mode";
    case "EXPANSION":
      return "Growth Mode";
    default:
      return regime;
  }
};

const buildSignals = (
  treasury: TreasuryData,
  sensors: SensorReading[]
) => {
  const baseRate = sensors.find((sensor) => sensor.id === "BASE_RATE");
  const curveSlope = sensors.find((sensor) => sensor.id === "CURVE_SLOPE");

  return [
    {
      id: baseRate?.id ?? "BASE_RATE",
      label: baseRate?.label ?? "Policy base rate",
      value: baseRate?.value ?? null,
      unit: baseRate?.unit ?? "%",
      record_date: baseRate?.record_date ?? treasury.record_date,
      fetched_at: baseRate?.fetched_at ?? treasury.fetched_at,
      source_url: baseRate?.sourceUrl ?? treasury.source,
    },
    {
      id: curveSlope?.id ?? "CURVE_SLOPE",
      label: curveSlope?.label ?? "Yield curve slope (10Y - 2Y)",
      value: curveSlope?.value ?? null,
      unit: curveSlope?.unit ?? "%",
      record_date: curveSlope?.record_date ?? treasury.record_date,
      fetched_at: curveSlope?.fetched_at ?? treasury.fetched_at,
      source_url: curveSlope?.sourceUrl ?? treasury.source,
    },
  ];
};

export const buildAgentPayload = (
  assessment: RegimeAssessment,
  treasury: TreasuryData,
  sensors: SensorReading[],
  macros: MacroSeriesReading[]
) => {
  const regimeLabel = getRegimeLabel(assessment.regime);

  return {
    report_date: treasury.record_date,
    fetched_at: treasury.fetched_at,
    source: treasury.source,
    regime: {
      key: assessment.regime,
      label: regimeLabel,
      description: assessment.description,
    },
    scores: assessment.scores,
    thresholds: assessment.thresholds,
    constraints: assessment.constraints,
    data_warnings: assessment.dataWarnings,
    signals: buildSignals(treasury, sensors),
    macro_signals: macros.map((macro) => ({
      id: macro.id,
      label: macro.label,
      value: macro.value,
      unit: macro.unit,
      record_date: macro.record_date,
      fetched_at: macro.fetched_at,
      source_url: macro.sourceUrl,
    })),
    skills: agentSkills,
    pm_handoff: {
      decision_focus: "Use constraints to validate roadmap, hiring, and pricing moves.",
      briefing_actions: [
        "Summarize the regime in plain English.",
        "Call out constraints that block or enable new initiatives.",
        "List open questions for the product manager.",
      ],
    },
  };
};

export const buildAgentPayloadJson = (
  assessment: RegimeAssessment,
  treasury: TreasuryData,
  sensors: SensorReading[],
  macros: MacroSeriesReading[]
) => JSON.stringify(buildAgentPayload(assessment, treasury, sensors, macros), null, 2);

export const buildAgentPrompt = (
  assessment: RegimeAssessment,
  treasury: TreasuryData
) => {
  return [
    "You are an autonomous PM assistant.",
    "Follow the skills list in the JSON payload and deliver outputs in the same order.",
    "Use the JSON payload to draft:",
    "1) A 3-bullet summary of the market climate.",
    "2) The top 3 constraints that should shape roadmap decisions.",
    "3) A short list of questions to confirm with the PM before acting.",
    "",
    `Context: Whether Report for ${treasury.record_date} (${assessment.regime}).`,
  ].join("\n");
};
