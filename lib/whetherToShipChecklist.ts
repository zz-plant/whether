import type { RegimeAssessment } from "./regimeEngine";
import { REGIME_LABELS } from "./regimePresentation";

type ChecklistInput = {
  evidenceStrength: "low" | "medium" | "high";
  reversibility: "hard" | "moderate" | "easy";
  blastRadius: "large" | "medium" | "small";
  strategicAlignment: "low" | "medium" | "high";
};

type ShipVerdict = "go" | "wait" | "kill";

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

const EVIDENCE_COPY: Record<ChecklistInput["evidenceStrength"], string> = {
  low: "The evidence behind this is thin",
  medium: "The evidence behind this is decent but not conclusive",
  high: "The evidence behind this is strong",
};

const REVERSIBILITY_COPY: Record<ChecklistInput["reversibility"], string> = {
  hard: "backing it out later would be painful",
  moderate: "backing it out later would take real work",
  easy: "backing it out later would be cheap",
};

const BLAST_RADIUS_COPY: Record<ChecklistInput["blastRadius"], string> = {
  large: "A bad outcome would spread across the business",
  medium: "A bad outcome would spill past the owning team",
  small: "A bad outcome would stay contained",
};

const ALIGNMENT_COPY: Record<ChecklistInput["strategicAlignment"], string> = {
  low: "it sits off the current strategy",
  medium: "it sits adjacent to the current strategy",
  high: "it sits squarely on the current strategy",
};

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

  const penalty = regimeRiskPenalty[assessment.regime];
  const reasons = [
    penalty === 0
      ? `${REGIME_LABELS[assessment.regime]} conditions add no caution penalty to this score.`
      : `${REGIME_LABELS[assessment.regime]} conditions cost this score ${penalty} point${penalty > 1 ? "s" : ""} of caution penalty.`,
    `${EVIDENCE_COPY[input.evidenceStrength]}, and ${REVERSIBILITY_COPY[input.reversibility]}.`,
    `${BLAST_RADIUS_COPY[input.blastRadius]}, and ${ALIGNMENT_COPY[input.strategicAlignment]}.`,
  ];

  const reversalTrigger =
    verdict === "go"
      ? "Pause this if risk appetite drops below its threshold, or funding pressure rises above its threshold, on the next refresh."
      : "Re-run this once the evidence reaches high and either blast radius or reversibility improves by one level.";

  return {
    verdict,
    adjustedScore,
    reasons,
    reversalTrigger,
  };
};
