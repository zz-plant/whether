import type { RegimeAssessment } from "./regimeEngine";
import { deriveSectorAdjustedPosture, SECTOR_TAXONOMY } from "./report/sectorSensitivity";

export type TeamContextProfile = {
  stage: "seed" | "series-a" | "growth" | "public";
  sector: "b2b-saas" | "consumer" | "infrastructure";
  teamSize: "small" | "mid" | "large";
};

const stageNudge = {
  seed: "Protect runway while preserving discovery velocity.",
  "series-a": "Prioritize repeatable GTM learning over broad expansion.",
  growth: "Scale proven loops while tightening operational discipline.",
  public: "Bias toward predictability and cross-functional execution reliability.",
} as const;

const sectorNudge = {
  "b2b-saas": "Anchor roadmap on retention and measurable payback while preserving optionality for reversible expansion bets.",
  consumer: "Favor habit-forming loops with low-cost experimentation tied to weekly conversion signals.",
  infrastructure: "Emphasize reliability, migration safety, and platform trust with explicit fixed-cost stage gates.",
} as const;

const sizeNudge = {
  small: "Keep scope narrow and decision cycles weekly.",
  mid: "Codify guardrails and reduce cross-team dependency risk.",
  large: "Use explicit ownership boundaries and staged rollout gates.",
} as const;

const overlayAction = {
  tighten: "Tighten approval gates now: require shorter payback windows and pause irreversible commitments until the next read confirms.",
  hold: "Hold base cadence: keep current approval speed and limit changes to reversible bets with explicit stop triggers.",
  loosen: "Loosen selectively: accelerate reversible expansion bets while preserving existing stop triggers and weekly review cadence.",
} as const;

export const buildPersonalizedMandate = (assessment: RegimeAssessment, profile: TeamContextProfile) => {
  const base = `Current regime: ${assessment.regime}. Tightness ${assessment.scores.tightness}/100 and risk appetite ${assessment.scores.riskAppetite}/100.`;
  const sectorOverlay = deriveSectorAdjustedPosture(assessment, profile.sector);
  const overlaySummary =
    sectorOverlay.adjustmentStrength === "none"
      ? `Sector overlay: ${SECTOR_TAXONOMY[profile.sector].label} remains aligned with base posture ${sectorOverlay.basePostureLabel}.`
      : `Sector overlay: ${SECTOR_TAXONOMY[profile.sector].label} reads as ${sectorOverlay.adjustedPostureLabel} (${sectorOverlay.adjustmentStrength} ${sectorOverlay.adjustmentDelta > 0 ? "upside" : "downside"} tilt, damping ${(sectorOverlay.dampingFactor * 100).toFixed(0)}%).`;

  return {
    headline: `${assessment.regime} mandate for ${profile.stage} ${profile.sector} teams`,
    recommendation: `${base} ${overlaySummary}`,
    sectorOverlay,
    tailoredActions: [
      stageNudge[profile.stage],
      `${sectorNudge[profile.sector]} Overlay posture: ${sectorOverlay.adjustedPostureLabel}. ${overlayAction[sectorOverlay.actionBias]}`,
      `${sizeNudge[profile.teamSize]} Reversal condition: ${sectorOverlay.reversalCondition}`,
    ],
  };
};
