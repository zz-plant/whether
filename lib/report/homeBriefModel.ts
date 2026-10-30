import type { MacroSeriesReading, TreasuryMetadata } from "../types";
import type { RegimeStateTransition } from "../regimeStateMachine";
import type { DecisionMovement, GuidanceChange } from "./decisionMovement";
import type { WeeklyTone } from "./reportEvidence";
import type { ComparedWith } from "./reportDataTypes";
import type {
  HistoricalAnalog,
  LastYearComparison,
  ReportDynamics,
  ReportEvidenceItem,
  WeeklyConfidencePoint,
  ConfidenceTrendFraming,
} from "./reportData";
import type {
  ForecastModel,
  ForecastRegimeLabel,
  TransitionVelocityEstimate,
} from "./forecastModel";
import type { RegimeSignalKey } from "./reportFormatting";
import type { DecisionReadinessState, TrustWarning } from "./trustStatus";
import type {
  BoundedDecisionRule,
  ScopedVariantDecisionAdjustment,
  StartupVariantMode,
} from "./boundedDecisionRules";
import type { RunwayBand } from "./operatorRunway";
import type { ActionStripItem, RoleAwareOperatingTemplate } from "./operatingCalls";
import type { TimeMachineRegimeEntry } from "../timeMachine/timeMachineCache";
import type { PostureStateContract } from "./postureStateContract";
import type { PolicyRefusalCode, RegimeDiagnostics, RegimeKey } from "../regimeEngine";
import type { CanonicalDecisionCopy } from "./canonicalDecisionCopy";
import type { WeeklyCallContract } from "./weeklyCallContract";
import {
  buildFlipRiskMeterState,
  buildHomeBriefModelInternal,
  buildMemoryRail,
  buildWeeklyDecisionCardViewModelInternal,
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
export { buildFlipRiskMeterState, buildMemoryRail };

export type Regime = RegimeKey;

export type HomeReportData = {
  fetchedAtLabel?: string;
  historicalSelection?: { month: number; year: number; banner: string } | null;
  assessment: {
    regime: Regime;
    /** The state machine's own transition, when the read path carried machine state.
     *  Copy that describes a pending quadrant change gates on this, not on the readings. */
    regimeTransition?: RegimeStateTransition;
    /** Whether a score sits inside the engine's near band: half of what
     *  `couldCallChangeNextWeek` reads, the other half being a pending transition. */
    diagnostics: Pick<RegimeDiagnostics, "transitionWatch">;
    thresholds: { tightnessRegime: number; riskAppetiteRegime: number };
    scores: {
      tightness: number;
      tightnessPressure?: number;
      tightnessSaturated?: boolean;
      riskAppetite: number;
      baseRate?: number;
      curveSlope?: number | null;
    };
    policyAssessment?: {
      refusal?: {
        refused?: boolean;
        reasons?: string[];
        reasonCodes?: PolicyRefusalCode[];
      };
    };
  };
  regimeAlert: { previousRegime: Regime } | null;
  stopItems: string[];
  recordDateLabel?: string;
  reportDynamics?: {
    directionLabel: ReportDynamics["directionLabel"];
    /** Whether the conditions changed against the earlier reading; absent reads as no. */
    regimeChanged?: ReportDynamics["regimeChanged"];
    /** The earlier reading's conditions when they changed: which way the week reads. */
    previousRegime?: ReportDynamics["previousRegime"];
    changedSignals: Array<{
      key: "tightness" | "riskAppetite" | "baseRate" | "curveSlope";
      delta: number;
    }>;
    signalContributions?: ReportDynamics["signalContributions"];
    anomalySignals?: Array<{
      key: "tightness" | "riskAppetite" | "baseRate" | "curveSlope";
      delta: number;
      reason: string;
    }>;
    /** What the moves are measured against, so the model's labels can name it. */
    comparedWith?: ComparedWith;
  };
  reportEvidenceItems?: ReportEvidenceItem[];
  macroSeries?: MacroSeriesReading[];
  forecast?: ForecastModel;
  historicalAnalogs?: HistoricalAnalog[];
  lastYearComparison?: LastYearComparison | null;
  regimeSeries?: TimeMachineRegimeEntry[];
  treasuryProvenance?: { sourceLabel?: string; sourceUrl?: string; statusLabel?: string };
  treasury?: Partial<TreasuryMetadata>;
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
type ThresholdPressureDirection = "higher-is-worse" | "lower-is-worse";

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

export type HomeBriefTrustWarning = TrustWarning;

type DecisionMatrixColumnKey = "approve" | "delay" | "flip";

export type DecisionMatrixRowKey = "hiring" | "product" | "capital" | "burn";

type DecisionMatrixCell = {
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

type StartupVariantOption = { mode: StartupVariantMode; label: string };

export type StartupVariantPolicy = {
  selectedMode: StartupVariantMode;
  options: StartupVariantOption[];
  adjustmentsByMode: Record<StartupVariantMode, ScopedVariantDecisionAdjustment>;
};

type StartRouteDeltaRoute = "/signals" | "/operate";

type StartRouteDeltaItem = {
  id: "posture-shift" | "top-driver" | "trigger-risk";
  label: string;
  detail: string;
  href: StartRouteDeltaRoute;
};

type StartRouteDeltaBlock = {
  isReturningUser: boolean;
  hasMeaningfulDelta: boolean;
  fallbackCopy: string;
  items: StartRouteDeltaItem[];
};

type WeeklyLeadershipSummary = {
  boldnessScore: number;
  /** The operating latitude's move since the earlier reading; null when nothing was compared. */
  boldnessDelta: number | null;
  /**
   * What the week did to the guidance (`describeGuidanceChange`): the conditions
   * changed, a pause or restart line was crossed, or neither; null when nothing
   * was compared. Renderers that say "nothing changed" read this, never the
   * latitude's move, which can be zero on a week a line was crossed. It was
   * `steadyWeek`, the latitude moving a point or less, until 2026-10-07.
   */
  guidanceChange: GuidanceChange | null;
  /** The latitude's move in a sentence about the number only (`getNetDeltaLabel`). */
  shorthandLine: string;
  /** The earlier reading `boldnessDelta` is measured against; absent where the week does not date it. */
  comparedWith?: ComparedWith;
};

type RevisitQueueItem = {
  id: BoundedDecisionRule["area"];
  label: string;
  action: string;
  /**
   * The signal move that put this area in the queue, as its own sentence. One
   * signal maps to up to three areas (`signalAreaPriority`), so renderers that
   * list several items should hoist a shared driver rather than repeat it.
   */
  driver: string | null;
  /** Area-specific instruction. Unique per item, unlike `driver`. */
  recheck: string;
  /** `driver` and `recheck` composed, for single-item and export contexts. */
  reason: string;
  flipCondition: string;
};

export type WeeklyDecisionCardViewModel = {
  status: {
    statusLabel: string;
    regimeKey?: RegimeKey;
    postureLabel: string;
    /** Maturity stage of the current regime (Early/Mid/Late). Not to be confused with planning stepper steps or lane state steps. */
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
    /**
     * The week's direction as the headline reads it (`resolveWeeklyTone`); null when
     * nothing was compared, or when the week is held and its headline is the hold. Every
     * badge or arrow that names the week's direction beside the guidance reads this, not
     * `trendLabel`, which is the scores' own direction.
     */
    weeklyTone?: WeeklyTone | null;
    confidenceHistory?: WeeklyConfidencePoint[];
    confidenceTrend?: ConfidenceTrendFraming;
    transitionWatch: "ON" | "OFF";
    isFallbackSnapshot?: boolean;
  };
  decision: {
    operatingStanceLine: string;
    weeklyMemoLines: string[];
    netConstraintSummary: string;
    /** Prose description of the pause-if condition. e.g. "Pause net-new hiring if funding pressure rises above 76." */
    guardrail: string;
    /** Where the call itself changes (the regime flip trigger). A stage never replaces it. */
    reversalTrigger: string;
    /** The selected stage's discipline for lifting its hold — `WeeklyCallContract.resumeWhen`. Absent without a stage. */
    resumeWhen?: string;
    /** Compact action imperative extracted from the bounded decision rules. */
    actionNowShort?: string;
    immediateDecision: string;
    /** Numeric threshold for the guardrail line, used for gauge/visual display. Distinct from guardrail (which is prose). */
    guardrailThreshold?: string;
    /** Numeric threshold for the flip condition, used for gauge/visual display. */
    flipThreshold?: string;
    compactFlipConditionLabels?: string[];
    canonicalDecisionCopy?: CanonicalDecisionCopy;
    canonicalFlipConditions?: CanonicalFlipCondition[];
    reportDynamics: ReportDynamics;
    decisionShiftSummary: string;
    /** `decisionShiftSummary` without its change clause, for surfaces that print their own. */
    decisionShiftHeadline: string;
    transitionProbabilities: Record<ForecastRegimeLabel, number>;
    decisionRules: BoundedDecisionRule[];
    decisionMatrix?: DecisionMatrixPayload;
    startupVariantPolicy: StartupVariantPolicy;
    actionStripItems?: ActionStripItem[];
    /** Nearest bounded pause line translated into one compact business consequence. */
    /** The clear-condition corridor every lever shares, stated once. Null when they diverge. */
    sharedFlipCorridor?: string | null;
    roleAwareTemplates: RoleAwareOperatingTemplate[];
    executiveOperationalStance: { expand: string[]; avoid: string[] };
    revisitDecisions: boolean;
    revisitQueue: RevisitQueueItem[];
    decisionReadiness: DecisionReadinessState;
    weeklyLeadershipSummary: WeeklyLeadershipSummary;
    weeklyMovement: {
      /** null when no previous reading was compared, which is not a score of 0. */
      score: number | null;
      direction: "tightening" | "easing" | "stable" | "unavailable";
      summary: string;
    };
    /** What the week did to each area's lines since the reading it is compared with; null when nothing was compared. */
    decisionMovement: DecisionMovement | null;
  };
  presentation?: {
    readThisCardItems?: Array<{
      label: string;
      detail: string;
    }>;
  };
  diagnostics: {
    regimeSignalIndicators: RegimeSignalIndicator[];
    inputInfluence: InputInfluenceItem[];
    postureTrajectory?: PostureTrajectoryState;
    currentScores: {
      tightness: number;
      tightnessPressure?: number;
      tightnessSaturated?: boolean;
      riskAppetite: number;
    };
    regimeDistance: {
      dimensionLabel: string;
      dimensionKey: "tightness" | "riskAppetite";
      currentValue: number;
      thresholdValue: number;
      /** The watched line's distance, in that axis's own points. */
      pointsToFlip: number;
      /** The same distance on the tightness-equivalent scale the published margin cuts at. */
      pointsToFlipNormalized: number;
      thresholdDirection: BoundaryDirection;
    };
    flipRiskMeter: FlipRiskMeterState;
    regimeVelocity: TransitionVelocityEstimate;
    whyThisCall: WhyThisCallItem[];
    evidenceItems: ReportEvidenceItem[];
    failureModes?: HomeBriefTrustWarning[];
  };
  history: {
    memoryRail: MemoryRailItem[];
    historicalTimeline: HistoricalTimelineItem[];
    historicalAnalogs: HomeBriefHistoricalAnalog[];
    lastYearComparison: LastYearComparison | null;
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
  options?: {
    startupVariantMode?: StartupVariantMode;
    runwayBand?: RunwayBand;
    runwayMonths?: number;
  },
) => buildHomeBriefModelInternal(data, options);

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
