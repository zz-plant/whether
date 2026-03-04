import type { RegimeKey } from "../regimeEngine";

const regimeShiftTargets: Record<RegimeKey, RegimeKey> = {
  SCARCITY: "DEFENSIVE",
  DEFENSIVE: "SCARCITY",
  VOLATILE: "SCARCITY",
  EXPANSION: "DEFENSIVE",
};

const expansionConstraintByRegime: Record<RegimeKey, string> = {
  SCARCITY: "avoid new expansion initiatives",
  DEFENSIVE: "avoid new expansion initiatives",
  VOLATILE: "stage expansion initiatives",
  EXPANSION: "pursue expansion initiatives selectively",
};

const dangerousCategoryByRegime: Record<RegimeKey, string> = {
  SCARCITY: "Net-new hiring and long-payback expansion bets",
  DEFENSIVE: "Net-new hiring and long-payback expansion bets",
  VOLATILE: "Irreversible multi-quarter commitments",
  EXPANSION: "Unchecked spend growth without payback controls",
};

export const buildWeeklyCall = ({
  regime,
  stopItems,
  expansionWindow,
  hiringConstraint,
  longCycleBetStance,
  tightnessThreshold,
  riskThreshold,
  tightnessScore,
  riskAppetiteScore,
}: {
  regime: RegimeKey;
  stopItems: string[];
  expansionWindow: string;
  hiringConstraint: string;
  longCycleBetStance: string;
  tightnessThreshold: number;
  riskThreshold: number;
  tightnessScore: number;
  riskAppetiteScore: number;
}) => {
  const flipRegime = regimeShiftTargets[regime];
  const tightnessGap = Math.abs(tightnessScore - tightnessThreshold);
  const riskGap = Math.abs(riskAppetiteScore - riskThreshold);
  const flipTrigger =
    tightnessGap <= riskGap
      ? `Flip to ${flipRegime} if tightness crosses ${tightnessThreshold.toFixed(1)} (now ${tightnessScore.toFixed(1)}).`
      : `Flip to ${flipRegime} if risk appetite crosses ${riskThreshold.toFixed(1)} (now ${riskAppetiteScore.toFixed(1)}).`;

  return {
    avoidThisWeek: {
      headline: dangerousCategoryByRegime[regime],
      rationale: "Delay large hiring or expansion commitments until conditions improve.",
    },
    guardrail: stopItems[0] ?? "Do not approve irreversible commitments without trigger confirmation.",
    flipTrigger,
    rulesOfEngagement: [
      `Expansion: ${expansionConstraintByRegime[regime]} (${expansionWindow.toLowerCase()})`,
      `Hiring: restrict to critical roles (${hiringConstraint.toLowerCase()})`,
      `Long bets: defer unless reversible (${longCycleBetStance.toLowerCase()})`,
    ],
  };
};

