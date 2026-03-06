import { deriveDecisionKnobs } from "./decisionKnobs";
import { operatingCallsByRegime } from "./operatingCalls";
type HomeReportData = {
  assessment: {
    regime: "SCARCITY" | "DEFENSIVE" | "VOLATILE" | "EXPANSION";
    thresholds: { tightnessRegime: number; riskAppetiteRegime: number };
    scores: { tightness: number; riskAppetite: number };
  };
  regimeAlert: { previousRegime: "SCARCITY" | "DEFENSIVE" | "VOLATILE" | "EXPANSION" } | null;
  stopItems: string[];
  reportDynamics?: {
    directionLabel: "improving" | "deteriorating" | "mixed" | "stable";
    changedSignals: Array<{ delta: number }>;
  };
  [key: string]: unknown;
};

const regimeLabelMap = {
  SCARCITY: "Scarcity",
  DEFENSIVE: "Defensive",
  VOLATILE: "Mixed",
  EXPANSION: "Expansion",
} as const;

const regimeShiftTargets = {
  SCARCITY: {
    defensive: "DEFENSIVE",
  },
  DEFENSIVE: {
    defensive: "SCARCITY",
  },
  VOLATILE: {
    defensive: "SCARCITY",
  },
  EXPANSION: {
    defensive: "DEFENSIVE",
  },
} as const;

const regimeSeverityRank: Record<keyof typeof regimeLabelMap, number> = {
  EXPANSION: 0,
  VOLATILE: 1,
  DEFENSIVE: 2,
  SCARCITY: 3,
};

const expansionWindowByRegime: Record<keyof typeof regimeLabelMap, string> = {
  SCARCITY: "Closed",
  DEFENSIVE: "Mostly closed",
  VOLATILE: "Selective",
  EXPANSION: "Open with guardrails",
};

const longCycleBetByRegime: Record<keyof typeof regimeLabelMap, string> = {
  SCARCITY: "Constrained",
  DEFENSIVE: "Constrained",
  VOLATILE: "Caution",
  EXPANSION: "Permitted with milestones",
};

const expansionConstraintByRegime: Record<keyof typeof regimeLabelMap, string> = {
  SCARCITY: "avoid new expansion initiatives",
  DEFENSIVE: "avoid new expansion initiatives",
  VOLATILE: "stage expansion initiatives",
  EXPANSION: "pursue expansion initiatives selectively",
};

export const buildHomeBriefModel = (data: HomeReportData) => {
  const { assessment, regimeAlert, stopItems, reportDynamics } = data;
  const previousRegime = regimeAlert?.previousRegime;
  const severityDelta = previousRegime
    ? regimeSeverityRank[assessment.regime] - regimeSeverityRank[previousRegime]
    : 0;
  const postureDeltaLabel =
    severityDelta > 0
      ? "Worse than last week"
      : severityDelta < 0
        ? "Better than last week"
        : "No worse than last week";

  const operatingCalls = operatingCallsByRegime[assessment.regime];
  const expansionWindow = expansionWindowByRegime[assessment.regime];
  const longCycleBetStance = longCycleBetByRegime[assessment.regime];
  const tightnessThreshold = assessment.thresholds.tightnessRegime;
  const riskThreshold = assessment.thresholds.riskAppetiteRegime;
  const tightnessGap = Math.abs(assessment.scores.tightness - tightnessThreshold);
  const riskGap = Math.abs(assessment.scores.riskAppetite - riskThreshold);
  const nearestThresholdGap = Math.min(tightnessGap, riskGap);
  const shiftTargets = regimeShiftTargets[assessment.regime];
  const primaryShiftRegimeLabel = regimeLabelMap[shiftTargets.defensive];
  const confidenceLabel: "LOW" | "MED" | "HIGH" = nearestThresholdGap <= 5 ? "LOW" : nearestThresholdGap <= 12 ? "MED" : "HIGH";
  const transitionWatch: "ON" | "OFF" = nearestThresholdGap <= 8 || Boolean(regimeAlert) ? "ON" : "OFF";
  const reversalTrigger =
    tightnessGap <= riskGap
      ? `Flip to ${primaryShiftRegimeLabel} if tightness crosses ${tightnessThreshold.toFixed(1)} (now ${assessment.scores.tightness.toFixed(1)}).`
      : `Flip to ${primaryShiftRegimeLabel} if risk appetite crosses ${riskThreshold.toFixed(1)} (now ${assessment.scores.riskAppetite.toFixed(1)}).`;
  const dangerousCategory =
    assessment.regime === "EXPANSION"
      ? "Unchecked spend growth without payback controls"
      : assessment.regime === "VOLATILE"
        ? "Irreversible multi-quarter commitments"
        : "Net-new hiring and long-payback expansion bets";
  const constraints = [
    `Expansion: ${expansionConstraintByRegime[assessment.regime]} (${expansionWindow.toLowerCase()})`,
    `Hiring: restrict to critical roles (${operatingCalls.hiring.toLowerCase()})`,
    `Long bets: defer unless reversible (${longCycleBetStance.toLowerCase()})`,
  ];
  const guardrail = stopItems[0] ?? "Do not approve irreversible commitments without trigger confirmation.";

  const weakSignalCount = reportDynamics?.changedSignals.filter((item) => item.delta < 0).length ?? 0;
  const netConstraintSummary =
    severityDelta > 0
      ? `${regimeLabelMap[assessment.regime]} with tighter controls: threshold proximity and weakening signals require slower approvals and stricter reversibility.`
      : severityDelta < 0
        ? `${regimeLabelMap[assessment.regime]} with selective release: improving momentum supports faster execution while guardrails remain active.`
        : `${regimeLabelMap[assessment.regime]} with caution: keep execution balanced because threshold proximity and mixed signals still constrain irreversible bets.`;

  return {
    confidenceLabel,
    constraints,
    dangerousCategory,
    decisionKnobs: deriveDecisionKnobs(assessment.regime, severityDelta, {
      nearestThresholdGap,
      weakSignalCount,
    }),
    guardrail,
    netConstraintSummary,
    postureDeltaLabel,
    reversalTrigger,
    transitionWatch,
  };
};
