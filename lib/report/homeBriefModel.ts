import { buildCanonicalBoundedDecisionRules } from "./boundedDecisionRules";
import { buildActionStripItems, buildRoleAwareOperatingTemplates } from "./operatingCalls";
import { getWeeklyPostureHistory } from "../summary/weeklyPostureHistory";
import type { MacroSeriesReading } from "../types";
import { resolveDistanceToFlip, resolveConfidencePercentFromDistance } from "./confidence";
import { isImprovingSignalDelta, type HistoricalAnalog, type ReportEvidenceItem } from "./reportData";
import { normalizeSignalContributions } from "./signalFormatting";
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
import { buildDecisionMatrixPayload } from "./homeBrief/decisionMatrix";
import { buildStartupClimateIndex, type StartupClimateIndex } from "./homeBrief/scoring";
import { buildPrimaryRiskLabel } from "./homeBrief/risk";
import { buildSignalInfluence, DEFAULT_THRESHOLDS, type RegimeKey } from "../regimeEngine";
import type { ConfidenceTrendFraming, ReportDynamics, WeeklyConfidencePoint } from "./reportData";
import type { CanonicalDecisionCopy } from "./canonicalDecisionCopy";
import type { ForecastRegimeLabel } from "./forecastModel";

/**
 * Loop stage owner: posture → decision.
 *
 * This module owns transformation from normalized report inputs into decision-ready
 * weekly brief models. It may depend on signal-normalized data + decision libraries,
 * but should not import React/UI components.
 */

export { buildDecisionMatrixPayload };

export type Regime = "SCARCITY" | "DEFENSIVE" | "VOLATILE" | "EXPANSION";

type HomeReportData = {
  fetchedAtLabel?: string;
  historicalSelection?: { month: number; year: number; banner: string } | null;
  assessment: {
    regime: Regime;
    thresholds: { tightnessRegime: number; riskAppetiteRegime: number };
    scores: { tightness: number; riskAppetite: number; baseRate?: number; curveSlope?: number | null };
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
    signalContributions?: ReportDynamics["signalContributions"];
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

type InputInfluenceTone = "warning" | "positive" | "neutral";

export type FlipRiskMeterState = {
  progressPercent: number;
  urgencyLabel: "Low" | "Medium" | "High" | "Unknown";
  detailLabel: string;
  triggerLabel: string;
};

export type InputInfluenceItem = {
  key: RegimeSignalKey;
  label: string;
  valueLabel: string;
  pressureLabel: string;
  effectDetail: string;
  influencePercent: number;
  influencePercentLabel: string;
  trendArrow: "↑" | "↓" | "→";
  trendLabel: string;
  watchLabel: string;
  tone: InputInfluenceTone;
};

type HomeBriefFailureMode = FailureModeWarning;

export type DecisionMatrixColumnKey = "approve" | "delay" | "flip";

export type DecisionMatrixRowKey = "hiring" | "product" | "capital" | "burn";

export type DecisionMatrixCell = {
  text: string;
  detail: string;
  action: string;
  threshold: string;
  reversal: string;
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

export type StartRouteDeltaRoute = "/signals" | "/operations" | "/decide";

export type StartRouteDeltaItem = {
  id: "posture-shift" | "top-driver" | "trigger-risk";
  label: string;
  detail: string;
  href: StartRouteDeltaRoute;
};

export type StartRouteDeltaBlock = {
  isReturningUser: boolean;
  hasMeaningfulDelta: boolean;
  fallbackCopy: string;
  items: StartRouteDeltaItem[];
};

export type WeeklyDecisionCardViewModel = {
  status: {
    statusLabel: string;
    regimeKey?: RegimeKey;
    postureLabel: string;
    stageLabel: string;
    postureWithStageLabel?: string;
    postureDelta: string;
    confidenceLabel: "HIGH" | "MED" | "LOW";
    confidencePercent: number;
    signalConfidenceReason: string;
    regimeHeader: {
      regime: string;
      confidence: string;
      primaryRisk: string;
    };
    trendLabel: string;
    confidenceHistory?: WeeklyConfidencePoint[];
    confidenceTrend?: ConfidenceTrendFraming;
    transitionWatch: "ON" | "OFF";
    isFallbackSnapshot?: boolean;
  };
  decision: {
    operatingStanceLine: string;
    weeklyMemoLines: string[];
    netConstraintSummary: string;
    guardrail: string;
    reversalTrigger: string;
    actionNowShort?: string;
    immediateDecision: string;
    guardrailThreshold?: string;
    flipThreshold?: string;
    compactFlipConditionLabels?: string[];
    canonicalDecisionCopy?: CanonicalDecisionCopy;
    canonicalFlipConditions?: CanonicalFlipCondition[];
    reportDynamics: ReportDynamics;
    decisionShiftSummary: string;
    transitionProbabilities: Record<ForecastRegimeLabel, number>;
    decisionRules: BoundedDecisionRule[];
    decisionMatrix?: DecisionMatrixPayload;
    startupVariantPolicy?: StartupVariantPolicy;
    actionStripItems?: ActionStripItem[];
    roleAwareTemplates: RoleAwareOperatingTemplate[];
    executiveOperationalStance: { expand: string[]; avoid: string[] };
    revisitDecisions: boolean;
    weeklyMovement: {
      score: number;
      direction: "defensive" | "expansionary" | "neutral";
      summary: string;
    };
  };
  presentation?: {
    whyItMattersLine?: string;
    readThisCardItems?: Array<{
      label: string;
      detail: string;
    }>;
    glossaryHref?: string;
  };
  diagnostics: {
    regimeSignalIndicators: RegimeSignalIndicator[];
    inputInfluence: InputInfluenceItem[];
    startupClimateIndex: StartupClimateIndex;
    regimeDistance: {
      dimensionLabel: string;
      dimensionKey: "tightness" | "riskAppetite";
      currentValue: number;
      thresholdValue: number;
      pointsToFlip: number;
      thresholdDirection: BoundaryDirection;
    };
    flipRiskMeter: FlipRiskMeterState;
    regimeVelocity: TransitionVelocityEstimate;
    whyThisCall: WhyThisCallItem[];
    evidenceItems: ReportEvidenceItem[];
    failureModes?: HomeBriefFailureMode[];
  };
  history: {
    memoryRail: MemoryRailItem[];
    historicalTimeline: HistoricalTimelineItem[];
    historicalAnalogs: HomeBriefHistoricalAnalog[];
    macroOverlay: MacroOverlayItem[];
  };
  sinceLastReview: StartRouteDeltaBlock;
  artifact: {
    citation: string;
    recordDateLabel: string;
    fetchedAtLabel: string;
    freshnessLine?: string;
  };
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
  if (severityDelta > 0 || directionLabel === "deteriorating") {
    if (currentRegime === "SCARCITY") {
      return "Tighten to survival mode: approve only renewals, core delivery, and revenue-backed roles.";
    }
    if (currentRegime === "DEFENSIVE") {
      return "Tighten approvals around retention, margin, and revenue-linked work.";
    }
    if (currentRegime === "VOLATILE") {
      return "De-risk the call: ship reliability, trust, and short-payback releases.";
    }
    return "Keep expansion selective: add capacity only in proven demand lanes and keep rollback criteria explicit.";
  }

  if ((severityDelta < 0 || directionLabel === "improving") && currentRegime === "EXPANSION") {
    return "Press proven growth lanes and add capacity where demand is already converting.";
  }

  if (currentRegime === "SCARCITY") {
    return "Operate for cash survival: approve only renewals, core delivery, and revenue-backed roles.";
  }
  if (currentRegime === "DEFENSIVE") {
    return "Hold approvals steady around retention, margin, and revenue-linked work.";
  }
  if (currentRegime === "VOLATILE") {
    return "Operate for proof: ship reliability, trust, and short-payback releases.";
  }
  return "Press proven growth lanes and add capacity where demand is already converting.";
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
  trendLabel === "Stable"
    ? "Changed: no material signal shift this week."
    : `Changed: market conditions are ${trendLabel.toLowerCase()} this week.`,
  operatingStanceLine,
  transitionWatch === "ON"
    ? "Flip watch is on: keep hiring, roadmap, and spend decisions reversible until the next live read."
    : "Flip watch is off: keep this week's approvals on the current track.",
];

export const buildMemoryRail = (recordDateLabel: string | undefined, currentRegime: Regime): MemoryRailItem[] => {
  const priorEntries = getWeeklyPostureHistory()
    .filter((entry) => (recordDateLabel ? entry.record_date !== recordDateLabel : true))
    .slice(-3)
    .map((entry) => ({
      label: entry.record_date,
      posture: REGIME_SHORT_LABELS[entry.regime],
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

const signalSeriesByKey: Partial<Record<RegimeSignalKey, MacroSeriesReading["id"]>> = {
  tightness: "CHICAGO_FCI",
  riskAppetite: "VIX_INDEX",
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
    if (key === "baseRate") {
      return typeof assessment.scores.baseRate === "number"
        ? [DEFAULT_THRESHOLDS.baseRateTightness, assessment.scores.baseRate]
        : [];
    }
    if (key === "curveSlope") {
      return typeof assessment.scores.curveSlope === "number"
        ? [0, assessment.scores.curveSlope]
        : [];
    }

    const seriesId = signalSeriesByKey[key];
    const series = seriesId ? macroSeries?.find((entry) => entry.id === seriesId) : undefined;
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

    if (key === "baseRate" || key === "curveSlope") {
      const rawValue = key === "baseRate"
        ? (typeof assessment.scores.baseRate === "number" ? assessment.scores.baseRate : null)
        : (typeof assessment.scores.curveSlope === "number" ? assessment.scores.curveSlope : null);
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
        isFallback: rawValue === null || delta === null,
      };
    }

    const seriesId = signalSeriesByKey[key];
    const macroDelta = seriesId
      ? getMacroSeriesDelta(macroSeries, seriesId)
      : { latest: null, delta: null };
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

export const buildFlipRiskMeterState = (
  regimeDistance?: WeeklyDecisionCardViewModel["diagnostics"]["regimeDistance"],
): FlipRiskMeterState => {
  if (!regimeDistance || !Number.isFinite(regimeDistance.pointsToFlip)) {
    return {
      progressPercent: 8,
      urgencyLabel: "Unknown",
      detailLabel: "We need one more live update before we can size flip risk with confidence.",
      triggerLabel: "Flip trigger pending fresh data.",
    };
  }

  const pointsToFlip = Math.max(0, Math.round(regimeDistance.pointsToFlip));
  const clampedDistance = Math.min(pointsToFlip, 12);
  const progressPercent = Math.max(10, Math.round(((12 - clampedDistance) / 12) * 100));
  const triggerLabel = `${regimeDistance.dimensionLabel} ${regimeDistance.thresholdDirection === "riseAbove" ? "above" : "to or below"} ${regimeDistance.thresholdValue.toFixed(1)}.`;

  if (pointsToFlip <= 3) {
    return {
      progressPercent,
      urgencyLabel: "High",
      detailLabel: "We are close to a flip. Recheck major commitments before locking spend.",
      triggerLabel,
    };
  }

  if (pointsToFlip <= 6) {
    return {
      progressPercent,
      urgencyLabel: "Medium",
      detailLabel: "Flip risk is in play. Keep approvals reversible and review weekly.",
      triggerLabel,
    };
  }

  return {
    progressPercent,
    urgencyLabel: "Low",
    detailLabel: "There is room before a flip. Keep this week’s pace unless signals turn.",
    triggerLabel,
  };
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

const buildStartRouteDeltaBlock = ({
  currentRegime,
  regimeAlert,
  reportDynamics,
  evidenceItems,
  guardrail,
  reversalTrigger,
  failureModes,
  trendLabel,
  historicalTimeline,
}: {
  currentRegime: Regime;
  regimeAlert: HomeReportData["regimeAlert"];
  reportDynamics: HomeReportData["reportDynamics"];
  evidenceItems: ReportEvidenceItem[];
  guardrail: string;
  reversalTrigger: string;
  failureModes: HomeBriefFailureMode[];
  trendLabel: string;
  historicalTimeline: HistoricalTimelineItem[];
}): StartRouteDeltaBlock => {
  const isReturningUser = historicalTimeline.length >= 2;
  const changedSignals = reportDynamics?.changedSignals ?? [];
  const hasMeaningfulDelta = Boolean(regimeAlert) || changedSignals.length > 0;

  if (!isReturningUser) {
    return {
      isReturningUser: false,
      hasMeaningfulDelta: false,
      fallbackCopy: "First review this cycle. Start with the current posture call, then set your first bounded operating decision.",
      items: [],
    };
  }

  if (!hasMeaningfulDelta) {
    return {
      isReturningUser: true,
      hasMeaningfulDelta: false,
      fallbackCopy: "No significant delta since your last review. Hold posture, keep current guardrails, and monitor thresholds before changing plans.",
      items: [],
    };
  }

  const topDriver = changedSignals[0];
  const topDriverEvidence = topDriver
    ? evidenceItems.find((item) => item.key === topDriver.key)
    : evidenceItems[0];
  const topFailureMode = failureModes[0]?.warning;
  const items: StartRouteDeltaItem[] = [];

  if (regimeAlert) {
    items.push({
      id: "posture-shift",
      label: "Posture shift",
      detail: `Posture moved from ${REGIME_SHORT_LABELS[regimeAlert.previousRegime]} to ${REGIME_SHORT_LABELS[currentRegime]}. Re-check decision posture before committing irreversible work.`,
      href: "/decide",
    });
  }

  if (topDriver) {
    items.push({
      id: "top-driver",
      label: "Top driver change",
      detail: topDriverEvidence?.immediateImplication
        ? `${regimeSignalLabelByKey[topDriver.key]} ${describeSignalDirection(topDriver)}. ${topDriverEvidence.immediateImplication}`
        : `${regimeSignalLabelByKey[topDriver.key]} ${describeSignalDirection(topDriver)}; trend is ${trendLabel.toLowerCase()}.`,
      href: "/signals",
    });
  }

  items.push({
    id: "trigger-risk",
    label: "Trigger / risk change",
    detail: topFailureMode
      ? `${topFailureMode} Guardrail now: ${guardrail} Flip when: ${reversalTrigger}`
      : `Guardrail now: ${guardrail} Flip when: ${reversalTrigger}`,
    href: "/operations",
  });

  return {
    isReturningUser: true,
    hasMeaningfulDelta: true,
    fallbackCopy: "",
    items: items.slice(0, 3),
  };
};

const buildWhyItMattersLine = ({
  weeklyMovement,
}: {
  weeklyMovement: {
    direction: "defensive" | "expansionary" | "neutral";
  };
}) => {
  if (weeklyMovement.direction === "defensive") {
    return "Fixed-cost mistakes are getting more expensive, so long-payback bets now need harder proof and tighter approval discipline.";
  }

  if (weeklyMovement.direction === "expansionary") {
    return "Speed is getting safer, so teams can press proven demand lanes faster without dropping payback discipline.";
  }

  return "Even with a stable posture, the model is setting how fast teams hire, spend, and approve long-payback work this week.";
};

const buildReadThisCardItems = ({
  decisionShiftSummary,
  immediateDecision,
  reversalTrigger,
}: {
  decisionShiftSummary: string;
  immediateDecision: string;
  reversalTrigger: string;
}) => ([
  {
    label: "What changed",
    detail: decisionShiftSummary.replace(/^Changed:\s*/i, "").trim(),
  },
  {
    label: "What action it changes",
    detail: immediateDecision.trim(),
  },
  {
    label: "What would reverse the call",
    detail: reversalTrigger.trim(),
  },
]).filter((item) => item.detail.length > 0);

const inputInfluenceKeyOrder: RegimeSignalKey[] = ["tightness", "riskAppetite", "baseRate", "curveSlope"];

const buildInputInfluenceFallback = ({
  assessment,
}: {
  assessment: HomeReportData["assessment"];
}) =>
  normalizeSignalContributions(
    buildSignalInfluence({
    tightness: assessment.scores.tightness,
    riskAppetite: assessment.scores.riskAppetite,
    baseRate: typeof assessment.scores.baseRate === "number" ? assessment.scores.baseRate : null,
    curveSlope: typeof assessment.scores.curveSlope === "number" ? assessment.scores.curveSlope : null,
    thresholds: {
      ...DEFAULT_THRESHOLDS,
      ...assessment.thresholds,
    },
    })
  );

const buildInputInfluenceDescription = ({
  key,
  rawValue,
  assessment,
}: {
  key: RegimeSignalKey;
  rawValue: number | null;
  assessment: HomeReportData["assessment"];
}): Pick<InputInfluenceItem, "pressureLabel" | "effectDetail" | "watchLabel" | "tone"> => {
  if (typeof rawValue !== "number") {
    return {
      pressureLabel: "Waiting on a fresh read",
      effectDetail: "This input is not carrying a current directional push into the call yet.",
      watchLabel: "Refresh pending",
      tone: "neutral",
    };
  }

  if (key === "tightness") {
    const gap = rawValue - assessment.thresholds.tightnessRegime;
    return gap >= 0
      ? {
          pressureLabel: gap >= 8 ? "Strong defensive pull" : "Defensive pull",
          effectDetail: `${gap.toFixed(1)} pts above the regime line, so approvals and fixed-cost tolerance stay tighter.`,
          watchLabel: `Regime line ${assessment.thresholds.tightnessRegime.toFixed(1)}`,
          tone: "warning",
        }
      : {
          pressureLabel: Math.abs(gap) >= 8 ? "Expansion support" : "Room to loosen",
          effectDetail: `${Math.abs(gap).toFixed(1)} pts below the regime line, so the call has room to loosen if other inputs confirm.`,
          watchLabel: `Regime line ${assessment.thresholds.tightnessRegime.toFixed(1)}`,
          tone: "positive",
        };
  }

  if (key === "riskAppetite") {
    const gap = rawValue - assessment.thresholds.riskAppetiteRegime;
    return gap >= 0
      ? {
          pressureLabel: gap >= 8 ? "Strong expansion support" : "Expansion support",
          effectDetail: `${gap.toFixed(1)} pts above the regime line, so the call can carry larger reversible bets.`,
          watchLabel: `Regime line ${assessment.thresholds.riskAppetiteRegime.toFixed(1)}`,
          tone: "positive",
        }
      : {
          pressureLabel: Math.abs(gap) >= 8 ? "Risk-off pressure" : "Capping risk-taking",
          effectDetail: `${Math.abs(gap).toFixed(1)} pts below the regime line, so bet size and expansion appetite stay capped.`,
          watchLabel: `Regime line ${assessment.thresholds.riskAppetiteRegime.toFixed(1)}`,
          tone: "warning",
        };
  }

  if (key === "baseRate") {
    const gap = rawValue - DEFAULT_THRESHOLDS.baseRateTightness;
    if (gap > 0.25) {
      return {
        pressureLabel: "Payback pressure",
        effectDetail: `${gap.toFixed(1)} pts above the cost-of-money line, so long-payback work needs harder proof.`,
        watchLabel: `Cost-of-money line ${DEFAULT_THRESHOLDS.baseRateTightness.toFixed(1)}%`,
        tone: "warning",
      };
    }
    if (gap < -0.25) {
      return {
        pressureLabel: "Rate relief",
        effectDetail: `${Math.abs(gap).toFixed(1)} pts below the cost-of-money line, so rates are not the main drag on approvals.`,
        watchLabel: `Cost-of-money line ${DEFAULT_THRESHOLDS.baseRateTightness.toFixed(1)}%`,
        tone: "positive",
      };
    }
    return {
      pressureLabel: "Neutral rate read",
      effectDetail: "Rates are near the cost-of-money line, so they are not giving the model a strong directional shove.",
      watchLabel: `Cost-of-money line ${DEFAULT_THRESHOLDS.baseRateTightness.toFixed(1)}%`,
      tone: "neutral",
    };
  }

  if (rawValue < -0.1) {
    return {
      pressureLabel: "Recession caution",
      effectDetail: "The curve is still inverted, so expansion confidence stays capped even if other inputs improve.",
      watchLabel: "Below 0.0% = inversion",
      tone: "warning",
    };
  }
  if (rawValue > 0.1) {
    return {
      pressureLabel: "Expansion confidence",
      effectDetail: "The curve is positive, which supports a looser call if tightness also cooperates.",
      watchLabel: "Below 0.0% = inversion",
      tone: "positive",
    };
  }
  return {
    pressureLabel: "Boundary watch",
    effectDetail: "The curve is near flat, so it is not giving the model a strong directional push yet.",
    watchLabel: "Below 0.0% = inversion",
    tone: "neutral",
  };
};

const buildInputInfluenceItems = ({
  assessment,
  reportDynamics,
  regimeSignalIndicators,
}: {
  assessment: HomeReportData["assessment"];
  reportDynamics: HomeReportData["reportDynamics"];
  regimeSignalIndicators: RegimeSignalIndicator[];
}): InputInfluenceItem[] => {
  const signalContributions = reportDynamics?.signalContributions?.length
    ? reportDynamics.signalContributions
    : buildInputInfluenceFallback({ assessment });
  const contributionByKey = new Map(signalContributions.map((item: NonNullable<ReportDynamics["signalContributions"]>[number]) => [item.key, item]));
  const indicatorByKey = new Map(regimeSignalIndicators.map((item) => [item.key, item]));

  return inputInfluenceKeyOrder.map((key) => {
    const indicator = indicatorByKey.get(key);
    const contribution = contributionByKey.get(key);
    const influencePercent = contribution ? Math.round(contribution.normalized * 100) : 0;
    const description = buildInputInfluenceDescription({
      key,
      rawValue: indicator?.rawValue ?? null,
      assessment,
    });

    return {
      key,
      label: indicator?.label ?? regimeSignalLabelByKey[key],
      valueLabel: indicator?.valueLabel ?? "—",
      pressureLabel: description.pressureLabel,
      effectDetail: description.effectDetail,
      influencePercent,
      influencePercentLabel: contribution?.normalizedPercentLabel ?? `${influencePercent}%`,
      trendArrow: indicator?.trendArrow ?? "→",
      trendLabel: indicator?.isFallback ? "No fresh weekly delta yet." : indicator?.trendDeltaLabel ?? "Weekly delta unavailable.",
      watchLabel: description.watchLabel,
      tone: description.tone,
    };
  });
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
  const nearestThresholdGap = resolveDistanceToFlip({
    scores: assessment.scores,
    thresholds: assessment.thresholds,
  });
  const shiftTargets = regimeShiftTargets[assessment.regime];
  const primaryShiftRegimeLabel = REGIME_SHORT_LABELS[shiftTargets.defensive];

  const confidenceLabel: RegimeConfidenceLabel = nearestThresholdGap <= 5 ? "LOW" : nearestThresholdGap <= 12 ? "MED" : "HIGH";
  const transitionWatch: "ON" | "OFF" = nearestThresholdGap <= 8 || Boolean(regimeAlert) ? "ON" : "OFF";
  const confidencePercent = resolveConfidencePercentFromDistance(nearestThresholdGap);
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

  const historicalTimeline = buildHistoricalTimeline({ currentRegime: assessment.regime, regimeSeries, historicalSelection });

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
      growth: buildScopedVariantDecisionAdjustment({ mode: "growth", thresholds: assessment.thresholds, scores: assessment.scores }),
      public: buildScopedVariantDecisionAdjustment({ mode: "public", thresholds: assessment.thresholds, scores: assessment.scores }),
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
  const inputInfluence = buildInputInfluenceItems({
    assessment,
    reportDynamics,
    regimeSignalIndicators,
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
    inputInfluence,
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
    historicalTimeline,
    macroOverlay: buildMacroOverlay(macroSeries, assessment, overlaySector),
    evidenceItems: data.reportEvidenceItems ?? [],
    netConstraintSummary,
    postureDeltaLabel,
    reversalTrigger: conciseFlipThreshold,
    transitionWatch,
    failureModes,
    sinceLastReview: buildStartRouteDeltaBlock({
      currentRegime: assessment.regime,
      regimeAlert,
      reportDynamics,
      evidenceItems: data.reportEvidenceItems ?? [],
      guardrail,
      reversalTrigger: conciseFlipThreshold,
      failureModes,
      trendLabel,
      historicalTimeline,
    }),
    whyThisCall: buildWhyThisCall({
      tightnessGap,
      riskGap,
      reportDynamics,
      transitionWatch,
    }),
  };
};

export const buildWeeklyDecisionCardViewModel = ({
  homeBriefModel,
  statusLabel,
  regimeKey,
  reportDynamics,
  citation,
  recordDateLabel,
  fetchedAtLabel,
  freshnessLine,
  confidenceHistory,
  confidenceTrend,
  canonicalDecisionCopy,
  isFallbackSnapshot,
}: {
  homeBriefModel: ReturnType<typeof buildHomeBriefModel>;
  statusLabel: string;
  regimeKey?: RegimeKey;
  reportDynamics: ReportDynamics;
  citation: string;
  recordDateLabel: string;
  fetchedAtLabel: string;
  freshnessLine?: string;
  confidenceHistory?: WeeklyConfidencePoint[];
  confidenceTrend?: ConfidenceTrendFraming;
  canonicalDecisionCopy?: CanonicalDecisionCopy;
  isFallbackSnapshot?: boolean;
}): WeeklyDecisionCardViewModel => {
  const immediateDecision = canonicalDecisionCopy?.doNowLines[0]
    ?? homeBriefModel.actionNowShort?.trim()
    ?? (homeBriefModel.revisitDecisions
      ? "Revise hiring and roadmap calls now."
      : "Hold last week's operating rules.");
  const whyItMattersLine = buildWhyItMattersLine({
    weeklyMovement: homeBriefModel.weeklyMovement,
  });
  const readThisCardItems = buildReadThisCardItems({
    decisionShiftSummary: homeBriefModel.decisionShiftSummary,
    immediateDecision,
    reversalTrigger: homeBriefModel.reversalTrigger,
  });

  return {
    status: {
      statusLabel,
      regimeKey,
      postureLabel: homeBriefModel.postureLabel,
      stageLabel: homeBriefModel.stageLabel,
      postureWithStageLabel: homeBriefModel.postureWithStageLabel,
      postureDelta: homeBriefModel.postureDeltaLabel,
      confidenceLabel: homeBriefModel.confidenceLabel,
      confidencePercent: homeBriefModel.confidencePercent,
      signalConfidenceReason: homeBriefModel.signalConfidenceReason,
      regimeHeader: homeBriefModel.regimeHeader,
      trendLabel: homeBriefModel.trendLabel,
      confidenceHistory,
      confidenceTrend,
      transitionWatch: homeBriefModel.transitionWatch,
      isFallbackSnapshot,
    },
    decision: {
      operatingStanceLine: homeBriefModel.operatingStanceLine,
      weeklyMemoLines: homeBriefModel.weeklyMemoLines,
      netConstraintSummary: homeBriefModel.netConstraintSummary,
      guardrail: homeBriefModel.guardrail,
      reversalTrigger: homeBriefModel.reversalTrigger,
      actionNowShort: homeBriefModel.actionNowShort,
      immediateDecision,
      guardrailThreshold: homeBriefModel.guardrailThreshold,
      flipThreshold: homeBriefModel.flipThreshold,
      compactFlipConditionLabels: homeBriefModel.compactFlipConditionLabels,
      canonicalDecisionCopy,
      canonicalFlipConditions: homeBriefModel.canonicalFlipConditions,
      reportDynamics,
      decisionShiftSummary: homeBriefModel.decisionShiftSummary,
      transitionProbabilities: homeBriefModel.transitionProbabilities,
      decisionRules: homeBriefModel.decisionRules,
      decisionMatrix: homeBriefModel.decisionMatrix,
      startupVariantPolicy: homeBriefModel.startupVariantPolicy,
      actionStripItems: homeBriefModel.actionStripItems,
      roleAwareTemplates: homeBriefModel.roleAwareTemplates,
      executiveOperationalStance: homeBriefModel.executiveOperationalStance,
      revisitDecisions: homeBriefModel.revisitDecisions,
      weeklyMovement: homeBriefModel.weeklyMovement,
    },
    presentation: {
      whyItMattersLine,
      readThisCardItems,
      glossaryHref: "/method#beginner-glossary",
    },
    diagnostics: {
      regimeSignalIndicators: homeBriefModel.regimeSignalIndicators,
      inputInfluence: homeBriefModel.inputInfluence,
      startupClimateIndex: homeBriefModel.startupClimateIndex,
      regimeDistance: homeBriefModel.regimeDistance,
      flipRiskMeter: buildFlipRiskMeterState(homeBriefModel.regimeDistance),
      regimeVelocity: homeBriefModel.regimeVelocity,
      whyThisCall: homeBriefModel.whyThisCall,
      evidenceItems: homeBriefModel.evidenceItems,
      failureModes: homeBriefModel.failureModes,
    },
    history: {
      memoryRail: homeBriefModel.memoryRail,
      historicalTimeline: homeBriefModel.historicalTimeline,
      historicalAnalogs: homeBriefModel.historicalAnalogs,
      macroOverlay: homeBriefModel.macroOverlay,
    },
    sinceLastReview: homeBriefModel.sinceLastReview,
    artifact: {
      citation,
      recordDateLabel,
      fetchedAtLabel,
      freshnessLine,
    },
  };
};
