import type { MacroSeriesReading } from "../types";
import type {
  DecisionTransmission,
  HistoricalAnalog,
  LastYearComparison,
  ReportDynamics,
  ReportEvidenceItem,
  WeeklyConfidencePoint,
  ConfidenceTrendFraming,
} from "./reportData";
import type { SectorKey } from "./sectorSensitivity";
import type {
  ForecastModel,
  ForecastRegimeLabel,
  TransitionVelocityEstimate,
} from "./forecastModel";
import type { RegimeSignalKey } from "./reportFormatting";
import type { DecisionReadinessState, FailureModeWarning } from "./trustStatus";
import type {
  BoundedDecisionRule,
  ScopedVariantDecisionAdjustment,
  StartupVariantMode,
} from "./boundedDecisionRules";
import {
  buildDecisionTransmissionBoundedRules,
  type ActionStripItem,
  type RoleAwareOperatingTemplate,
} from "./operatingCalls";
import type { TimeMachineRegimeEntry } from "../timeMachine/timeMachineCache";
import type { PostureStateContract } from "./postureStateContract";
import type { StartupClimateIndex } from "./homeBrief/scoring";
import type { RegimeKey } from "../regimeEngine";
import type { CanonicalDecisionCopy } from "./canonicalDecisionCopy";
import type { WeeklyCallContract } from "./weeklyCallContract";
import {
  buildFlipRiskMeterState,
  buildHomeBriefModelInternal,
  buildMemoryRail,
  buildWeeklyDecisionCardViewModelInternal,
  extractExecutiveOperationalStance,
} from "./homeBrief/builders";

/**
 * Loop stage owner: posture → decision.
 *
 * This module now serves as the typed public surface for home-brief model
 * construction. Heavy derivation/orchestration logic lives in
 * `lib/report/homeBrief/builders.ts` so the public contract stays stable while
 * stage-2 logic remains split from the facade.
 */

export { buildDecisionMatrixPayload } from "./homeBrief/decisionMatrix";
export { buildFlipRiskMeterState, buildMemoryRail, extractExecutiveOperationalStance };

export type Regime = "SCARCITY" | "DEFENSIVE" | "VOLATILE" | "EXPANSION";

export type HomeReportData = {
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
  lastYearComparison?: LastYearComparison | null;
  regimeSeries?: TimeMachineRegimeEntry[];
  macroProvenance?: { sourceLabel?: string; sourceUrl?: string; statusLabel?: string };
  treasuryProvenance?: { sourceLabel?: string; sourceUrl?: string; statusLabel?: string };
  treasury?: { fetched_at?: string | null; fallback_at?: string | null; fallback_reason?: string | null };
  actionStripItems?: ActionStripItem[];
  actionNowShort?: string;
  guardrailThreshold?: string;
  flipThreshold?: string;
  postureState?: PostureStateContract;
  [key: string]: unknown;
};

export type MemoryRailItem = {
  label: string;
  posture: string;
};

export type HistoricalTimelineItem = MemoryRailItem & {
  month?: number;
  year?: number;
  recordDate?: string;
  summary?: string;
  isCurrent?: boolean;
};

export type WhyThisCallItem = {
  key?: "distance-to-regime-change" | "momentum" | "signal-reliability";
  label: string;
  detail: string;
};

export type SignalChange = {
  key: "tightness" | "riskAppetite" | "baseRate" | "curveSlope";
  delta: number;
};

export type BoundaryDimension = "tightness" | "riskAppetite";

export type BoundaryDirection = "riseAbove" | "fallToOrBelow";

export type HomeBriefHistoricalAnalog = {
  date: string;
  similarityScore: number;
  implication: string;
};

export type MacroOverlayItem = {
  label: string;
  detail: string;
};

export type RegimeSignalIndicator = {
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
export type ThresholdPressureDirection = "higher-is-worse" | "lower-is-worse";

export type FlipRiskMeterState = {
  progressPercent: number;
  urgencyLabel: "Low" | "Medium" | "High" | "Unknown";
  detailLabel: string;
  triggerLabel: string;
};

export type PostureTrajectoryState = {
  current: {
    tightness: number;
    riskAppetite: number;
  };
  previous: {
    tightness: number;
    riskAppetite: number;
  };
  weeklyDelta: {
    tightness: number;
    riskAppetite: number;
  };
  thresholds: {
    tightness: number;
    riskAppetite: number;
  };
};

export type InputInfluenceItem = {
  key: RegimeSignalKey;
  label: string;
  valueLabel: string;
  currentValue: number | null;
  pressureLabel: string;
  effectDetail: string;
  influencePercent: number;
  influencePercentLabel: string;
  trendArrow: "↑" | "↓" | "→";
  trendLabel: string;
  watchLabel: string;
  watchValue: number | null;
  watchDistanceLabel: string;
  watchBuffer: number | null;
  chartDomain: { min: number; max: number } | null;
  pressureDirection: ThresholdPressureDirection;
  sparkline: number[];
  tone: InputInfluenceTone;
};

export type HomeBriefFailureMode = FailureModeWarning;

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

export type WeeklyLeadershipSummary = {
  boldnessScore: number;
  boldnessDelta: number;
  notchShiftLabel: string;
  shorthandLine: string;
  hiringWindow: string;
  expansionWindow: string;
  raiseWindow: string;
  netDeltaLabel: string;
};

export type RevisitQueueItem = {
  id: BoundedDecisionRule["area"];
  label: string;
  action: string;
  reason: string;
  flipCondition: string;
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
    startupVariantPolicy: StartupVariantPolicy;
    actionStripItems?: ActionStripItem[];
    roleAwareTemplates: RoleAwareOperatingTemplate[];
    executiveOperationalStance: { expand: string[]; avoid: string[] };
    revisitDecisions: boolean;
    revisitQueue: RevisitQueueItem[];
    decisionReadiness: DecisionReadinessState;
    weeklyLeadershipSummary: WeeklyLeadershipSummary;
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
    postureTrajectory?: PostureTrajectoryState;
    currentScores: {
      tightness: number;
      riskAppetite: number;
    };
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
    lastYearComparison: LastYearComparison | null;
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

export const buildHomeBriefModel = (
  data: HomeReportData,
  options?: { overlaySector?: SectorKey; startupVariantMode?: StartupVariantMode },
) => buildHomeBriefModelInternal(data, options);

const normalizeDecisionTransmissionConfidence = (label: string | undefined): DecisionTransmission["confidence"] => {
  if (label === "HIGH") return "high";
  if (label === "MED") return "medium";
  if (label === "LOW") return "low";
  return "unknown";
};

const resolveStalenessLabel = ({
  timestamp,
  now,
  staleAfterHours,
}: {
  timestamp?: string | null;
  now: Date;
  staleAfterHours: number;
}): DecisionTransmission["freshness"]["stalenessLabel"] => {
  if (!timestamp) return "unknown";
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return "unknown";
  return (now.getTime() - parsed) / 3_600_000 > staleAfterHours ? "stale" : "fresh";
};

export const buildDecisionTransmission = (
  data: HomeReportData,
  options?: {
    overlaySector?: SectorKey;
    startupVariantMode?: StartupVariantMode;
    now?: Date;
    staleAfterHours?: number;
  },
): DecisionTransmission => {
  const homeBriefModel = buildHomeBriefModelInternal(data, options);
  const now = options?.now ?? new Date();
  const staleAfterHours = options?.staleAfterHours ?? 48;
  const provenanceCandidates = [
    data.treasuryProvenance?.sourceLabel
      ? {
          sourceLabel: data.treasuryProvenance.sourceLabel,
          reference: data.treasuryProvenance.sourceUrl ?? "treasury:source-url-unavailable",
          isFallback: false,
        }
      : null,
    data.macroProvenance?.sourceLabel
      ? {
          sourceLabel: data.macroProvenance.sourceLabel,
          reference: data.macroProvenance.sourceUrl ?? "macro:source-url-unavailable",
          isFallback: false,
        }
      : null,
  ];
  const provenance = provenanceCandidates.filter((item): item is NonNullable<typeof item> => item !== null);

  const boundedRules = buildDecisionTransmissionBoundedRules({
    rules: homeBriefModel.decisionRules,
    actionStripItems: data.actionStripItems,
  });

  return {
    whatChanged: homeBriefModel.decisionShiftSummary,
    postureNow:
      homeBriefModel.actionNowShort?.trim() ||
      homeBriefModel.operatingStanceLine ||
      "Hold current operating posture until fresh signal confirmation.",
    boundedRules,
    flipConditions:
      homeBriefModel.compactFlipConditionLabels && homeBriefModel.compactFlipConditionLabels.length > 0
        ? homeBriefModel.compactFlipConditionLabels
        : [homeBriefModel.reversalTrigger],
    freshness: {
      timestamp: data.treasury?.fetched_at ?? data.fetchedAtLabel ?? "timestamp-unavailable",
      stalenessLabel: resolveStalenessLabel({
        timestamp: data.treasury?.fetched_at,
        now,
        staleAfterHours,
      }),
    },
    confidence: normalizeDecisionTransmissionConfidence(homeBriefModel.confidenceLabel),
    provenance:
      provenance.length > 0
        ? provenance
        : [{ sourceLabel: "Provenance unavailable", reference: "fallback:manual-source-review-required", isFallback: true }],
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
  weeklyCall,
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
  weeklyCall?: WeeklyCallContract;
}): WeeklyDecisionCardViewModel =>
  buildWeeklyDecisionCardViewModelInternal({
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
    weeklyCall,
  });
