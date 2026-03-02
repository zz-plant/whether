import type { RegimeAssessment } from "./regimeEngine";

export type ChecklistInput = {
  evidenceStrength: "low" | "medium" | "high";
  reversibility: "hard" | "moderate" | "easy";
  blastRadius: "large" | "medium" | "small";
  strategicAlignment: "low" | "medium" | "high";
};

export type ShipVerdict = "go" | "wait" | "kill";

const valueMap = {
  low: 0,
  medium: 1,
  high: 2,
  hard: 0,
  moderate: 1,
  easy: 2,
  large: 0,
  small: 2,
} as const;

const regimeRiskPenalty: Record<RegimeAssessment["regime"], number> = {
  SCARCITY: 2,
  DEFENSIVE: 1,
  VOLATILE: 1,
  EXPANSION: 0,
};

export const scoreWhetherToShipChecklist = (input: ChecklistInput, assessment: RegimeAssessment) => {
  const baseScore =
    valueMap[input.evidenceStrength] +
    valueMap[input.reversibility] +
    valueMap[input.blastRadius] +
    valueMap[input.strategicAlignment];

  const adjustedScore = baseScore - regimeRiskPenalty[assessment.regime];

  let verdict: ShipVerdict = "wait";
  if (adjustedScore >= 6) {
    verdict = "go";
  } else if (adjustedScore <= 2) {
    verdict = "kill";
  }

  const reasons = [
    `Current regime is ${assessment.regime.toLowerCase()}, which applies a ${regimeRiskPenalty[assessment.regime]}-point caution penalty.`,
    `Evidence strength is ${input.evidenceStrength}; reversibility is ${input.reversibility}.`,
    `Blast radius is ${input.blastRadius}; strategic alignment is ${input.strategicAlignment}.`,
  ];

  const reversalTrigger =
    verdict === "go"
      ? "Pause if risk appetite drops below threshold or tightness rises above threshold on next refresh."
      : "Re-run when evidence moves to high and blast radius or reversibility improves by one level.";

  return {
    verdict,
    adjustedScore,
    reasons,
    reversalTrigger,
  };
};
