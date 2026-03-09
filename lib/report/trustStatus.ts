type TrustStatusTone = "stable" | "warning" | "historical";

const FALLBACK_FRESHNESS_LABEL = "Unavailable";

const normalizeFreshnessLabel = (freshnessLabel: string) => {
  const trimmedLabel = freshnessLabel.trim();
  return trimmedLabel.length > 0 ? trimmedLabel : FALLBACK_FRESHNESS_LABEL;
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
  `Confidence ${confidenceLabel} · Freshness ${normalizeFreshnessLabel(freshnessLabel)} · Regime shift watch ${transitionWatch}`;

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
    return `Confidence ${confidenceLabel} (${normalizedFreshness}): keep approvals staged until confidence returns to HIGH.`;
  }

  return `Live confidence ${confidenceLabel} (${normalizedFreshness}): safe for near-term operating decisions.`;
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
  `Posture ${statusLabel} · Confidence ${confidenceLabel} · Effective ${recordDateLabel} · Freshness ${normalizeFreshnessLabel(freshnessLabel)}`;

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
