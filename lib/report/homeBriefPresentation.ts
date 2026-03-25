export const resolvePostureAndStage = ({
  statusLabel,
  postureLabel,
  stageLabel,
  postureWithStageLabel,
}: {
  statusLabel: string;
  postureLabel?: string;
  stageLabel?: string;
  postureWithStageLabel?: string;
}) => {
  const [derivedPostureLabel, derivedStageLabel] = (postureWithStageLabel ?? "").split(" — ");

  return {
    resolvedPostureLabel: postureLabel ?? derivedPostureLabel ?? statusLabel,
    resolvedStageLabel: stageLabel ?? derivedStageLabel ?? "Unspecified",
  };
};

export const parseMetricNumber = (label: string) => {
  const match = label.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
};

export const buildThresholdMarkerState = (valueLabel: string, watchLabel: string) => {
  const currentValue = parseMetricNumber(valueLabel);
  const thresholdValue = parseMetricNumber(watchLabel);

  if (currentValue === null || thresholdValue === null) {
    return null;
  }

  const lowerBound = Math.min(currentValue, thresholdValue, 0);
  const upperBound = Math.max(currentValue, thresholdValue, 0);
  const padding = Math.max((upperBound - lowerBound) * 0.2, Math.abs(thresholdValue) * 0.15, 0.5);
  const domainMin = lowerBound - padding;
  const domainMax = upperBound + padding;
  const domainRange = Math.max(domainMax - domainMin, 1);
  const normalize = (value: number) => Math.min(96, Math.max(4, ((value - domainMin) / domainRange) * 100));

  return {
    currentPercent: normalize(currentValue),
    thresholdPercent: normalize(thresholdValue),
  };
};
