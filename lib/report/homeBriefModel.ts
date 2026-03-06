import { buildCanonicalBoundedDecisionRules } from "./boundedDecisionRules";
import { getSummaryArchive } from "../summary/summaryArchive";
import type { MacroSeriesReading } from "../types";
import { isImprovingSignalDelta } from "./reportData";

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
  macroSeries?: MacroSeriesReading[];
  [key: string]: unknown;
};

type MemoryRailItem = {
  label: string;
  posture: string;
};

type PrimaryDriverItem = {
  label: string;
  detail: string;
};

type WhyThisCallItem = {
  label: string;
  detail: string;
};

type SignalChange = {
  key: "tightness" | "riskAppetite" | "baseRate" | "curveSlope";
  delta: number;
};

type StartupClimateIndex = {
  score: number;
  status: "Improving" | "Stable" | "Deteriorating";
  breakdown: Array<{ label: string; score: number }>;
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

const buildPrimaryDrivers = ({
  reportDynamics,
  confidenceLabel,
  transitionWatch,
}: {
  reportDynamics: HomeReportData["reportDynamics"];
  confidenceLabel: "LOW" | "MED" | "HIGH";
  transitionWatch: "ON" | "OFF";
}): PrimaryDriverItem[] => {
  const directionalDrivers = (reportDynamics?.changedSignals ?? []).slice(0, 3).map((signal) => {
    const direction = describeSignalMomentum(signal);
    const directionArrow = signal.delta > 0 ? "↑" : signal.delta < 0 ? "↓" : "→";
    return {
      label: signalReasonLabel[signal.key],
      detail: `${directionArrow} ${direction} this week`,
    };
  });

  const reliabilityDriver: PrimaryDriverItem = {
    label: "Signal reliability",
    detail:
      confidenceLabel === "LOW"
        ? "Low confidence near regime boundaries; keep irreversible bets paused."
        : confidenceLabel === "MED"
          ? "Medium confidence; ship reversible actions with explicit stop triggers."
          : "High confidence; increase execution speed while preserving guardrails.",
  };

  const watchDriver: PrimaryDriverItem = {
    label: "Transition watch",
    detail:
      transitionWatch === "ON"
        ? "ON — reassess next read before escalating fixed-cost commitments."
        : "OFF — current posture is stable for near-term planning cadence.",
  };

  return [...directionalDrivers, reliabilityDriver, watchDriver].slice(0, 5);
};

const signalReasonLabel: Record<"tightness" | "riskAppetite" | "baseRate" | "curveSlope", string> = {
  tightness: "Capital tightness",
  riskAppetite: "Risk appetite",
  baseRate: "Base rate",
  curveSlope: "Yield curve slope",
};

const describeSignalMomentum = (
  signal: SignalChange,
): "tightened" | "eased" | "held" => {
  if (signal.delta === 0) {
    return "held";
  }

  return isImprovingSignalDelta(signal.key, signal.delta) ? "eased" : "tightened";
};

const buildWhyThisCall = ({
  tightnessGap,
  riskGap,
  reportDynamics,
  transitionWatch,
}: {
  tightnessGap: number;
  riskGap: number;
  reportDynamics: HomeReportData["reportDynamics"];
  transitionWatch: "ON" | "OFF";
}): WhyThisCallItem[] => {
  const nearestGap = Math.min(tightnessGap, riskGap);
  const boundaryLabel = nearestGap <= 5 ? "near threshold" : nearestGap <= 12 ? "within monitor range" : "well outside threshold";
  const changedSignal = reportDynamics?.changedSignals[0];

  return [
    {
      label: "Boundary distance",
      detail: `Nearest regime boundary is ${nearestGap.toFixed(1)} points away (${boundaryLabel}).`,
    },
    {
      label: "Momentum",
      detail:
        reportDynamics?.changedSignals.length
          ? `${signalReasonLabel[changedSignal?.key ?? "tightness"]} ${changedSignal ? describeSignalMomentum(changedSignal) : "held"} this week; ${reportDynamics.directionLabel} overall.`
          : "No material signal deltas this week; call is carried by level and threshold distance.",
    },
    {
      label: "Reliability",
      detail: transitionWatch === "ON" ? "Transition watch is ON; re-check next read before irreversible commitments." : "Transition watch is OFF; current posture is stable for near-term planning.",
    },
  ];
};

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const findMacroValue = (macroSeries: MacroSeriesReading[] | undefined, id: MacroSeriesReading["id"]): number | null =>
  macroSeries?.find((series) => series.id === id)?.value ?? null;

const buildStartupClimateIndex = ({
  assessment,
  macroSeries,
  trendLabel,
}: {
  assessment: HomeReportData["assessment"];
  macroSeries: MacroSeriesReading[] | undefined;
  trendLabel: "Improving" | "Deteriorating" | "Mixed" | "Stable";
}): StartupClimateIndex => {
  const capitalAvailability = clampScore((100 - assessment.scores.tightness) * 0.6 + assessment.scores.riskAppetite * 0.4);
  const unemployment = findMacroValue(macroSeries, "UNEMPLOYMENT_RATE");
  const hiringMarket = clampScore(unemployment === null ? 55 : 100 - unemployment * 10);
  const saasMultiple = findMacroValue(macroSeries, "SAAS_VALUATION_MULTIPLE");
  const valuations = clampScore(saasMultiple === null ? 55 : Math.min(100, saasMultiple * 8));
  const vix = findMacroValue(macroSeries, "VIX_INDEX");
  const ipoWindow = clampScore(vix === null ? 50 : 100 - vix * 2);

  const breakdown = [
    { label: "Capital availability", score: capitalAvailability },
    { label: "Hiring market", score: hiringMarket },
    { label: "SaaS valuations", score: valuations },
    { label: "IPO window", score: ipoWindow },
  ];

  const score = clampScore(breakdown.reduce((sum, item) => sum + item.score, 0) / breakdown.length);
  return {
    score,
    status: trendLabel === "Mixed" ? "Stable" : trendLabel,
    breakdown,
  };
};

export const buildHomeBriefModel = (data: HomeReportData) => {
  const { assessment, regimeAlert, stopItems, reportDynamics, recordDateLabel, macroSeries } = data;
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
  const confidencePercent = Math.max(35, Math.min(92, Math.round(55 + nearestThresholdGap * 3)));
  const trendLabel =
    reportDynamics?.directionLabel === "improving"
      ? "Improving"
      : reportDynamics?.directionLabel === "deteriorating"
        ? "Deteriorating"
        : reportDynamics?.directionLabel === "mixed"
          ? "Mixed"
          : "Stable";
  const startupClimateIndex = buildStartupClimateIndex({ assessment, macroSeries, trendLabel });

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
    confidencePercent,
    trendLabel,
    startupClimateIndex,
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
    primaryDrivers: buildPrimaryDrivers({ reportDynamics, confidenceLabel, transitionWatch }),
    netConstraintSummary,
    postureDeltaLabel,
    reversalTrigger,
    transitionWatch,
    whyThisCall: buildWhyThisCall({
      tightnessGap,
      riskGap,
      reportDynamics,
      transitionWatch,
    }),
  };
};
