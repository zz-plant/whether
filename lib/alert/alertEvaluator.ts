export type AlertConditions = {
  regime: string;
  tightness: number;
  riskAppetite: number;
  posture: string;
  recordDate: string;
};

export type LastAlertState = {
  regime: string;
  tightness: number;
  riskAppetite: number;
  lastSentAt: string;
};

export type AlertDecision = {
  type: "regime_change" | "threshold";
  severity: "info" | "warning" | "critical";
  headline: string;
};

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const THRESHOLD_BOUNDARIES = [50, 75] as const;

export const checkRegimeChange = (
  currentRegime: string,
  lastRegime: string,
): boolean => currentRegime !== lastRegime;

export const checkThresholdCrossing = (
  currentScore: number,
  threshold: number,
  lastScore?: number,
): boolean => {
  if (lastScore === undefined) {
    return false;
  }
  const crossedAbove =
    lastScore <= threshold && currentScore > threshold;
  const crossedBelow =
    lastScore >= threshold && currentScore < threshold;
  return crossedAbove || crossedBelow;
};

const buildRegimeDecision = (regime: string): AlertDecision => ({
  type: "regime_change",
  severity: "critical",
  headline: `Regime changed to ${regime}`,
});

const buildThresholdDecision = (
  metric: string,
  score: number,
  threshold: number,
): AlertDecision => ({
  type: "threshold",
  severity: threshold === 75 ? "warning" : "info",
  headline: `${metric} crossed ${threshold} boundary (${score.toFixed(1)})`,
});

const isWithinCooldown = (lastSentAt: string): boolean => {
  const lastMs = Date.parse(lastSentAt);
  if (Number.isNaN(lastMs)) {
    return false;
  }
  return Date.now() - lastMs < ONE_WEEK_MS;
};

export const evaluateAlert = (
  readiness: AlertConditions,
  lastKnown: LastAlertState | null,
): AlertDecision[] => {
  const decisions: AlertDecision[] = [];

  const regimeChanged = lastKnown
    ? checkRegimeChange(readiness.regime, lastKnown.regime)
    : true;

  if (regimeChanged) {
    decisions.push(buildRegimeDecision(readiness.regime));
  }

  for (const boundary of THRESHOLD_BOUNDARIES) {
    if (
      lastKnown &&
      checkThresholdCrossing(
        readiness.tightness,
        boundary,
        lastKnown.tightness,
      )
    ) {
      decisions.push(
        buildThresholdDecision("Tightness", readiness.tightness, boundary),
      );
    }

    if (
      lastKnown &&
      checkThresholdCrossing(
        readiness.riskAppetite,
        boundary,
        lastKnown.riskAppetite,
      )
    ) {
      decisions.push(
        buildThresholdDecision(
          "Risk Appetite",
          readiness.riskAppetite,
          boundary,
        ),
      );
    }
  }

  if (lastKnown && isWithinCooldown(lastKnown.lastSentAt) && regimeChanged) {
    return decisions.filter((d) => d.type === "regime_change");
  }

  if (lastKnown && isWithinCooldown(lastKnown.lastSentAt)) {
    return [];
  }

  return decisions;
};
