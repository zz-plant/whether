import { buildCanonicalBoundedDecisionRules } from "./boundedDecisionRules";
import { getSummaryArchive } from "../summary/summaryArchive";
import type { MacroSeriesReading } from "../types";
import { isImprovingSignalDelta } from "./reportData";
import { REGIME_SEVERITY_RANK, REGIME_SHORT_LABELS } from "../regimePresentation";

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

type MacroOverlayItem = {
  label: string;
  detail: string;
};

const regimeShiftTargets = {
  SCARCITY: { defensive: "DEFENSIVE" },
  DEFENSIVE: { defensive: "SCARCITY" },
  VOLATILE: { defensive: "SCARCITY" },
  EXPANSION: { defensive: "DEFENSIVE" },
} as const;

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
      posture: REGIME_SHORT_LABELS[entry.summary.regime],
    }));

  return [
    ...priorEntries,
    {
      label: recordDateLabel ?? "Current",
      posture: REGIME_SHORT_LABELS[currentRegime],
    },
  ].slice(-4);
};

const resolveTimelineAnchorYear = (recordDateLabel: string | undefined): number => {
  const matchedYear = recordDateLabel?.match(/^(\d{4})/)?.[1];
  const parsedYear = matchedYear ? Number.parseInt(matchedYear, 10) : Number.NaN;

  return Number.isFinite(parsedYear) ? parsedYear : new Date().getUTCFullYear();
};

const buildHistoricalTimeline = (currentRegime: Regime, anchorYear: number): MemoryRailItem[] => {
  const yearlyEntries = getSummaryArchive()
    .filter((entry): entry is Extract<typeof entry, { cadence: "yearly" }> => entry.cadence === "yearly")
    .filter((entry) => entry.year <= anchorYear)
    .slice(-6)
    .map((entry) => ({
      label: String(entry.year),
      posture: REGIME_SHORT_LABELS[entry.summary.regime],
    }));

  const latestYear = yearlyEntries[yearlyEntries.length - 1]?.label;
  const currentEntryLabel = latestYear === String(anchorYear) ? latestYear : String(anchorYear);

  return [
    ...yearlyEntries,
    {
      label: currentEntryLabel,
      posture: REGIME_SHORT_LABELS[currentRegime],
    },
  ].slice(-7);
};

const getMacroSeriesDelta = (macroSeries: MacroSeriesReading[] | undefined, id: MacroSeriesReading["id"]) => {
  const series = macroSeries?.find((reading) => reading.id === id);
  const latest = series?.value;
  const history = series?.history ?? [];
  const previous = history.length >= 2 ? history[history.length - 2]?.value : null;
  const delta =
    typeof latest === "number" && typeof previous === "number"
      ? latest - previous
      : null;

  return { latest, delta };
};

const formatDelta = (value: number | null, positiveIsImproving: boolean) => {
  if (value === null || Number.isNaN(value)) {
    return "→ unchanged";
  }

  if (value === 0) {
    return "→ unchanged";
  }

  const improving = positiveIsImproving ? value > 0 : value < 0;
  const arrow = improving ? "↑" : "↓";
  const direction = improving ? "improving" : "tightening";
  return `${arrow} ${direction}`;
};

const buildMacroOverlay = (macroSeries: MacroSeriesReading[] | undefined): MacroOverlayItem[] => {
  const vcFunding = getMacroSeriesDelta(macroSeries, "VC_FUNDING_VELOCITY");
  const layoffs = getMacroSeriesDelta(macroSeries, "TECH_LAYOFF_TREND");
  const ipoWindow = getMacroSeriesDelta(macroSeries, "VIX_INDEX");
  const saasValuations = getMacroSeriesDelta(macroSeries, "SAAS_VALUATION_MULTIPLE");

  return [
    {
      label: "VC funding",
      detail: `${typeof vcFunding.latest === "number" ? vcFunding.latest.toFixed(1) : "n/a"} · ${formatDelta(vcFunding.delta, true)}`,
    },
    {
      label: "Startup layoffs",
      detail: `${typeof layoffs.latest === "number" ? layoffs.latest.toFixed(1) : "n/a"} · ${formatDelta(layoffs.delta, false)}`,
    },
    {
      label: "IPO window (VIX)",
      detail: `${typeof ipoWindow.latest === "number" ? ipoWindow.latest.toFixed(1) : "n/a"} · ${formatDelta(ipoWindow.delta, false)}`,
    },
    {
      label: "SaaS multiples",
      detail: `${typeof saasValuations.latest === "number" ? saasValuations.latest.toFixed(1) : "n/a"} · ${formatDelta(saasValuations.delta, true)}`,
    },
  ];
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
  const timelineAnchorYear = resolveTimelineAnchorYear(recordDateLabel);
  const previousRegime = regimeAlert?.previousRegime;
  const severityDelta = previousRegime
    ? REGIME_SEVERITY_RANK[assessment.regime] - REGIME_SEVERITY_RANK[previousRegime]
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
  const primaryShiftRegimeLabel = REGIME_SHORT_LABELS[shiftTargets.defensive];

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

  const regimeDistance =
    tightnessGap <= riskGap
      ? {
        dimensionLabel: "Tightness",
        currentValue: assessment.scores.tightness,
        thresholdValue: tightnessThreshold,
        pointsToFlip: tightnessThreshold - assessment.scores.tightness,
      }
      : {
        dimensionLabel: "Risk appetite",
        currentValue: assessment.scores.riskAppetite,
        thresholdValue: riskThreshold,
        pointsToFlip: assessment.scores.riskAppetite - riskThreshold,
      };

  const guardrail = stopItems[0] ?? "Do not approve irreversible commitments without trigger confirmation.";
  const netConstraintSummary =
    severityDelta > 0
      ? `${REGIME_SHORT_LABELS[assessment.regime]}. Changed: constraints tightened. Do now: slow non-core approvals and keep irreversible spend frozen. Flip: ${reversalTrigger}`
      : severityDelta < 0
        ? `${REGIME_SHORT_LABELS[assessment.regime]}. Changed: constraints eased. Do now: release selective hires and experiments that stay reversible. Flip: ${reversalTrigger}`
        : `${REGIME_SHORT_LABELS[assessment.regime]}. Changed: constraints held near prior week. Do now: keep execution measured and irreversible bets capped. Flip: ${reversalTrigger}`;

  return {
    confidenceLabel,
    confidencePercent,
    trendLabel,
    startupClimateIndex,
    regimeDistance,
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
    historicalTimeline: buildHistoricalTimeline(assessment.regime, timelineAnchorYear),
    macroOverlay: buildMacroOverlay(macroSeries),
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
