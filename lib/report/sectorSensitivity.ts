import type { RegimeAssessment, RegimeKey } from "../regimeEngine";
import { REGIME_SHORT_LABELS } from "../regimePresentation";

export type SectorKey = "b2b-saas" | "consumer" | "infrastructure";

const sectorKeys = ["b2b-saas", "consumer", "infrastructure"] as const;

export const resolveSectorKey = (
  value: string | undefined,
  fallback: SectorKey = "b2b-saas",
): SectorKey => (value && sectorKeys.includes(value as SectorKey) ? (value as SectorKey) : fallback);

export type SectorSensitivityConfig = {
  label: string;
  tightnessMultiplier: number;
  riskAppetiteMultiplier: number;
  biasOffset: number;
  rationale: string;
};

export const SECTOR_TAXONOMY: Record<SectorKey, SectorSensitivityConfig> = {
  "b2b-saas": {
    label: "B2B SaaS",
    tightnessMultiplier: 0.78,
    riskAppetiteMultiplier: 1.28,
    biasOffset: 0.08,
    rationale: "Captures upside faster when demand confidence improves, while remaining less penalized by short-lived tightening spikes.",
  },
  consumer: {
    label: "Consumer",
    tightnessMultiplier: 1,
    riskAppetiteMultiplier: 1,
    biasOffset: 0,
    rationale: "Tracks canonical posture with minimal structural tilt.",
  },
  infrastructure: {
    label: "Infrastructure",
    tightnessMultiplier: 1.28,
    riskAppetiteMultiplier: 0.72,
    biasOffset: -0.1,
    rationale: "Feels financing stress earlier and rewards risk appetite later due to reliability and migration burdens.",
  },
};

export type SectorAdjustedPosture = {
  basePostureLabel: string;
  adjustedPostureLabel: string;
  adjustmentStrength: "none" | "light" | "moderate" | "strong";
  adjustmentDelta: number;
  boundaryGap: number;
  dampingFactor: number;
  actionBias: "tighten" | "hold" | "loosen";
  reversalCondition: string;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const resolveBasePostureLabel = (regime: RegimeKey) => REGIME_SHORT_LABELS[regime];

const resolveSignalBias = (assessment: Pick<RegimeAssessment, "scores" | "thresholds">) => {
  const tightnessBias = clamp((assessment.thresholds.tightnessRegime - assessment.scores.tightness) / 25, -1.5, 1.5);
  const riskBias = clamp((assessment.scores.riskAppetite - assessment.thresholds.riskAppetiteRegime) / 25, -1.5, 1.5);
  return { tightnessBias, riskBias };
};

const resolveBoundaryGap = (assessment: Pick<RegimeAssessment, "scores" | "thresholds">) => {
  const tightnessGap = Math.abs(assessment.scores.tightness - assessment.thresholds.tightnessRegime);
  const riskGap = Math.abs(assessment.scores.riskAppetite - assessment.thresholds.riskAppetiteRegime);
  return Math.min(tightnessGap, riskGap);
};

const resolveBoundaryDamping = (gap: number) => clamp(0.3 + gap / (gap + 8), 0.3, 1);

const resolveStrength = (absDelta: number): SectorAdjustedPosture["adjustmentStrength"] => {
  if (absDelta < 0.05) return "none";
  if (absDelta < 0.12) return "light";
  if (absDelta < 0.22) return "moderate";
  return "strong";
};

const resolvePostureSuffix = (delta: number) => {
  if (delta >= 0.05) return "+";
  if (delta <= -0.05) return "-";
  return "";
};

const resolveActionBias = (delta: number): SectorAdjustedPosture["actionBias"] => {
  if (delta >= 0.1) return "loosen";
  if (delta <= -0.1) return "tighten";
  return "hold";
};

const buildReversalCondition = (
  assessment: Pick<RegimeAssessment, "scores" | "thresholds">,
  actionBias: SectorAdjustedPosture["actionBias"],
) => {
  if (actionBias === "hold") {
    return "Keep base operating cadence unless either score crosses its regime threshold by 3+ points.";
  }

  const nearestTightnessGap = Math.abs(assessment.scores.tightness - assessment.thresholds.tightnessRegime);
  const nearestRiskGap = Math.abs(assessment.scores.riskAppetite - assessment.thresholds.riskAppetiteRegime);
  const useTightness = nearestTightnessGap <= nearestRiskGap;

  if (useTightness) {
    const direction = actionBias === "loosen" ? "rises above" : "falls to or below";
    return `Reverse overlay bias if tightness ${direction} ${assessment.thresholds.tightnessRegime.toFixed(1)}.`;
  }

  const direction = actionBias === "loosen" ? "falls to or below" : "rises above";
  return `Reverse overlay bias if risk appetite ${direction} ${assessment.thresholds.riskAppetiteRegime.toFixed(1)}.`;
};

export const deriveSectorAdjustedPosture = (
  baseAssessment: Pick<RegimeAssessment, "regime" | "scores" | "thresholds">,
  sector: SectorKey,
): SectorAdjustedPosture => {
  const sensitivity = SECTOR_TAXONOMY[sector];
  const { tightnessBias, riskBias } = resolveSignalBias(baseAssessment);
  const baseSignal = (tightnessBias + riskBias) / 2;
  const sectorSignal =
    ((tightnessBias * sensitivity.tightnessMultiplier) + (riskBias * sensitivity.riskAppetiteMultiplier)) / 2 + sensitivity.biasOffset;

  const boundaryGap = resolveBoundaryGap(baseAssessment);
  const dampingFactor = resolveBoundaryDamping(boundaryGap);
  const adjustmentDelta = clamp((sectorSignal - baseSignal) * dampingFactor, -0.4, 0.4);
  const adjustmentStrength = resolveStrength(Math.abs(adjustmentDelta));
  const actionBias = resolveActionBias(adjustmentDelta);

  return {
    basePostureLabel: resolveBasePostureLabel(baseAssessment.regime),
    adjustedPostureLabel: `${resolveBasePostureLabel(baseAssessment.regime)}${resolvePostureSuffix(adjustmentDelta)}`,
    adjustmentStrength,
    adjustmentDelta,
    boundaryGap,
    dampingFactor,
    actionBias,
    reversalCondition: buildReversalCondition(baseAssessment, actionBias),
  };
};
