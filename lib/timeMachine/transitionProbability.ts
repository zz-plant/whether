import { getTimeMachineRegimeSeries } from "./timeMachineCache";

type TransitionForecastDisplay = {
  probabilityPercent: number;
  eventLabel: "Chance conditions change";
  horizonLabel: "by next month";
};

/**
 * Internal model diagnostic. Estimates a one-observation (one-month) exit rate
 * for the current regime from the historical time-machine series, plus the most
 * common next observation. Kept for model analysis and tests; not rendered as a
 * user product surface.
 */
export function computeTransitionProbability(currentRegime: string): {
  probability: number;
  likelyNext: string;
  avgDuration: number;
  forecast: TransitionForecastDisplay | null;
} {
  const series = getTimeMachineRegimeSeries(60);
  if (series.length < 6) {
    return { probability: 0, likelyNext: "Unknown", avgDuration: 0, forecast: null };
  }

  const current = currentRegime.toUpperCase();
  let transitions = 0;
  let currentStreak = 0;
  const nextRegimes: Record<string, number> = {};

  for (let i = 0; i < series.length; i++) {
    const entry = series[i];
    if (entry.regime.toUpperCase() === current) {
      currentStreak++;
    } else {
      if (currentStreak > 0 && i < series.length - 1) {
        transitions++;
        const next = series[i].regime;
        nextRegimes[next] = (nextRegimes[next] ?? 0) + 1;
      }
      currentStreak = 0;
    }
  }

  const mostLikely = Object.entries(nextRegimes).sort((a, b) => b[1] - a[1])[0];
  const avgDuration = transitions > 0
    ? Math.round(series.filter((e) => e.regime.toUpperCase() === current).length / transitions)
    : 12;
  const probability = Math.min(95, Math.round((1 / Math.max(avgDuration, 1)) * 100));

  return {
    probability,
    likelyNext: mostLikely ? mostLikely[0] : "Unknown",
    avgDuration,
    // The time-machine series contains monthly observations. The reciprocal of
    // the average run length is therefore a one-observation (one-month) exit
    // rate for the current regime, not a multi-week probability of reaching the
    // most common next regime.
    forecast: probability > 0
      ? {
          probabilityPercent: probability,
          eventLabel: "Chance conditions change",
          horizonLabel: "by next month",
        }
      : null,
  };
}