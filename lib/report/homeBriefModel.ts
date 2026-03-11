import { buildCanonicalBoundedDecisionRules } from "./boundedDecisionRules";
import { buildActionStripItems, buildRoleAwareOperatingTemplates } from "./operatingCalls";
import { getSummaryArchive } from "../summary/summaryArchive";
import type { MacroSeriesReading } from "../types";
import { isImprovingSignalDelta } from "./reportData";
import { deltaLabelBySignal } from "./briefFormatting";
import type { HistoricalAnalog, ReportEvidenceItem } from "./reportData";
import {
  REGIME_SEVERITY_RANK,
  REGIME_SHORT_LABELS,
  deriveRegimeStage,
  getRegimeDisplayLabel,
  type RegimeConfidenceLabel,
  type RegimeMomentum,
} from "../regimePresentation";
import { deriveSectorAdjustedPosture, SECTOR_TAXONOMY, type SectorKey } from "./sectorSensitivity";
import {
  getTransitionVelocityEstimate,
  toForecastLabel,
  type ForecastModel,
  type TransitionVelocityEstimate,
} from "./forecastModel";
import {
  formatConfidencePlainLabel,
  formatRegimeSignalValue,
  formatTrendArrow,
  regimeSignalLabelByKey,
  type RegimeSignalKey,
} from "./reportFormatting";
import {
  buildFailureModeWarnings,
  type FailureModeWarning,
} from "./trustStatus";
import { buildWeeklyLockCommitment } from "./decisionKnobs";
import {
  buildScopedVariantDecisionAdjustment,
  startupVariantModes,
  type BoundedDecisionRule,
  type ScopedVariantDecisionAdjustment,
  type StartupVariantMode,
} from "./boundedDecisionRules";
import type { ActionStripItem, RoleAwareOperatingTemplate } from "./operatingCalls";
import type { TimeMachineRegimeEntry } from "../timeMachine/timeMachineCache";
import type { PostureStateContract } from "./postureStateContract";

type Regime = "SCARCITY" | "DEFENSIVE" | "VOLATILE" | "EXPANSION";

type HomeReportData = {
  fetchedAtLabel?: string;
  historicalSelection?: { month: number; year: number; banner: string } | null;
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
    anomalySignals?: Array<{
      reason: string;
    }>;
  };
  reportEvidenceItems?: ReportEvidenceItem[];
  macroSeries?: MacroSeriesReading[];
  forecast?: ForecastModel;
  historicalAnalogs?: HistoricalAnalog[];
  regimeSeries?: TimeMachineRegimeEntry[];
  treasuryProvenance?: { statusLabel?: string };
  treasury?: { fallback_at?: string | null; fallback_reason?: string | null };
  actionNowShort?: string;
  guardrailThreshold?: string;
  flipThreshold?: string;
  postureState?: PostureStateContract;
  [key: string]: unknown;
};

type MemoryRailItem = {
  label: string;
  posture: string;
};

type HistoricalTimelineItem = MemoryRailItem & {
  month?: number;
  year?: number;
  recordDate?: string;
  summary?: string;
  isCurrent?: boolean;
};


type WhyThisCallItem = {
  key?: "distance-to-regime-change" | "momentum" | "signal-reliability";
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

type BoundaryDimension = "tightness" | "riskAppetite";

type BoundaryDirection = "riseAbove" | "fallToOrBelow";

const movementDomainBySignal: Record<SignalChange["key"], number> = {
  tightness: 6,
  riskAppetite: 6,
  baseRate: 1.5,
  curveSlope: 1.5,
};


type HomeBriefHistoricalAnalog = {
  date: string;
  similarityScore: number;
  implication: string;
};

type MacroOverlayItem = {
  label: string;
  detail: string;
};


type RegimeSignalIndicator = {
  key: RegimeSignalKey;
  label: string;
  valueLabel: string;
  rawValue: number | null;
  trendArrow: "↑" | "↓" | "→";
  trendDeltaLabel: string;
  sparkline: number[];
  isFallback: boolean;
};

type HomeBriefFailureMode = FailureModeWarning;

export type DecisionMatrixColumnKey = "approve" | "delay" | "flip";

export type DecisionMatrixRowKey = "hiring" | "product" | "capital" | "burn";

export type DecisionMatrixCell = {
  text: string;
  detail: string;
};

export type DecisionMatrixRow = {
  key: DecisionMatrixRowKey;
  label: string;
  cells: Record<DecisionMatrixColumnKey, DecisionMatrixCell>;
};

export type DecisionMatrixPayload = {
  columns: Array<{ key: DecisionMatrixColumnKey; label: string }>;
  rows: DecisionMatrixRow[];
};

export type CanonicalFlipCondition = {
  area: BoundedDecisionRule["area"];
  metric: "tightness" | "riskAppetite";
  operator: ">" | ">=" | "<" | "<=";
  value: number;
  label: string;
};

export type StartupVariantOption = { mode: StartupVariantMode; label: string };

export type StartupVariantPolicy = {
  selectedMode: StartupVariantMode;
  options: StartupVariantOption[];
  adjustmentsByMode: Record<StartupVariantMode, ScopedVariantDecisionAdjustment>;
};

type ExecutiveOperationalStance = {
  expand: string[];
  avoid: string[];
};

const splitActionFragments = (value: string): string[] =>
  value
    .split(/(?<=[.;])\s+|\s+and\s+/gi)
    .map((item) => item.trim())
    .map((item) => item.replace(/[.;]+$/, "").trim())
    .filter((item) => item.length > 0);

const dedupeByStem = (items: string[]): string[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const stem = item.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!stem || seen.has(stem)) {
      return false;
    }
    seen.add(stem);
    return true;
  });
};

const compactMatrixText = (value: string, fallback: string) => {
  const normalized = value.trim();
  if (!normalized) {
    return fallback;
  }

  const [firstClause] = normalized.split(/[.;]/);
  return firstClause?.trim() || fallback;
};

const matrixRowConfig: Array<{ key: DecisionMatrixRowKey; label: string; area: BoundedDecisionRule["area"]; flipConditionIndex: number }> = [
  { key: "hiring", label: "Hiring", area: "hiring", flipConditionIndex: 0 },
  { key: "product", label: "Product", area: "product-tempo", flipConditionIndex: 1 },
  { key: "capital", label: "Capital", area: "capital-raising", flipConditionIndex: 1 },
  { key: "burn", label: "Burn", area: "burn-discipline", flipConditionIndex: 2 },
];

export const buildDecisionMatrixPayload = ({
  regime,
  thresholds,
  decisionRules,
  confidenceDegraded,
  freshnessDegraded,
}: {
  regime: Regime;
  thresholds: HomeReportData["assessment"]["thresholds"];
  decisionRules: BoundedDecisionRule[];
  confidenceDegraded: boolean;
  freshnessDegraded: boolean;
}): DecisionMatrixPayload => {
  const rulesByArea = new Map(decisionRules.map((rule) => [rule.area, rule]));
  const lockCommitment = buildWeeklyLockCommitment({
    regime,
    tightnessRegime: thresholds.tightnessRegime,
    riskAppetiteRegime: thresholds.riskAppetiteRegime,
    confidenceDegraded,
    freshnessDegraded,
  });

  const rows: DecisionMatrixRow[] = matrixRowConfig.map(({ key, label, area, flipConditionIndex }) => {
    const rule = rulesByArea.get(area);
    const fallbackApprove = "Stage approvals on short-cycle proof";
    const fallbackDelay = "Delay irreversible commitments";
    const structuredFlipCondition = rule?.flipConditions[0]?.label ?? "";
    const fallbackFlipCondition = lockCommitment.flipConditions[flipConditionIndex] ?? lockCommitment.flipConditions[0] ?? "Recheck thresholds on next refresh.";
    const flipSummary = structuredFlipCondition || rule?.resumeTrigger || fallbackFlipCondition;
    const flipDetail = [rule?.resumeTrigger, structuredFlipCondition, !rule ? fallbackFlipCondition : ""]
      .filter((entry): entry is string => Boolean(entry && entry.trim().length > 0))
      .join(" ")
      .trim();

    return {
      key,
      label,
      cells: {
        approve: {
          text: compactMatrixText(rule?.doNow[0] ?? "", fallbackApprove),
          detail: rule?.rationale ?? "Use current posture until signal quality improves.",
        },
        delay: {
          text: compactMatrixText(rule?.avoidNow[0] ?? "", fallbackDelay),
          detail: rule?.pauseTrigger ?? "Pause if macro confidence degrades or thresholds weaken.",
        },
        flip: {
          text: compactMatrixText(flipSummary, "Flip only after threshold recovery"),
          detail: flipDetail || "Resume only with sustained threshold recovery.",
        },
      },
    };
  });

  return {
    columns: [
      { key: "approve", label: "Approve" },
      { key: "delay", label: "Delay" },
      { key: "flip", label: "Flip" },
    ],
    rows,
  };
};

export const extractExecutiveOperationalStance = ({
  roleAwareTemplates,
  decisionRules,
  maxItemsPerList = 4,
}: {
  roleAwareTemplates: RoleAwareOperatingTemplate[];
  decisionRules: BoundedDecisionRule[];
  maxItemsPerList?: number;
}): ExecutiveOperationalStance => {
  const minItemsPerList = 2;
  const expandCandidates = [
    ...roleAwareTemplates.flatMap((template) => splitActionFragments(template.doNow)),
    ...decisionRules.map((rule) => rule.recommendation.trim().replace(/[.;]+$/, "")),
  ];
  const avoidCandidates = [
    ...roleAwareTemplates.flatMap((template) => splitActionFragments(template.avoidNow)),
    ...decisionRules.map((rule) => rule.pauseTrigger.trim().replace(/^Pause\s+/i, "").replace(/[.;]+$/, "")),
  ];

  const clampMax = Math.max(minItemsPerList, maxItemsPerList);
  const expand = dedupeByStem(expandCandidates).slice(0, clampMax);
  const avoid = dedupeByStem(avoidCandidates).slice(0, clampMax);

  return {
    expand: expand.slice(0, Math.max(minItemsPerList, expand.length)),
    avoid: avoid.slice(0, Math.max(minItemsPerList, avoid.length)),
  };
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

const buildWeeklyMovementMetric = ({
  severityDelta,
  changedSignals,
}: {
  severityDelta: number;
  changedSignals: SignalChange[];
}) => {
  const directionalPressure = changedSignals.reduce((sum, signal) => {
    const domain = movementDomainBySignal[signal.key] ?? 1;
    const normalizedMagnitude = Math.min(1, Math.abs(signal.delta) / domain);
    const direction = isImprovingSignalDelta(signal.key, signal.delta) ? -1 : 1;
    return sum + (normalizedMagnitude * direction);
  }, 0);

  const rawScore = severityDelta + directionalPressure;
  const score = Number(Math.max(-3, Math.min(3, rawScore)).toFixed(1));

  if (score >= 0.25) {
    return {
      score,
      direction: "defensive" as const,
      summary: `Model pressure increased by +${score.toFixed(1)} this week; tighten approvals until a reversal trigger prints.`,
    };
  }

  if (score <= -0.25) {
    return {
      score,
      direction: "expansionary" as const,
      summary: `Model pressure eased by ${score.toFixed(1)} this week; release only reversible bets while watching flip thresholds.`,
    };
  }

  return {
    score,
    direction: "neutral" as const,
    summary: "Model pressure is flat this week; hold posture and keep existing guardrails in force.",
  };
};

const buildSignalConfidenceReason = ({
  confidenceLabel,
  nearestThresholdGap,
  changedSignals,
}: {
  confidenceLabel: "LOW" | "MED" | "HIGH";
  nearestThresholdGap: number;
  changedSignals: Array<{ delta: number }>;
}) => {
  const boundaryDescriptor =
    nearestThresholdGap <= 5
      ? "regime boundary proximity"
      : nearestThresholdGap <= 12
        ? "moderate boundary distance"
        : "wide boundary distance";

  const hasPositiveMoves = changedSignals.some((signal) => signal.delta > 0);
  const hasNegativeMoves = changedSignals.some((signal) => signal.delta < 0);
  const directionalSplit = hasPositiveMoves && hasNegativeMoves;
  const volatilityDescriptor =
    changedSignals.length === 0
      ? "stable signal readings"
      : directionalSplit || changedSignals.length >= 3
        ? "volatile macro signals"
        : "broad agreement across signals";

  if (confidenceLabel === "LOW") {
    return `Reason: ${boundaryDescriptor} + ${volatilityDescriptor}`;
  }

  if (confidenceLabel === "MED") {
    return `Reason: ${boundaryDescriptor} with ${volatilityDescriptor}`;
  }

  return `Reason: ${volatilityDescriptor}; ${boundaryDescriptor}`;
};

const buildOperatingStanceLine = ({
  severityDelta,
  directionLabel,
  currentRegime,
}: {
  severityDelta: number;
  directionLabel: "improving" | "deteriorating" | "mixed" | "stable" | undefined;
  currentRegime: Regime;
}) => {
  const isExpansionRegime = currentRegime === "EXPANSION";

  if (severityDelta > 0 || directionLabel === "deteriorating") {
    return "Stage decisions. Avoid irreversible spend.";
  }

  if ((severityDelta < 0 || directionLabel === "improving") && isExpansionRegime) {
    return "Stage expansion. Keep approvals reversible.";
  }

  return "Hold approvals steady. Keep irreversible spend capped.";
};

const buildWeeklyMemoLines = ({
  operatingStanceLine,
  trendLabel,
  transitionWatch,
}: {
  operatingStanceLine: string;
  trendLabel: string;
  transitionWatch: "ON" | "OFF";
}) => [
  `Market conditions are ${trendLabel.toLowerCase()} this week.`,
  operatingStanceLine,
  transitionWatch === "ON"
    ? "Regime shift watch is on: stage approvals and preserve runway."
    : "Regime shift watch is off: hold current pace with bounded approvals.",
];

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

const buildHistoricalTimeline = ({
  currentRegime,
  regimeSeries,
  historicalSelection,
}: {
  currentRegime: Regime;
  regimeSeries?: TimeMachineRegimeEntry[];
  historicalSelection?: { month: number; year: number } | null;
}): HistoricalTimelineItem[] => {
  const selectedYear = historicalSelection?.year;
  const selectedMonth = historicalSelection?.month;
  const fallback = [{ label: "Current", posture: REGIME_SHORT_LABELS[currentRegime], isCurrent: true }];

  if (!regimeSeries || regimeSeries.length === 0) {
    return fallback;
  }

  const scopedSeries = regimeSeries
    .filter((entry) => {
      if (!selectedYear || !selectedMonth) {
        return true;
      }

      if (entry.year < selectedYear) {
        return true;
      }

      return entry.year === selectedYear && entry.month <= selectedMonth;
    })
    .slice(-8);

  if (scopedSeries.length === 0) {
    return fallback;
  }

  const currentKey = selectedYear && selectedMonth
    ? `${selectedYear}-${selectedMonth}`
    : `${scopedSeries[scopedSeries.length - 1]?.year}-${scopedSeries[scopedSeries.length - 1]?.month}`;

  return scopedSeries.map((entry) => {
    const labelDate = new Date(entry.recordDate);
    const isValidDate = !Number.isNaN(labelDate.valueOf());
    const label = isValidDate
      ? labelDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
      : entry.recordDate;

    return {
      label,
      posture: REGIME_SHORT_LABELS[entry.regime],
      month: entry.month,
      year: entry.year,
      recordDate: entry.recordDate,
      summary: entry.summary,
      isCurrent: `${entry.year}-${entry.month}` === currentKey,
    };
  });
};

const getMacroSeriesDelta = (macroSeries: MacroSeriesReading[] | undefined, id: MacroSeriesReading["id"]) => {
  const series = macroSeries?.find((reading) => reading.id === id);
  const latest = typeof series?.value === "number" ? series.value : null;
  const history = series?.history ?? [];
  const previousValue = history.length >= 2 ? history[history.length - 2]?.value : null;
  const previous = typeof previousValue === "number" ? previousValue : null;
  const delta =
    typeof latest === "number" && typeof previous === "number"
      ? latest - previous
      : null;

  return { latest, delta };
};

const signalSeriesByKey: Record<RegimeSignalKey, MacroSeriesReading["id"]> = {
  tightness: "FINANCIAL_CONDITIONS_INDEX",
  riskAppetite: "RISK_SENTIMENT_INDEX",
  baseRate: "FED_FUNDS_RATE",
  curveSlope: "YIELD_CURVE_10Y2Y",
};

const fallbackTrendDeltaByKey: Record<RegimeSignalKey, number | null> = {
  tightness: null,
  riskAppetite: null,
  baseRate: null,
  curveSlope: null,
};

const buildRegimeSignalIndicators = ({
  assessment,
  reportDynamics,
  macroSeries,
}: {
  assessment: HomeReportData["assessment"];
  reportDynamics: HomeReportData["reportDynamics"];
  macroSeries: MacroSeriesReading[] | undefined;
}): RegimeSignalIndicator[] => {
  const changedSignals = reportDynamics?.changedSignals ?? [];

  const resolveSparkline = (key: RegimeSignalKey): number[] => {
    if (key === "tightness") {
      return [assessment.thresholds.tightnessRegime, assessment.scores.tightness];
    }
    if (key === "riskAppetite") {
      return [assessment.thresholds.riskAppetiteRegime, assessment.scores.riskAppetite];
    }

    const series = macroSeries?.find((entry) => entry.id === signalSeriesByKey[key]);
    const historyValues = (series?.history ?? []).slice(-3).map((entry) => entry.value).filter((value): value is number => typeof value === "number");
    const latestValue = typeof series?.value === "number" ? [series.value] : [];
    const sparkline = [...historyValues, ...latestValue];
    return sparkline.length ? sparkline.slice(-4) : [];
  };

  const indicatorForSignal = (key: RegimeSignalKey): RegimeSignalIndicator => {
    if (key === "tightness" || key === "riskAppetite") {
      const rawValue = key === "tightness" ? assessment.scores.tightness : assessment.scores.riskAppetite;
      const changed = changedSignals.find((signal) => signal.key === key);
      const delta = changed?.delta ?? fallbackTrendDeltaByKey[key];
      return {
        key,
        label: regimeSignalLabelByKey[key],
        valueLabel: formatRegimeSignalValue(rawValue, key),
        rawValue,
        trendArrow: formatTrendArrow(delta),
        trendDeltaLabel: delta === null ? "No weekly delta" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} vs last week`,
        sparkline: resolveSparkline(key),
        isFallback: delta === null,
      };
    }

    const macroDelta = getMacroSeriesDelta(macroSeries, signalSeriesByKey[key]);
    return {
      key,
      label: regimeSignalLabelByKey[key],
      valueLabel: formatRegimeSignalValue(macroDelta.latest, key),
      rawValue: macroDelta.latest,
      trendArrow: formatTrendArrow(macroDelta.delta),
      trendDeltaLabel:
        macroDelta.delta === null ? "No weekly delta" : `${macroDelta.delta > 0 ? "+" : ""}${macroDelta.delta.toFixed(1)} vs last week`,
      sparkline: resolveSparkline(key),
      isFallback: macroDelta.latest === null || macroDelta.delta === null,
    };
  };

  return (["tightness", "riskAppetite", "baseRate", "curveSlope"] as const).map((key) => indicatorForSignal(key));
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
  const direction = improving ? "improving" : "deteriorating";
  return `${arrow} ${direction}`;
};

const describeSignalDirection = (
  signal: SignalChange,
): "improving" | "deteriorating" | "held" => {
  if (signal.delta === 0) {
    return "held";
  }

  return isImprovingSignalDelta(signal.key, signal.delta) ? "improving" : "deteriorating";
};

const boundaryDirectionForRegime = (
  regime: Regime,
  dimension: BoundaryDimension,
): BoundaryDirection => {
  if (dimension === "tightness") {
    return regime === "SCARCITY" || regime === "DEFENSIVE" ? "fallToOrBelow" : "riseAbove";
  }

  return regime === "EXPANSION" || regime === "DEFENSIVE" ? "fallToOrBelow" : "riseAbove";
};

const buildBoundaryTriggerText = ({
  targetRegimeLabel,
  dimension,
  threshold,
  current,
  direction,
}: {
  targetRegimeLabel: string;
  dimension: BoundaryDimension;
  threshold: number;
  current: number;
  direction: BoundaryDirection;
}) => {
  const dimensionLabel = dimension === "tightness" ? "tightness" : "risk appetite";
  const condition = direction === "riseAbove" ? "rises above" : "falls to or below";
  return `Flip to ${targetRegimeLabel} if ${dimensionLabel} ${condition} ${threshold.toFixed(1)} (now ${current.toFixed(1)}).`;
};

const buildMacroOverlay = (
  macroSeries: MacroSeriesReading[] | undefined,
  assessment: HomeReportData["assessment"],
  overlaySector: SectorKey,
): MacroOverlayItem[] => {
  const vcFunding = getMacroSeriesDelta(macroSeries, "VC_FUNDING_VELOCITY");
  const layoffs = getMacroSeriesDelta(macroSeries, "TECH_LAYOFF_TREND");
  const ipoWindow = getMacroSeriesDelta(macroSeries, "VIX_INDEX");
  const saasValuations = getMacroSeriesDelta(macroSeries, "SAAS_VALUATION_MULTIPLE");

  const sectorOverlay = deriveSectorAdjustedPosture(assessment, overlaySector);
  const sectorLabel = SECTOR_TAXONOMY[overlaySector].label;

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
    {
      label: `Sector sensitivity (${sectorLabel})`,
      detail:
        sectorOverlay.adjustmentStrength === "none"
          ? `${sectorOverlay.adjustedPostureLabel} (${sectorOverlay.postureVariant}); action bias: ${sectorOverlay.actionBias}.`
          : `${sectorOverlay.adjustedPostureLabel} (${sectorOverlay.adjustmentStrength} ${sectorOverlay.adjustmentDelta > 0 ? "upside" : "downside"} tilt, ${sectorOverlay.postureVariant}); action bias: ${sectorOverlay.actionBias}.`,
    },
  ];
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
      key: "distance-to-regime-change",
      label: "Distance to regime change",
      detail: `Nearest regime change trigger is ${nearestGap.toFixed(1)} points away (${boundaryLabel}).`,
    },
    {
      key: "momentum",
      label: "What moved this week",
      detail:
        reportDynamics?.changedSignals.length
          ? `${regimeSignalLabelByKey[changedSignal?.key ?? "tightness"]} ${changedSignal ? describeSignalDirection(changedSignal) : "held"} this week; ${reportDynamics.directionLabel} overall.`
          : "No material signal move this week; posture is driven by current levels and threshold distance.",
    },
    {
      key: "signal-reliability",
      label: "Signal reliability",
      detail: transitionWatch === "ON" ? "Transition watch is ON; check next release before irreversible commitments." : "Transition watch is OFF; signal set is stable for near-term planning.",
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

const buildPrimaryRiskLabel = ({
  failureModes,
  changedSignals,
}: {
  failureModes: HomeBriefFailureMode[];
  changedSignals: SignalChange[];
}) => {
  const dominantSignal = changedSignals
    .slice()
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];

  if (failureModes[0]) {
    return `Downside: ${failureModes[0].warning}`;
  }

  if (!dominantSignal || dominantSignal.delta === 0) {
    return "Neutral: no dominant directional risk this week.";
  }

  const signalLabel = deltaLabelBySignal[dominantSignal.key];
  const isImprovingMove = isImprovingSignalDelta(dominantSignal.key, dominantSignal.delta);

  if (!isImprovingMove) {
    return `Downside: ${signalLabel} tightened (${dominantSignal.delta.toFixed(1)}).`;
  }

  return `Upside: ${signalLabel} eased (${Math.abs(dominantSignal.delta).toFixed(1)}).`;
};

export const buildHomeBriefModel = (
  data: HomeReportData,
  options?: { overlaySector?: SectorKey; startupVariantMode?: StartupVariantMode },
) => {
  const {
    assessment,
    regimeAlert,
    stopItems,
    reportDynamics,
    recordDateLabel,
    macroSeries,
    forecast,
    historicalAnalogs,
    fetchedAtLabel,
    historicalSelection,
    regimeSeries,
    treasuryProvenance,
    treasury,
    actionNowShort,
    guardrailThreshold,
    flipThreshold,
    postureState,
  } = data;
  const overlaySector = options?.overlaySector ?? "b2b-saas";
  const startupVariantMode = options?.startupVariantMode ?? "series-a";
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

  const confidenceLabel: RegimeConfidenceLabel = nearestThresholdGap <= 5 ? "LOW" : nearestThresholdGap <= 12 ? "MED" : "HIGH";
  const transitionWatch: "ON" | "OFF" = nearestThresholdGap <= 8 || Boolean(regimeAlert) ? "ON" : "OFF";
  const confidencePercent = Math.max(35, Math.min(92, Math.round(55 + nearestThresholdGap * 3)));
  const signalConfidenceReason = buildSignalConfidenceReason({
    confidenceLabel,
    nearestThresholdGap,
    changedSignals: reportDynamics?.changedSignals ?? [],
  });
  const trendLabel =
    reportDynamics?.directionLabel === "improving"
      ? "Improving"
      : reportDynamics?.directionLabel === "deteriorating"
        ? "Deteriorating"
        : reportDynamics?.directionLabel === "mixed"
          ? "Mixed"
          : "Stable";
  const startupClimateIndex = buildStartupClimateIndex({ assessment, macroSeries, trendLabel });
  const operatingStanceLine = buildOperatingStanceLine({
    severityDelta,
    directionLabel: reportDynamics?.directionLabel,
    currentRegime: assessment.regime,
  });

  const failureModes: HomeBriefFailureMode[] = buildFailureModeWarnings({
    confidenceLabel,
    transitionWatch,
    freshnessLabel: fetchedAtLabel ?? "Unavailable",
    isFallbackSnapshot: Boolean(treasury?.fallback_at || treasury?.fallback_reason) && !historicalSelection,
    provenanceStatusLabel: treasuryProvenance?.statusLabel,
    changedSignals: reportDynamics?.changedSignals ?? [],
    anomalySignals: reportDynamics?.anomalySignals ?? [],
  });

  const displayRegime = getRegimeDisplayLabel({
    regime: assessment.regime,
    momentum: (reportDynamics?.directionLabel ?? "stable") as RegimeMomentum,
    confidence: confidenceLabel,
    transitionWatch: transitionWatch === "ON",
  });

  const stage = deriveRegimeStage({
    regime: assessment.regime,
    momentum: (reportDynamics?.directionLabel ?? "stable") as RegimeMomentum,
    confidence: confidenceLabel,
    distanceToFlip: nearestThresholdGap,
  });

  const reversalDimension: BoundaryDimension = tightnessGap <= riskGap ? "tightness" : "riskAppetite";
  const reversalDirection = boundaryDirectionForRegime(assessment.regime, reversalDimension);
  const reversalTrigger =
    reversalDimension === "tightness"
      ? buildBoundaryTriggerText({
        targetRegimeLabel: primaryShiftRegimeLabel,
        dimension: "tightness",
        threshold: tightnessThreshold,
        current: assessment.scores.tightness,
        direction: reversalDirection,
      })
      : buildBoundaryTriggerText({
        targetRegimeLabel: primaryShiftRegimeLabel,
        dimension: "riskAppetite",
        threshold: riskThreshold,
        current: assessment.scores.riskAppetite,
        direction: reversalDirection,
      });

  const regimeDistance: {
    dimensionLabel: string;
    dimensionKey: "tightness" | "riskAppetite";
    currentValue: number;
    thresholdValue: number;
    pointsToFlip: number;
    thresholdDirection: BoundaryDirection;
  } =
    reversalDimension === "tightness"
      ? {
          dimensionLabel: "Tightness",
          dimensionKey: "tightness",
          currentValue: assessment.scores.tightness,
          thresholdValue: tightnessThreshold,
          pointsToFlip: Math.abs(tightnessThreshold - assessment.scores.tightness),
          thresholdDirection: boundaryDirectionForRegime(assessment.regime, "tightness"),
        }
      : {
          dimensionLabel: "Risk appetite",
          dimensionKey: "riskAppetite",
          currentValue: assessment.scores.riskAppetite,
          thresholdValue: riskThreshold,
          pointsToFlip: Math.abs(assessment.scores.riskAppetite - riskThreshold),
          thresholdDirection: boundaryDirectionForRegime(assessment.regime, "riskAppetite"),
        };

  const likelyTransitionTarget = toForecastLabel(shiftTargets.defensive);
  const regimeVelocity: TransitionVelocityEstimate = getTransitionVelocityEstimate({
    from: toForecastLabel(assessment.regime),
    to: likelyTransitionTarget,
  });

  const normalizedHistoricalAnalogs: HomeBriefHistoricalAnalog[] = (historicalAnalogs ?? [])
    .slice(0, 3)
    .map((analog) => ({
      date: analog.recordDate,
      similarityScore: analog.score,
      implication: analog.implication,
    }));

  const guardrail = guardrailThreshold ?? stopItems[0] ?? "Do not approve irreversible commitments without trigger confirmation.";
  const decisionRules = buildCanonicalBoundedDecisionRules({
    regime: assessment.regime,
    thresholds: assessment.thresholds,
    scores: assessment.scores,
  });
  const startupVariantPolicy: StartupVariantPolicy = {
    selectedMode: startupVariantMode,
    options: startupVariantModes,
    adjustmentsByMode: {
      seed: buildScopedVariantDecisionAdjustment({ mode: "seed", thresholds: assessment.thresholds, scores: assessment.scores }),
      "series-a": buildScopedVariantDecisionAdjustment({ mode: "series-a", thresholds: assessment.thresholds, scores: assessment.scores }),
      "series-b": buildScopedVariantDecisionAdjustment({ mode: "series-b", thresholds: assessment.thresholds, scores: assessment.scores }),
      bootstrapped: buildScopedVariantDecisionAdjustment({ mode: "bootstrapped", thresholds: assessment.thresholds, scores: assessment.scores }),
    },
  };
  const roleAwareTemplates = buildRoleAwareOperatingTemplates(decisionRules);
  const actionStripItems: ActionStripItem[] = buildActionStripItems(decisionRules);
  const executiveOperationalStance = extractExecutiveOperationalStance({ roleAwareTemplates, decisionRules });

  const conciseActionNow = actionNowShort?.trim();
  const canonicalFlipConditions: CanonicalFlipCondition[] = decisionRules.flatMap((rule) =>
    rule.flipConditions.map((condition) => ({
      area: rule.area,
      metric: condition.metric,
      operator: condition.operator,
      value: condition.value,
      label: condition.label,
    })),
  );
  const compactFlipConditionLabels = canonicalFlipConditions
    .map((condition) => condition.label.trim())
    .filter((label) => label.length > 0)
    .filter((label, index, labels) => labels.indexOf(label) === index)
    .slice(0, 4);
  const conciseFlipThreshold = postureState?.whatFlipsNext.flipTrigger?.trim() || flipThreshold?.trim() || reversalTrigger || compactFlipConditionLabels[0];
  const decisionMatrix = buildDecisionMatrixPayload({
    regime: assessment.regime,
    thresholds: assessment.thresholds,
    decisionRules,
    confidenceDegraded: confidenceLabel === "LOW",
    freshnessDegraded: Boolean(treasury?.fallback_at || treasury?.fallback_reason),
  });
  const weeklyMovement = buildWeeklyMovementMetric({
    severityDelta,
    changedSignals: reportDynamics?.changedSignals ?? [],
  });

  const regimeSignalIndicators = buildRegimeSignalIndicators({
    assessment,
    reportDynamics,
    macroSeries,
  });

  const netConstraintSummary =
    severityDelta > 0
      ? `${displayRegime.label}. Changed: constraints tightened. Do now: ${conciseActionNow ?? "slow non-core approvals and keep irreversible spend frozen"}. Flip: ${conciseFlipThreshold}`
      : severityDelta < 0
        ? `${displayRegime.label}. Changed: constraints eased. Do now: ${conciseActionNow ?? "release selective hires and experiments that stay reversible"}. Flip: ${conciseFlipThreshold}`
        : `${displayRegime.label}. Changed: constraints held near prior week. Do now: ${conciseActionNow ?? "keep execution measured and irreversible bets capped"}. Flip: ${conciseFlipThreshold}`;

  return {
    postureLabel: displayRegime.label,
    stageLabel: stage.label,
    stageFragile: stage.fragile,
    postureWithStageLabel: `${displayRegime.label} — ${stage.displayLabel}`,
    confidenceLabel: postureState?.currentState.confidenceLabel ?? confidenceLabel,
    confidencePercent: postureState?.currentState.confidencePercent ?? confidencePercent,
    signalConfidenceReason,
    regimeHeader: {
      regime: displayRegime.label,
      confidence: formatConfidencePlainLabel(confidenceLabel),
      primaryRisk: buildPrimaryRiskLabel({
        failureModes,
        changedSignals: reportDynamics?.changedSignals ?? [],
      }),
    },
    trendLabel,
    regimeSignalIndicators,
    operatingStanceLine,
    weeklyMemoLines: buildWeeklyMemoLines({
      operatingStanceLine,
      trendLabel,
      transitionWatch,
    }),
    startupClimateIndex,
    regimeDistance,
    regimeVelocity,
    decisionShiftSummary: buildDecisionShiftSummary({
      severityDelta,
      directionLabel: reportDynamics?.directionLabel,
      changeCount: reportDynamics?.changedSignals.length ?? 0,
      reversalTrigger: conciseFlipThreshold,
    }),
    weeklyMovement,
    transitionProbabilities: forecast?.next4WeekProbabilities ?? {
      Expansion: 25,
      Mixed: 25,
      Scarcity: 25,
      Defensive: 25,
    },
    decisionRules,
    startupVariantPolicy,
    decisionMatrix,
    actionStripItems,
    roleAwareTemplates,
    executiveOperationalStance,
    revisitDecisions: (reportDynamics?.changedSignals.length ?? 0) > 0 && reportDynamics?.directionLabel !== "stable",
    guardrail,
    actionNowShort: conciseActionNow,
    guardrailThreshold: guardrail,
    flipThreshold: conciseFlipThreshold,
    lastCommittedChangeEvent: postureState?.lastCommittedChangeEvent ?? null,
    canonicalFlipConditions,
    compactFlipConditionLabels,
    historicalAnalogs: normalizedHistoricalAnalogs,
    memoryRail: buildMemoryRail(recordDateLabel, assessment.regime),
    historicalTimeline: buildHistoricalTimeline({ currentRegime: assessment.regime, regimeSeries, historicalSelection }),
    macroOverlay: buildMacroOverlay(macroSeries, assessment, overlaySector),
    evidenceItems: data.reportEvidenceItems ?? [],
    netConstraintSummary,
    postureDeltaLabel,
    reversalTrigger: conciseFlipThreshold,
    transitionWatch,
    failureModes,
    whyThisCall: buildWhyThisCall({
      tightnessGap,
      riskGap,
      reportDynamics,
      transitionWatch,
    }),
  };
};
