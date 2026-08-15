import { getTimeMachineRegimeSeries } from "../../../lib/timeMachine/timeMachineCache";
import { getRegimePublicLabel } from "../../../lib/regimePresentation";

export type TransitionForecastDisplay = {
  probabilityPercent: number;
  eventLabel: "Chance conditions change";
  horizonLabel: "by next month";
};

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

  // likelyNext arrives as a raw regime key while currentRegime is already a
  // display label, so the sentence used to read "from Expansion to VOLATILE".
  const likelyNextLabel = likelyNext === "Unknown" ? likelyNext : getRegimePublicLabel(likelyNext);

  const tone = probability > 50
    ? { text: "text-semantic-caution-fg", fill: "var(--color-semantic-caution-border)" }
    : probability > 25
      ? { text: "text-sky-200", fill: "var(--accent-action)" }
      : { text: "text-semantic-easing-fg", fill: "var(--color-semantic-easing-border)" };

  return (
    <div className="max-w-xl mx-auto rounded-lg border border-slate-800/60 bg-slate-950/30 px-5 py-4">
      <p className="type-eyebrow">Regime outlook</p>

      {/* The previous version spent a 112x64 semicircular dial on this single
          scalar and put its only explanation in a title tooltip — invisible in a
          screenshot, unreachable by keyboard. One number belongs in the sentence
          that uses it; the hairline below is the whole graphic it needs. */}
      <p className="mt-2 text-fluid-sm leading-relaxed text-slate-200">
        <span className={`text-fluid-xl font-bold tabular-nums ${tone.text}`}>{probability}%</span>{" "}
        estimated chance conditions shift from {currentRegime} over the next month. The most common
        next observation is {likelyNextLabel}.
      </p>

      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.07]" aria-hidden="true">
        <div className="h-full rounded-full" style={{ width: `${probability}%`, background: tone.fill }} />
      </div>

      {/* Natural frequencies read faster than bare percentages, and this one is
          exact rather than a restatement: probability is defined as 1/avgDuration. */}
      <p className="mt-2 text-fluid-nano leading-relaxed text-white/45">
        About 1 monthly observation in <span className="tabular-nums">{avgDuration}</span>, from the
        average run length for this regime in the historical series. Most useful when you are already
        near a decision boundary.
      </p>
    </div>
  );
}
