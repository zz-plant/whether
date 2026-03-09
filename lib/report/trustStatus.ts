type TrustStatusTone = "stable" | "warning" | "historical";

export type FailureModeWarning = {
  id: "boundary-whipsaw" | "stale-cached" | "anomaly-divergence";
  warning: string;
  mitigationCheck: string;
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
  `Posture ${statusLabel} · Signal reliability ${confidenceLabel} · Effective ${recordDateLabel} · Freshness ${normalizeFreshnessLabel(freshnessLabel)}`;

export const buildTrustStatus = ({
  historicalSelection,
  isFallback,
  fallbackReason,
  historicalAction,
  fallbackAction,
  stableAction,
}: {
  historicalSelection: boolean;
  isFallback: boolean;
  fallbackReason?: string;
  historicalAction: string;
  fallbackAction: string;
  stableAction: string;
}) => {
  const label = historicalSelection
    ? "Historical snapshot"
    : isFallback
      ? "Using last verified snapshot"
      : "Live • Treasury verified";

  const detail = historicalSelection
    ? "Viewing archived Treasury data for the selected month."
    : isFallback
      ? (fallbackReason ?? "Live refresh pending. Using last verified snapshot for near-term pacing only.")
      : "Live refresh healthy. Next expected update: 15m.";

  const action = historicalSelection
    ? historicalAction
    : isFallback
      ? `${fallbackAction} Pause irreversible decisions until live refresh returns.`
      : stableAction;

  const tone: TrustStatusTone = historicalSelection
    ? "historical"
    : isFallback
      ? "warning"
      : "stable";

  return {
    trustStatusLabel: label,
    trustStatusDetail: detail,
    trustStatusAction: action,
    trustStatusTone: tone,
  };
};
