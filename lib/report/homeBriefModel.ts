import { deriveDecisionKnobs } from "./decisionKnobs";
import { isImprovingSignalDelta } from "./reportData";
import { operatingCallsByRegime } from "./operatingCalls";

type Regime = "SCARCITY" | "DEFENSIVE" | "VOLATILE" | "EXPANSION";

type HomeReportData = {
  assessment: {
    regime: Regime;
    thresholds: { tightnessRegime: number; riskAppetiteRegime: number };
    scores: { tightness: number; riskAppetite: number };
  };
  regimeAlert: { previousRegime: Regime } | null;
  stopItems: string[];
  reportDynamics?: {
    directionLabel: "improving" | "deteriorating" | "mixed" | "stable";
    changedSignals: Array<{
      key: "tightness" | "riskAppetite" | "baseRate" | "curveSlope";
      delta: number;
    }>;
  };
  [key: string]: unknown;
};

export type BoundedDecision = {
  title: string;
  action: string;
  pauseIf: string;
  resumeWhen: string;
};

const regimeLabelMap = {
  SCARCITY: "Scarcity",
  DEFENSIVE: "Defensive",
  VOLATILE: "Mixed",
  EXPANSION: "Expansion",
} as const;

const regimeShiftTargets = {
  SCARCITY: { defensive: "DEFENSIVE" },
  DEFENSIVE: { defensive: "SCARCITY" },
  VOLATILE: { defensive: "SCARCITY" },
  EXPANSION: { defensive: "DEFENSIVE" },
} as const;

const regimeSeverityRank: Record<Regime, number> = {
  EXPANSION: 0,
  VOLATILE: 1,
  DEFENSIVE: 2,
  SCARCITY: 3,
};

const expansionWindowByRegime: Record<Regime, string> = {
  SCARCITY: "Closed",
  DEFENSIVE: "Mostly closed",
  VOLATILE: "Selective",
  EXPANSION: "Open with guardrails",
};

const longCycleBetByRegime: Record<Regime, string> = {
  SCARCITY: "Constrained",
  DEFENSIVE: "Constrained",
  VOLATILE: "Caution",
  EXPANSION: "Permitted with milestones",
};

const expansionConstraintByRegime: Record<Regime, string> = {
  SCARCITY: "avoid new expansion initiatives",
  DEFENSIVE: "avoid new expansion initiatives",
  VOLATILE: "stage expansion initiatives",
  EXPANSION: "pursue expansion initiatives selectively",
};

const buildDecisionShiftSummary = ({
  severityDelta,
  directionLabel,
  changeCount,
}: {
  severityDelta: number;
  directionLabel: "improving" | "deteriorating" | "mixed" | "stable" | undefined;
  changeCount: number;
}) => {
  if (changeCount === 0 || directionLabel === "stable") {
    return "No macro change this week. Continue last week’s posture.";
  }
  if (severityDelta < 0 || directionLabel === "improving") {
    return "Net decision shift: approval velocity ↑, experiment tolerance ↑, payback discipline unchanged.";
  }
  if (severityDelta > 0 || directionLabel === "deteriorating") {
    return "Net decision shift: approval velocity ↓, experiment tolerance ↓, payback discipline tighter.";
  }
  return "Net decision shift: hold approval velocity, keep reversible experiments active, maintain payback discipline.";
};

const buildLeadershipImplications = (regime: Regime): string[] => {
  if (regime === "EXPANSION") {
    return [
      "Move faster on reversible bets.",
      "Keep payback guardrails in place.",
      "Delay irreversible headcount commitments.",
    ];
  }
  if (regime === "VOLATILE") {
    return [
      "Sequence commitments by milestone gates.",
      "Prioritize fast-feedback experiments.",
      "Defer long-payback expansion bets.",
    ];
  }
  return [
    "Protect core roadmap and delivery capacity.",
    "Limit approvals to high-confidence return work.",
    "Pause large hiring/expansion commitments.",
  ];
};

const buildBoundedDecisions = ({
  regime,
  riskScore,
  riskThreshold,
  tightnessScore,
  tightnessThreshold,
}: {
  regime: Regime;
  riskScore: number;
  riskThreshold: number;
  tightnessScore: number;
  tightnessThreshold: number;
}): BoundedDecision[] => {
  if (regime === "EXPANSION") {
    return [
      {
        title: "Growth experiments",
        action: "Run incremental growth experiments this week.",
        pauseIf: "Pause if CAC payback exceeds 12 months.",
        resumeWhen: "Resume once CAC payback returns to ≤ 10 months.",
      },
      {
        title: "GTM hiring",
        action: "Expand GTM hiring for approved critical roles.",
        pauseIf: `Pause if risk appetite drops below ${riskThreshold.toFixed(1)} (now ${riskScore.toFixed(1)}).`,
        resumeWhen: `Resume when risk appetite rebounds above ${Math.max(riskThreshold + 2, riskScore - 1).toFixed(1)}.`,
      },
      {
        title: "Roadmap bets",
        action: "Advance reversible roadmap bets with milestone gates.",
        pauseIf: `Pause if tightness rises above ${tightnessThreshold.toFixed(1)} (now ${tightnessScore.toFixed(1)}).`,
        resumeWhen: `Resume when tightness normalizes below ${Math.max(tightnessThreshold - 3, 0).toFixed(1)}.`,
      },
    ];
  }

  return [
    {
      title: "Headcount approvals",
      action: "Approve only backfill or revenue-critical hiring.",
      pauseIf: `Pause all net-new hiring if tightness rises above ${tightnessThreshold.toFixed(1)}.`,
      resumeWhen: `Resume selective net-new hiring when tightness falls below ${Math.max(tightnessThreshold - 4, 0).toFixed(1)}.`,
    },
    {
      title: "Experiment portfolio",
      action: "Keep only experiments with measurable near-term revenue signals.",
      pauseIf: "Pause experiments if payback projection exceeds 9 months.",
      resumeWhen: "Resume staged tests once payback projection is ≤ 7 months.",
    },
    {
      title: "Expansion commitments",
      action: "Keep expansion initiatives milestone-gated and reversible.",
      pauseIf: `Pause expansion if risk appetite falls below ${riskThreshold.toFixed(1)}.`,
      resumeWhen: `Resume when risk appetite recovers above ${Math.max(riskThreshold + 3, 0).toFixed(1)} and milestones are met.`,
    },
  ];
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
  const weakSignalCount = reportDynamics?.changedSignals.filter((item) => !isImprovingSignalDelta(item.key, item.delta)).length ?? 0;

  const netConstraintSummary =
    severityDelta > 0
      ? `${regimeLabelMap[assessment.regime]} with tighter controls: threshold proximity and weakening signals require slower approvals and stricter reversibility.`
      : severityDelta < 0
        ? `${regimeLabelMap[assessment.regime]} with selective release: improving momentum supports faster execution while guardrails remain active.`
        : `${regimeLabelMap[assessment.regime]} with caution: keep execution balanced because threshold proximity and mixed signals still constrain irreversible bets.`;

  const decisionShiftSummary = buildDecisionShiftSummary({
    severityDelta,
    directionLabel: reportDynamics?.directionLabel,
    changeCount: reportDynamics?.changedSignals.length ?? 0,
  });

  return {
    confidenceLabel,
    constraints,
    dangerousCategory,
    decisionKnobs: deriveDecisionKnobs(assessment.regime, severityDelta, {
      nearestThresholdGap,
      weakSignalCount,
    }),
    decisionShiftSummary,
    guardrail,
    leadershipImplications: buildLeadershipImplications(assessment.regime),
    boundedDecisions: buildBoundedDecisions({
      regime: assessment.regime,
      riskScore: assessment.scores.riskAppetite,
      riskThreshold,
      tightnessScore: assessment.scores.tightness,
      tightnessThreshold,
    }),
    netConstraintSummary,
    postureDeltaLabel,
    reversalTrigger,
    transitionWatch,
  };
};
