type TrustStatusTone = "stable" | "warning" | "historical";

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
      ? (fallbackReason ?? "Live refresh pending. Using last verified snapshot.")
      : "Live refresh healthy. Next expected update: 15m.";

  const action = historicalSelection
    ? historicalAction
    : isFallback
      ? fallbackAction
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
