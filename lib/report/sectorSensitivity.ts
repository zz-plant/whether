import type { RegimeAssessment, RegimeKey } from "../regimeEngine";
import { REGIME_LABELS } from "../regimePresentation";
import { formatThresholdNumber } from "../formatters";

export type SectorKey = "b2b-saas" | "consumer" | "infrastructure" | "fintech" | "healthcare" | "ai-platforms";

const sectorKeys = ["b2b-saas", "consumer", "infrastructure", "fintech", "healthcare", "ai-platforms"] as const;

export const resolveSectorKey = (
  value: string | undefined,
  fallback: SectorKey = "b2b-saas",
): SectorKey => (value && sectorKeys.includes(value as SectorKey) ? (value as SectorKey) : fallback);

type SectorSensitivityConfig = {
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
    biasOffset: 0.16,
    rationale: "Captures upside faster when demand confidence improves, while remaining less penalized by short-lived tightening spikes.",
  },
  consumer: {
    label: "Consumer",
    tightnessMultiplier: 1,
    riskAppetiteMultiplier: 1,
    biasOffset: 0,
    rationale: "Tracks base market conditions with minimal structural tilt.",
  },
  infrastructure: {
    label: "Infrastructure",
    tightnessMultiplier: 1.28,
    riskAppetiteMultiplier: 0.72,
    biasOffset: -0.18,
    rationale: "Feels financing stress earlier and rewards risk appetite later due to reliability and migration burdens.",
  },
  fintech: {
    label: "Fintech",
    tightnessMultiplier: 1.2,
    riskAppetiteMultiplier: 1.16,
    biasOffset: -0.04,
    rationale: "Benefits from risk-on demand but remains directly exposed to cost-of-capital and compliance-cycle drag.",
  },
  healthcare: {
    label: "Healthcare",
    tightnessMultiplier: 1.12,
    riskAppetiteMultiplier: 0.84,
    biasOffset: -0.02,
    rationale: "Procurement and reimbursement cycles smooth upside and downside, dampening market swings.",
  },
  "ai-platforms": {
    label: "AI Platforms",
    tightnessMultiplier: 0.74,
    riskAppetiteMultiplier: 1.34,
    biasOffset: 0.1,
    rationale: "Captures risk-appetite expansion quickly while maintaining resilience to moderate tightening due to demand pull.",
  },
};

type SectorAdjustedPosture = {
  basePostureLabel: string;
  adjustedPostureLabel: string;
  postureVariant: "minus" | "neutral" | "plus";
  adjustmentStrength: "none" | "light" | "moderate" | "strong";
  adjustmentDelta: number;
  boundaryGap: number;
  dampingFactor: number;
  actionBias: "tighten" | "hold" | "loosen";
  reversalCondition: string;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const resolveBasePostureLabel = (regime: RegimeKey) => REGIME_LABELS[regime];

const resolveSignalBias = (assessment: Pick<SectorAssessment, "scores" | "thresholds">) => {
  const tightnessBias = clamp((assessment.thresholds.tightnessRegime - assessment.scores.tightness) / 25, -1.5, 1.5);
  const riskBias = clamp((assessment.scores.riskAppetite - assessment.thresholds.riskAppetiteRegime) / 25, -1.5, 1.5);
  return { tightnessBias, riskBias };
};

const resolveBoundaryGap = (assessment: Pick<SectorAssessment, "scores" | "thresholds">) => {
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

const resolvePostureVariant = (delta: number): SectorAdjustedPosture["postureVariant"] => {
  if (delta >= 0.05) return "plus";
  if (delta <= -0.05) return "minus";
  return "neutral";
};

const formatAdjustedPostureLabel = (
  basePostureLabel: string,
  variant: SectorAdjustedPosture["postureVariant"],
) => {
  if (variant === "plus") return `${basePostureLabel}+`;
  if (variant === "minus") return `${basePostureLabel}-`;
  return `${basePostureLabel} (neutral)`;
};

const resolveActionBias = (delta: number): SectorAdjustedPosture["actionBias"] => {
  if (delta >= 0.08) return "loosen";
  if (delta <= -0.08) return "tighten";
  return "hold";
};

type SectorAssessment = {
  regime: RegimeAssessment["regime"];
  scores: Pick<RegimeAssessment["scores"], "tightness" | "riskAppetite">;
  thresholds: Pick<RegimeAssessment["thresholds"], "tightnessRegime" | "riskAppetiteRegime">;
};

const buildReversalCondition = (
  assessment: Pick<SectorAssessment, "scores" | "thresholds">,
  actionBias: SectorAdjustedPosture["actionBias"],
) => {
  if (actionBias === "hold") {
    return "Hold the base cadence unless either score moves 3 points or more past the line where conditions change.";
  }

  const nearestTightnessGap = Math.abs(assessment.scores.tightness - assessment.thresholds.tightnessRegime);
  const nearestRiskGap = Math.abs(assessment.scores.riskAppetite - assessment.thresholds.riskAppetiteRegime);
  const useTightness = nearestTightnessGap <= nearestRiskGap;

  /* The crossing still ahead, read from the side the score is on now, with the
     engine's sides (above the line is tight, or risk-on). Choosing it from the
     tilt alone printed "rises above 70" at a funding pressure of 73: a
     condition already met the week it was published. */
  if (useTightness) {
    const line = assessment.thresholds.tightnessRegime;
    const direction = assessment.scores.tightness > line ? "falls to or below" : "rises above";
    return `Drop the sector tilt if funding pressure ${direction} ${formatThresholdNumber(line)}.`;
  }

  const line = assessment.thresholds.riskAppetiteRegime;
  const direction = assessment.scores.riskAppetite > line ? "falls to or below" : "rises above";
  return `Drop the sector tilt if risk appetite ${direction} ${formatThresholdNumber(line)}.`;
};

export const deriveSectorAdjustedPosture = (
  baseAssessment: SectorAssessment,
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
  const postureVariant = resolvePostureVariant(adjustmentDelta);
  const adjustmentStrength = resolveStrength(Math.abs(adjustmentDelta));
  const actionBias = resolveActionBias(adjustmentDelta);
  const basePostureLabel = resolveBasePostureLabel(baseAssessment.regime);

  return {
    basePostureLabel,
    adjustedPostureLabel: formatAdjustedPostureLabel(basePostureLabel, postureVariant),
    postureVariant,
    adjustmentStrength,
    adjustmentDelta,
    boundaryGap,
    dampingFactor,
    actionBias,
    reversalCondition: buildReversalCondition(baseAssessment, actionBias),
  };
};
