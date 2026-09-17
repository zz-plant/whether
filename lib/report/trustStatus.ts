import type { CompactFreshnessMeta } from "./reportFormatting";
import { DECISION_CONTRACT_LABELS } from "./reportCopy";

type TrustStatusTone = "stable" | "warning" | "historical";

type TrustOutageSeverity = "advisory" | "blocking" | "critical";

type TrustOutageType = "live-data" | "feed-unavailable" | "stale-cache" | "source-divergence" | "historical-snapshot";

type TrustApprovalBucket = {
  label: "Allowed now" | "Hold" | "Blocked";
  detail: string;
};

type TrustRecoveryPlan = {
  owner: string;
  nextCheckpoint: string;
  exitCondition: string;
};

type TrustExitGateCriterion = {
  key: "live-mode" | "freshness" | "confidence";
  label: string;
  met: boolean;
};

type TrustExitGate = {
  label: string;
  summary: string;
  metCount: number;
  totalCount: number;
  criteria: TrustExitGateCriterion[];
};

export type TrustWarning = {
  id: "boundary-whipsaw" | "stale-cached" | "anomaly-divergence";
  warning: string;
  mitigationCheck: string;
};

export type DecisionReadinessState = {
  label: "Act" | "Act with caution" | "Hold";
  tone: TrustStatusTone;
  detail: string;
};

type SourceFreshnessState = Pick<
  CompactFreshnessMeta,
  "updatedAtLabel" | "freshnessStatus" | "mode" | "timestamp" | "ageHours"
>;

const FALLBACK_FRESHNESS_LABEL = "Unavailable";

const normalizeFreshnessLabel = (freshnessLabel: string) => {
  const trimmedLabel = freshnessLabel.trim();
  return trimmedLabel.length > 0 ? trimmedLabel : FALLBACK_FRESHNESS_LABEL;
};

const isUnavailableFreshness = (freshnessLabel: string) =>
  normalizeFreshnessLabel(freshnessLabel) === FALLBACK_FRESHNESS_LABEL;

const resolveFreshnessState = ({
  freshnessLabel,
  freshnessState,
  isFallbackSnapshot,
  isHistoricalSelection,
}: {
  freshnessLabel?: string;
  freshnessState?: Partial<SourceFreshnessState>;
  isFallbackSnapshot: boolean;
  isHistoricalSelection?: boolean;
}): SourceFreshnessState => {
  if (freshnessState?.updatedAtLabel && freshnessState.freshnessStatus && freshnessState.mode) {
    return {
      updatedAtLabel: normalizeFreshnessLabel(freshnessState.updatedAtLabel),
      freshnessStatus: freshnessState.freshnessStatus,
      mode: freshnessState.mode,
      timestamp: freshnessState.timestamp ?? null,
      ageHours: typeof freshnessState.ageHours === "number" ? freshnessState.ageHours : null,
    };
  }

  const normalizedFreshness = normalizeFreshnessLabel(freshnessLabel ?? FALLBACK_FRESHNESS_LABEL);
  return {
    updatedAtLabel: normalizedFreshness,
    freshnessStatus: isUnavailableFreshness(normalizedFreshness)
      ? "unknown"
      : isFallbackSnapshot
        ? "stale"
        : "fresh",
    mode: isHistoricalSelection ? "historical" : isFallbackSnapshot ? "cached" : "live",
    timestamp: null,
    ageHours: null,
  };
};

const hasStrongSignalDisagreement = (
  changedSignals: Array<{ delta: number }>,
) => {
  let positive = 0;
  let negative = 0;

  for (const signal of changedSignals) {
    if (signal.delta > 0) positive += 1;
    if (signal.delta < 0) negative += 1;
  }

  return positive > 0 && negative > 0;
};

const buildOutageExitGate = ({
  isFallback,
  confidenceLow,
  freshnessUnavailable,
}: {
  isFallback: boolean;
  confidenceLow: boolean;
  freshnessUnavailable: boolean;
}): TrustExitGate => {
  const criteria: TrustExitGateCriterion[] = [
    {
      key: "live-mode",
      label: "Live mode restored",
      met: !isFallback,
    },
    {
      key: "freshness",
      label: "Fresh timestamp available",
      met: !freshnessUnavailable,
    },
    {
      key: "confidence",
      label: "Confidence above LOW",
      met: !confidenceLow,
    },
  ];
  const metCount = criteria.filter((criterion) => criterion.met).length;

  return {
    label: "Outage mode exits when 3/3 checks pass.",
    summary: `${metCount}/${criteria.length} checks passed this refresh.`,
    metCount,
    totalCount: criteria.length,
    criteria,
  };
};

const ALLOWED_DETAILS: Record<TrustStatusTone, [string, string, string]> = {
  historical: [
    "Retrospective analysis and scenario planning only.",
    "Weekly pacing changes until live data loads.",
    "New fixed cost approvals.",
  ],
  warning: [
    "Reversible adjustments inside existing guardrails.",
    "Headcount expansion or multi-quarter vendor commitments.",
    "Irreversible approvals until one verified live refresh.",
  ],
  stable: [
    "Standard weekly approvals under the current call.",
    "No additional holds while trust remains stable.",
    "No outage-specific blocks in this state.",
  ],
};

const buildApprovalBuckets = ({
  tone,
}: {
  tone: TrustStatusTone;
}): TrustApprovalBucket[] => {
  const [allowed, hold, blocked] = ALLOWED_DETAILS[tone];
  return [
    { label: "Allowed now", detail: allowed },
    { label: "Hold", detail: hold },
    { label: "Blocked", detail: blocked },
  ];
};

const buildRecoveryPlan = ({
  tone,
}: {
  tone: TrustStatusTone;
}): TrustRecoveryPlan => {
  if (tone === "warning") {
    return {
      owner: "CEO + Finance lead",
      nextCheckpoint: "Daily 10:00 UTC until outage gate clears",
      exitCondition: "Resume normal approval cadence after one verified live refresh across core sources.",
    };
  }

  if (tone === "historical") {
    return {
      owner: "CEO + Finance lead",
      nextCheckpoint: "Before the next approval window",
      exitCondition: "Switch to current live snapshot before changing pace.",
    };
  }

  return {
    owner: "CEO + Finance lead",
    nextCheckpoint: "Weekly planning cadence",
    exitCondition: "Keep standard approvals while confidence remains above LOW.",
  };
};

const resolveOutageClassification = ({
  historicalSelection,
  isFallback,
  fallbackReason,
}: {
  historicalSelection: boolean;
  isFallback: boolean;
  fallbackReason?: string;
}): { outageType: TrustOutageType; outageSeverity: TrustOutageSeverity } => {
  if (historicalSelection) {
    return { outageType: "historical-snapshot", outageSeverity: "advisory" };
  }

  if (!isFallback) {
    return { outageType: "live-data", outageSeverity: "advisory" };
  }

  const normalizedReason = fallbackReason?.toLowerCase() ?? "";

  if (normalizedReason.includes("timeout") || normalizedReason.includes("unavailable") || normalizedReason.includes("down")) {
    return { outageType: "feed-unavailable", outageSeverity: "critical" };
  }

  if (normalizedReason.includes("diverg") || normalizedReason.includes("anomal")) {
    return { outageType: "source-divergence", outageSeverity: "blocking" };
  }

  return { outageType: "stale-cache", outageSeverity: "blocking" };
};

export const buildTrustWarnings = ({
  confidenceLabel,
  transitionWatch,
  freshnessLabel,
  isFallbackSnapshot,
  provenanceStatusLabel,
  changedSignals,
  anomalySignals,
}: {
  confidenceLabel: "HIGH" | "MED" | "LOW";
  transitionWatch: "ON" | "OFF";
  freshnessLabel: string;
  isFallbackSnapshot: boolean;
  provenanceStatusLabel?: string;
  changedSignals: Array<{ delta: number }>;
  anomalySignals: Array<{ reason: string }>;
}): TrustWarning[] => {
  const warnings: TrustWarning[] = [];
  const staleSignal =
    isFallbackSnapshot ||
    isUnavailableFreshness(freshnessLabel) ||
    (provenanceStatusLabel?.toLowerCase().includes("cached") ?? false);

  if (staleSignal) {
    warnings.push({
      id: "stale-cached",
      warning: "Stale snapshot: live signal freshness is degraded.",
      mitigationCheck: "Confirm next live update before approving big bets.",
    });
  }

  if (
    confidenceLabel === "LOW" &&
    transitionWatch === "ON" &&
    (changedSignals.length >= 2 || hasStrongSignalDisagreement(changedSignals))
  ) {
    warnings.push({
      id: "boundary-whipsaw",
      warning: "Boundary whipsaw: call is near a flip threshold with unstable weekly motion.",
      mitigationCheck: "Require one confirming week before escalating fixed-cost commitments.",
    });
  }

  if (anomalySignals.length >= 2) {
    warnings.push({
      id: "anomaly-divergence",
      warning: "Signal divergence: multiple anomalies may overstate this week's directional call.",
      mitigationCheck: "Cross-check anomalous inputs against source-level sources before changing pace.",
    });
  }

  return warnings.slice(0, 2);
};

export const buildWeeklyTrustCueLine = ({
  confidenceLabel,
  freshnessLabel,
  transitionWatch,
}: {
  confidenceLabel: "HIGH" | "MED" | "LOW";
  freshnessLabel: string;
  transitionWatch: "ON" | "OFF";
}) => {
  return `Confidence ${confidenceLabel} · Freshness ${normalizeFreshnessLabel(freshnessLabel)} · Regime shift watch ${transitionWatch}`;
};
export const buildCompactTrustSummary = ({
  confidenceLabel,
  freshnessLabel,
  isFallbackSnapshot,
  isHistoricalSelection,
}: {
  confidenceLabel: "HIGH" | "MED" | "LOW";
  freshnessLabel: string;
  isFallbackSnapshot: boolean;
  isHistoricalSelection?: boolean;
}) => {
  const normalizedFreshness = normalizeFreshnessLabel(freshnessLabel);

  if (isHistoricalSelection) {
    return `Historical snapshot (${normalizedFreshness}) — retrospectives only, not live approvals.`;
  }

  if (isFallbackSnapshot) {
    return `Cached snapshot (${normalizedFreshness}) — safe for planning, wait for live update before big bets.`;
  }

  if (confidenceLabel !== "HIGH") {
    return `Confidence ${confidenceLabel} (${normalizedFreshness}) — stage approvals until confidence returns to HIGH.`;
  }

  return `Confidence ${confidenceLabel} (${normalizedFreshness}) — safe for near-term operating decisions.`;
};

/**
 * The one vocabulary for "how live is the data behind this". Every badge that
 * states it — the freshness pill above the brief, the hero's provenance line,
 * the shell masthead on each report page, the Trust page's status card — reads
 * from here. They used to say DEGRADED, Trust clear, Trust constrained and All
 * systems operational about the same read at the same moment.
 */
const DATA_STATUS_LABELS = {
  live: "Live",
  partlyCached: "Partly cached",
  cachedSnapshot: "Cached snapshot",
  historical: "Historical snapshot",
} as const;

type DataStatusKey = keyof typeof DATA_STATUS_LABELS;

/**
 * What each data state means for approvals, in one sentence each. The homepage
 * banner, the freshness popover and the export panel used to word this four
 * different ways for the same boolean; a reader comparing them could not tell
 * whether they described one state or three.
 */
const DATA_STATUS_GUIDANCE: Record<DataStatusKey, string> = {
  live: "All sources live and current.",
  partlyCached: "Some sources are cached. Stage decisions; do not commit until every source is current.",
  cachedSnapshot: "Cached snapshot. Stage decisions; do not lock hiring, spend or vendor commitments until live data returns.",
  historical: "Historical snapshot. Compare against the live read before changing current plans.",
};

export const resolveDataStatusGuidance = (input: Parameters<typeof resolveDataStatus>[0]) =>
  DATA_STATUS_GUIDANCE[resolveDataStatus(input)];

const resolveDataStatus = ({
  isHistoricalSelection = false,
  isFallbackSnapshot = false,
  degradedSourceCount = 0,
}: {
  isHistoricalSelection?: boolean;
  isFallbackSnapshot?: boolean;
  degradedSourceCount?: number;
}): DataStatusKey =>
  isHistoricalSelection
    ? "historical"
    : isFallbackSnapshot
      ? "cachedSnapshot"
      : degradedSourceCount > 0
        ? "partlyCached"
        : "live";

export const resolveDataStatusLabel = (input: Parameters<typeof resolveDataStatus>[0]) =>
  DATA_STATUS_LABELS[resolveDataStatus(input)];

export const resolveTrustReadinessCopy = ({
  trustStatusTone,
  degradedSourceRows,
  isFallbackSnapshot = false,
}: {
  trustStatusTone: TrustStatusTone;
  degradedSourceRows?: Array<unknown>;
  isFallbackSnapshot?: boolean;
  /** @deprecated No longer read. The headline is derived from state, not sniffed from prose. */
  trustStatusDetail?: string;
}): { tone: TrustStatusTone; headline: string } => {
  const status = resolveDataStatus({
    isHistoricalSelection: trustStatusTone === "historical",
    isFallbackSnapshot,
    degradedSourceCount: degradedSourceRows?.length ?? 0,
  });
  const tone: TrustStatusTone = status === "historical"
    ? "historical"
    : status !== "live" || trustStatusTone === "warning"
      ? "warning"
      : "stable";

  // A live feed under reduced confidence is still live; the qualifier says why the
  // tone is amber without inventing a second data state.
  const headline = status === "live" && tone === "warning"
    ? `${DATA_STATUS_LABELS.live} · reduced confidence`
    : DATA_STATUS_LABELS[status];

  return { tone, headline };
};

export const buildDecisionReadinessState = ({
  confidenceLabel,
  freshnessLabel,
  freshnessState,
  isFallbackSnapshot,
  isHistoricalSelection = false,
  policyRefusalActive = false,
  policyRefusalReasons = [],
}: {
  confidenceLabel: "HIGH" | "MED" | "LOW";
  freshnessLabel?: string;
  freshnessState?: Partial<SourceFreshnessState>;
  isFallbackSnapshot: boolean;
  isHistoricalSelection?: boolean;
  policyRefusalActive?: boolean;
  policyRefusalReasons?: string[];
}): DecisionReadinessState => {
  const resolvedFreshness = resolveFreshnessState({
    freshnessLabel,
    freshnessState,
    isFallbackSnapshot,
    isHistoricalSelection,
  });
  const normalizedFreshness = resolvedFreshness.updatedAtLabel;
  const freshnessWeak =
    resolvedFreshness.freshnessStatus === "stale" || resolvedFreshness.freshnessStatus === "unknown";

  if (isHistoricalSelection) {
    return {
      label: "Hold",
      tone: "historical",
      detail: "Historical snapshot. Not for live approvals.",
    };
  }

  if (confidenceLabel === "LOW" || freshnessWeak) {
    return {
      label: "Hold",
      tone: "warning",
      detail: "Keep current operations running. Pause new hires, vendor contracts, or capital commitments until fresh data arrives.",
    };
  }

  if (policyRefusalActive) {
    return {
      label: "Act with caution",
      tone: "warning",
      detail: `Policy override: ${policyRefusalReasons[0] ?? "signals disagree or data gaps prevent a posture change"}. Keep approvals reversible.`,
    };
  }

  if (isFallbackSnapshot || confidenceLabel === "MED") {
    return {
      label: "Act with caution",
      tone: "warning",
      detail: `Use weekly call for careful moves. Gate big bets until confidence rises from ${confidenceLabel} (${normalizedFreshness}).`,
    };
  }

  return {
    label: "Act",
    tone: "stable",
    detail: `Live data (${normalizedFreshness}) and HIGH confidence support this week's approvals.`,
  };
};

export const buildWeeklyCitationMetaLine = ({
  statusLabel,
  confidenceLabel,
  recordDateLabel,
  freshnessLabel,
}: {
  statusLabel: string;
  confidenceLabel: "HIGH" | "MED" | "LOW";
  recordDateLabel: string;
  freshnessLabel: string;
}) =>
  `Posture ${statusLabel} · Confidence ${confidenceLabel} · Decision as-of ${recordDateLabel} · Data refreshed ${normalizeFreshnessLabel(freshnessLabel)}`;

export const buildTrustStatus = ({
  historicalSelection,
  isFallback,
  fallbackReason,
  historicalAction,
  fallbackAction,
  stableAction,
  confidenceLabel = "MED",
  freshnessLabel = FALLBACK_FRESHNESS_LABEL,
  freshnessState,
  policyRefusalActive = false,
  policyRefusalReasons = [],
  historicalMacroCoverageLabel,
}: {
  historicalSelection: boolean;
  isFallback: boolean;
  fallbackReason?: string;
  historicalAction: string;
  fallbackAction: string;
  stableAction: string;
  confidenceLabel?: "HIGH" | "MED" | "LOW";
  freshnessLabel?: string;
  freshnessState?: Partial<SourceFreshnessState>;
  policyRefusalActive?: boolean;
  policyRefusalReasons?: string[];
  historicalMacroCoverageLabel?: string | null;
}) => {
  const confidenceLow = confidenceLabel === "LOW";
  const resolvedFreshness = resolveFreshnessState({
    freshnessLabel,
    freshnessState,
    isFallbackSnapshot: isFallback,
    isHistoricalSelection: historicalSelection,
  });
  const freshnessUnavailable = resolvedFreshness.freshnessStatus === "unknown";
  const historicalMacroCoverageDetail = historicalSelection && historicalMacroCoverageLabel
    ? ` Macro coverage: ${historicalMacroCoverageLabel}.`
    : "";

  const label = historicalSelection
    ? "Historical snapshot"
    : isFallback
      ? "Using cached data"
      : policyRefusalActive
        ? "Live data, but signals unstable"
      : "Live • Treasury verified";

  const detail = historicalSelection
    ? `Retrospective only — not for live decisions.${historicalMacroCoverageDetail}`
    : isFallback
      ? `Data sources are delayed. Stage decisions, don't commit until live data returns.${fallbackReason ? ` (${fallbackReason})` : ""}`
      : policyRefusalActive
        ? `Live data is available, but recent signals are too contradictory to recommend a posture change. Hold approvals.${policyRefusalReasons[0] ? ` Reason: ${policyRefusalReasons[0]}` : ""}`
      : "All signals aligned. Proceed with normal approvals.";

  const action = historicalSelection
    ? `${historicalAction} ${DECISION_CONTRACT_LABELS.reversal.changeCourseIf}: switch to current live data before changing spending pace.`
    : isFallback
      ? `${fallbackAction} ${DECISION_CONTRACT_LABELS.reversal.changeCourseIf}: live data updates and verifies across all sources.`
      : policyRefusalActive
        ? `Keep approvals reversible. ${DECISION_CONTRACT_LABELS.reversal.changeCourseIf}: signals reconcile and the contradictions resolve.`
      : `${stableAction} ${DECISION_CONTRACT_LABELS.reversal.changeCourseIf}: confidence remains above LOW or transition risk drops.`;

  const tone: TrustStatusTone = historicalSelection
    ? "historical"
    : isFallback || policyRefusalActive
      ? "warning"
      : "stable";

  const classification = resolveOutageClassification({
    historicalSelection,
    isFallback,
    fallbackReason,
  });

  const outageWindow = historicalSelection
    ? "Retrospective only. Not for live approvals."
    : isFallback
      ? "Safe for reversible moves only until a live update lands."
      : policyRefusalActive
        ? "Safe for staged moves only until policy signals clear."
      : "Use this live read for this week's approvals; apply the thresholds shown in the current call.";

  const outageExitGate = buildOutageExitGate({
    isFallback,
    confidenceLow,
    freshnessUnavailable,
  });

  return {
    trustStatusLabel: label,
    trustStatusDetail: detail,
    trustStatusAction: action,
    trustStatusTone: tone,
    outageType: classification.outageType,
    outageSeverity: classification.outageSeverity,
    decisionImpactWindow: outageWindow,
    approvalBuckets: buildApprovalBuckets({ tone }),
    recoveryPlan: buildRecoveryPlan({ tone }),
    outageExitGate,
  };
};

export const buildTrustMarker = ({
  confidenceLabel,
  freshnessMeta,
  isFallbackSnapshot,
  isHistoricalSelection = false,
}: {
  confidenceLabel: "HIGH" | "MED" | "LOW";
  freshnessMeta: CompactFreshnessMeta;
  isFallbackSnapshot: boolean;
  isHistoricalSelection?: boolean;
}) => {
  const trustSummary = buildCompactTrustSummary({
    confidenceLabel,
    freshnessLabel: freshnessMeta.updatedAtLabel,
    isFallbackSnapshot,
    isHistoricalSelection,
  });
  const degraded = isFallbackSnapshot || freshnessMeta.maxAge === "stale" || confidenceLabel === "LOW";
  const label = isHistoricalSelection
    ? "Historical snapshot"
    : degraded
      ? "Degraded trust"
      : "Live trust";
  const tone: "stable" | "warning" | "historical" = isHistoricalSelection
    ? "historical"
    : degraded
      ? "warning"
      : "stable";

  return {
    label,
    tone,
    degraded,
    summaryLine: freshnessMeta.line,
    detail: trustSummary,
  };
};
