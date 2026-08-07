import { getTimeMachineRegimeSeries } from "../../../lib/timeMachine/timeMachineCache";
import type { RegimeKey } from "../../../lib/regimeEngine";

const REGIME_ORDER: RegimeKey[] = ["EXPANSION", "VOLATILE", "DEFENSIVE", "SCARCITY"];

export function computeTransitionProbability(currentRegime: string): {
  probability: number;
  likelyNext: string;
  avgDuration: number;
} {
  const series = getTimeMachineRegimeSeries(60);
  if (series.length < 6) return { probability: 0, likelyNext: "Unknown", avgDuration: 0 };

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
  };
}

export function RegimeTransitionProbability({ currentRegime }: { currentRegime: string }) {
  let probability = 0;
  let likelyNext = "Unknown";
  let avgDuration = 0;

  try {
    const result = computeTransitionProbability(currentRegime);
    probability = result.probability;
    likelyNext = result.likelyNext;
    avgDuration = result.avgDuration;
  } catch { /* time machine cache may be empty in dev */ }

  if (probability === 0) return null;

  const arcRotation = (probability / 100) * 180;
  const color = probability > 50 ? "text-amber-200" : probability > 25 ? "text-sky-200" : "text-emerald-200";
  const strokeColor = probability > 50 ? "#fcd34d" : probability > 25 ? "#7dd3fc" : "#6ee7b7";

  return (
    <div className="max-w-xl mx-auto rounded-lg border border-slate-800/60 bg-slate-950/30 px-5 py-4">
      <p className="text-fluid-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Regime outlook</p>
      <div className="mt-3 flex items-center gap-4">
        <svg viewBox="0 0 80 44" className="h-16 w-28 flex-shrink-0" aria-hidden="true">
          <path
            d="M 10 34 A 30 30 0 0 1 70 34"
            fill="none"
            stroke={strokeColor}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={`${(arcRotation / 180) * 94} 200`}
            opacity="0.85"
          />
          <circle cx="40" cy="34" r="2" fill={strokeColor} />
        </svg>
        <div title={`Based on ${avgDuration}-week historical pattern. A regime is a specific combination of credit availability and investor risk appetite. Transitions happen when market conditions shift — watch this % when you're at decision boundaries.`}>
          <p className={`text-lg font-bold ${color}`}>{probability}%</p>
          <p className="text-xs text-slate-400">
            chance of transitioning from {currentRegime} to {likelyNext} within {avgDuration} weeks
          </p>
        </div>
      </div>
    </div>
  );
}
