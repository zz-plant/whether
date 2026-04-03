import type { CompactFreshnessMeta } from "./reportFormatting";

type TrustStatusTone = "stable" | "warning" | "historical";

type TrustOutageSeverity = "advisory" | "blocking" | "critical";

type TrustOutageType = "live-data" | "feed-unavailable" | "stale-cache" | "source-divergence" | "historical-snapshot";

export type TrustApprovalBucket = {
  label: "Allowed now" | "Hold" | "Blocked";
  detail: string;
};

export type TrustRecoveryPlan = {
  owner: string;
  nextCheckpoint: string;
  exitCondition: string;
};

export type TrustExitGateCriterion = {
  key: "live-mode" | "freshness" | "confidence";
  label: string;
  met: boolean;
};

export type TrustExitGate = {
  label: string;
  summary: string;
  metCount: number;
  totalCount: number;
  criteria: TrustExitGateCriterion[];
};

export type FailureModeWarning = {
  id: "boundary-whipsaw" | "stale-cached" | "anomaly-divergence";
  warning: string;
  mitigationCheck: string;
};

export type DecisionReadinessState = {
  label: "Act" | "Act with caution" | "Hold";
  tone: TrustStatusTone;
  detail: string;
};

const FALLBACK_FRESHNESS_LABEL = "Unavailable";

const normalizeFreshnessLabel = (freshnessLabel: string) => {
  const trimmedLabel = freshnessLabel.trim();
  return trimmedLabel.length > 0 ? trimmedLabel : FALLBACK_FRESHNESS_LABEL;
};

const isUnavailableFreshness = (freshnessLabel: string) =>
  normalizeFreshnessLabel(freshnessLabel) === FALLBACK_FRESHNESS_LABEL;

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

const buildApprovalBuckets = ({
  tone,
}: {
  tone: TrustStatusTone;
}): TrustApprovalBucket[] => {
  if (tone === "historical") {
    return [
      {
        label: "Allowed now",
        detail: "Retrospective analysis and scenario planning only.",
      },
      {
        label: "Hold",
        detail: "Weekly pacing changes until current live data is loaded.",
      },
      {
        label: "Blocked",
        detail: "Irreversible approvals tied to net-new fixed spend.",
      },
    ];
  }

  if (tone === "warning") {
    return [
      {
        label: "Allowed now",
        detail: "Reversible pacing adjustments inside existing guardrails.",
      },
      {
        label: "Hold",
        detail: "Headcount expansion or multi-quarter vendor commitments.",
      },
      {
        label: "Blocked",
        detail: "Irreversible approvals until one verified live refresh lands.",
      },
    ];
  }

  return [
    {
      label: "Allowed now",
      detail: "Standard weekly approvals under the current operating call.",
    },
    {
      label: "Hold",
      detail: "No additional holds required while trust remains stable.",
    },
    {
      label: "Blocked",
      detail: "No outage-specific blocks in this state.",
    },
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

export const buildFailureModeWarnings = ({
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
}): FailureModeWarning[] => {
  const warnings: FailureModeWarning[] = [];
  const staleSignal =
    isFallbackSnapshot ||
    isUnavailableFreshness(freshnessLabel) ||
    (provenanceStatusLabel?.toLowerCase().includes("cached") ?? false);

  if (staleSignal) {
    warnings.push({
      id: "stale-cached",
      warning: "Potential stale snapshot bias: live signal freshness is degraded.",
      mitigationCheck: "Mitigation check: confirm next live refresh before approving irreversible spend.",
    });
  }

  if (
    confidenceLabel === "LOW" &&
    transitionWatch === "ON" &&
    (changedSignals.length >= 2 || hasStrongSignalDisagreement(changedSignals))
  ) {
    warnings.push({
      id: "boundary-whipsaw",
      warning: "Boundary whipsaw risk: call is near a flip threshold with unstable weekly motion.",
      mitigationCheck: "Mitigation check: require one confirming read before escalating fixed-cost commitments.",
    });
  }

  if (anomalySignals.length >= 2) {
    warnings.push({
      id: "anomaly-divergence",
      warning: "Signal divergence risk: multiple anomalies may overstate this week's directional call.",
      mitigationCheck: "Mitigation check: cross-check anomalous inputs against source-level provenance before changing pace.",
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
}) =>
  `Signal reliability ${confidenceLabel} · Freshness ${normalizeFreshnessLabel(freshnessLabel)} · Regime shift watch ${transitionWatch}`;

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
    return `Historical snapshot (${normalizedFreshness}): use for retrospectives, not live approvals.`;
  }

  if (isFallbackSnapshot) {
    return `Cached snapshot (${normalizedFreshness}): use for pacing and defer irreversible commitments.`;
  }

  if (confidenceLabel !== "HIGH") {
    return `Signal reliability ${confidenceLabel} (${normalizedFreshness}): keep approvals staged until reliability returns to HIGH.`;
  }

  return `Live signal reliability ${confidenceLabel} (${normalizedFreshness}): safe for near-term operating decisions.`;
};

export const resolveTrustReadinessCopy = ({
  trustStatusTone,
  degradedSourceRows,
  trustStatusDetail,
}: {
  trustStatusTone: TrustStatusTone;
  degradedSourceRows?: Array<unknown>;
  trustStatusDetail?: string;
}): { tone: TrustStatusTone; headline: string } => {
  const hasDegradedSources = (degradedSourceRows?.length ?? 0) > 0;
  const hasConstrainedDetail = (trustStatusDetail ?? "").toLowerCase().includes("too weak")
    || (trustStatusDetail ?? "").toLowerCase().includes("low")
    || (trustStatusDetail ?? "").toLowerCase().includes("staged");
  const tone = trustStatusTone === "historical"
    ? "historical"
    : hasDegradedSources || trustStatusTone === "warning" || hasConstrainedDetail
      ? "warning"
      : "stable";

  return {
    tone,
    headline: tone === "historical"
      ? "Historical snapshot"
      : tone === "warning"
        ? "Readiness constrained"
        : "Readiness clear",
  };
};

export const buildDecisionReadinessState = ({
  confidenceLabel,
  freshnessLabel,
  isFallbackSnapshot,
  isHistoricalSelection = false,
}: {
  confidenceLabel: "HIGH" | "MED" | "LOW";
  freshnessLabel: string;
  isFallbackSnapshot: boolean;
  isHistoricalSelection?: boolean;
}): DecisionReadinessState => {
  const normalizedFreshness = normalizeFreshnessLabel(freshnessLabel);
  const freshnessUnavailable = isUnavailableFreshness(normalizedFreshness);

  if (isHistoricalSelection) {
    return {
      label: "Hold",
      tone: "historical",
      detail: "Historical snapshot only. Do not use this read for live approvals.",
    };
  }

  if (confidenceLabel === "LOW" || freshnessUnavailable) {
    return {
      label: "Hold",
      tone: "warning",
      detail: "Confidence or freshness is too weak for new irreversible approvals. Wait for a verified live refresh.",
    };
  }

  if (isFallbackSnapshot || confidenceLabel === "MED") {
    return {
      label: "Act with caution",
      tone: "warning",
      detail: `Use the weekly call for staged moves, but keep irreversible commitments gated until reliability improves from ${confidenceLabel} (${normalizedFreshness}).`,
    };
  }

  return {
    label: "Act",
    tone: "stable",
    detail: `Fresh live data (${normalizedFreshness}) and HIGH confidence support this week's bounded approvals.`,
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
  `Posture ${statusLabel} · Signal reliability ${confidenceLabel} · Decision as-of ${recordDateLabel} · Data refreshed ${normalizeFreshnessLabel(freshnessLabel)}`;

export const buildTrustStatus = ({
  historicalSelection,
  isFallback,
  fallbackReason,
  historicalAction,
  fallbackAction,
  stableAction,
  confidenceLabel = "MED",
  freshnessLabel = FALLBACK_FRESHNESS_LABEL,
}: {
  historicalSelection: boolean;
  isFallback: boolean;
  fallbackReason?: string;
  historicalAction: string;
  fallbackAction: string;
  stableAction: string;
  confidenceLabel?: "HIGH" | "MED" | "LOW";
  freshnessLabel?: string;
}) => {
  const confidenceLow = confidenceLabel === "LOW";
  const freshnessUnavailable = isUnavailableFreshness(freshnessLabel);

  const label = historicalSelection
    ? "Historical snapshot"
    : isFallback
      ? "Using last verified snapshot"
      : "Live • Treasury verified";

  const detail = historicalSelection
    ? "Decision impact: keep today’s do now / hold / revisit path, but treat this view as retrospective only."
    : isFallback
      ? `Decision impact: keep today’s do now / hold / revisit path. Pause irreversible approvals until live data resumes.${fallbackReason ? ` Source issue: ${fallbackReason}` : ""}`
      : "Decision impact: proceed with today’s do now / hold / revisit path under normal approval cadence.";

  const action = historicalSelection
    ? `${historicalAction} Trigger: confidence LOW. Reversal: switch to current data before changing pace.`
    : isFallback
      ? `${fallbackAction} Trigger: confidence LOW or feed unavailable. Reversal: resume normal approvals after one verified live refresh.`
      : `${stableAction} Trigger: confidence drops. Reversal: return to standard cadence once reliability recovers.`;

  const tone: TrustStatusTone = historicalSelection
    ? "historical"
    : isFallback
      ? "warning"
      : "stable";

  const classification = resolveOutageClassification({
    historicalSelection,
    isFallback,
    fallbackReason,
  });

  const outageWindow = historicalSelection
    ? "Retrospective only; do not use for live approvals."
    : isFallback
      ? "Outage window: safe for reversible pacing moves only until one live refresh lands."
      : "Live window: safe for near-term operating approvals under standard guardrails.";

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
