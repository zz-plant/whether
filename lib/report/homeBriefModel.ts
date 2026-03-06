import { buildCanonicalBoundedDecisionRules } from "./boundedDecisionRules";
import { getSummaryArchive } from "../summary/summaryArchive";

type Regime = "SCARCITY" | "DEFENSIVE" | "VOLATILE" | "EXPANSION";

type HomeReportData = {
  assessment: {
    regime: Regime;
    thresholds: { tightnessRegime: number; riskAppetiteRegime: number };
    scores: { tightness: number; riskAppetite: number };
  };
  regimeAlert: { previousRegime: Regime } | null;
  stopItems: string[];
  recordDateLabel?: string;
  reportDynamics?: {
    directionLabel: "improving" | "deteriorating" | "mixed" | "stable";
    changedSignals: Array<{
      key: "tightness" | "riskAppetite" | "baseRate" | "curveSlope";
      delta: number;
    }>;
  };
  [key: string]: unknown;
};

type MemoryRailItem = {
  label: string;
  posture: string;
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

const buildDecisionShiftSummary = ({
  severityDelta,
  directionLabel,
  changeCount,
  reversalTrigger,
}: {
  severityDelta: number;
  directionLabel: "improving" | "deteriorating" | "mixed" | "stable" | undefined;
  changeCount: number;
  reversalTrigger: string;
}) => {
  if (changeCount === 0 || directionLabel === "stable") {
    return `Changed: no material signal shift. Do now: keep approval pace and ship only commitments with clear payback windows. Flip: ${reversalTrigger}`;
  }
  if (severityDelta < 0 || directionLabel === "improving") {
    return `Changed: pressure eased versus last week. Do now: speed approvals for reversible bets and keep payback discipline explicit. Flip: ${reversalTrigger}`;
  }
  if (severityDelta > 0 || directionLabel === "deteriorating") {
    return `Changed: pressure rose versus last week. Do now: slow approvals, narrow experiments, and require tighter payback windows. Flip: ${reversalTrigger}`;
  }
  return `Changed: signals moved in opposite directions. Do now: hold approval pace and keep experiments reversible with explicit stop triggers. Flip: ${reversalTrigger}`;
};

const buildMemoryRail = (recordDateLabel: string | undefined, currentRegime: Regime): MemoryRailItem[] => {
  const weeklyEntries = getSummaryArchive().filter((entry) => entry.cadence === "weekly");

  const priorEntries = weeklyEntries
    .filter((entry) => (recordDateLabel ? entry.record_date !== recordDateLabel : true))
    .slice(-3)
    .map((entry) => ({
      label: entry.record_date,
      posture: regimeLabelMap[entry.summary.regime],
    }));

  return [
    ...priorEntries,
    {
      label: recordDateLabel ?? "Current",
      posture: regimeLabelMap[currentRegime],
    },
  ].slice(-4);
};

export const buildHomeBriefModel = (data: HomeReportData) => {
  const { assessment, regimeAlert, stopItems, reportDynamics, recordDateLabel } = data;
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

  const guardrail = stopItems[0] ?? "Do not approve irreversible commitments without trigger confirmation.";
  const netConstraintSummary =
    severityDelta > 0
      ? `${regimeLabelMap[assessment.regime]}. Changed: constraints tightened. Do now: slow non-core approvals and keep irreversible spend frozen. Flip: ${reversalTrigger}`
      : severityDelta < 0
        ? `${regimeLabelMap[assessment.regime]}. Changed: constraints eased. Do now: release selective hires and experiments that stay reversible. Flip: ${reversalTrigger}`
        : `${regimeLabelMap[assessment.regime]}. Changed: constraints held near prior week. Do now: keep execution measured and irreversible bets capped. Flip: ${reversalTrigger}`;

  return {
    confidenceLabel,
    decisionShiftSummary: buildDecisionShiftSummary({
      severityDelta,
      directionLabel: reportDynamics?.directionLabel,
      changeCount: reportDynamics?.changedSignals.length ?? 0,
      reversalTrigger,
    }),
    decisionRules: buildCanonicalBoundedDecisionRules({
      regime: assessment.regime,
      thresholds: assessment.thresholds,
      scores: assessment.scores,
    }),
    revisitDecisions: (reportDynamics?.changedSignals.length ?? 0) > 0 && reportDynamics?.directionLabel !== "stable",
    guardrail,
    memoryRail: buildMemoryRail(recordDateLabel, assessment.regime),
    netConstraintSummary,
    postureDeltaLabel,
    reversalTrigger,
    transitionWatch,
  };
};
