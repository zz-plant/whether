import { getTimeMachineRegimeSeries } from "../timeMachine/timeMachineCache";

type RegimeContext = {
  currentRegime: string;
  weeksActive: number;
  historicalAvgWeeks: number | null;
  commonOutcome: string | null;
  outcomeProbability: number | null;
};

type RegimeProjection = {
  weeksToFlip: number | null;
  projectedRegime: string | null;
  velocityLabel: string;
};

/**
 * Analyze regime history to provide context: how long has this regime been
 * active, how does that compare to history, and what usually comes next.
 */
export function getRegimeContext(currentRegime: string): RegimeContext {
  const series = getTimeMachineRegimeSeries();

  /* Find how long the current regime has been active */
  let weeksActive = 0;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].regime === currentRegime) {
      weeksActive++;
    } else {
      break;
    }
  }

  /* Find all past occurrences of this regime */
  const occurrences: { start: number; end: number }[] = [];
  let occStart: number | null = null;
  for (let i = 0; i < series.length; i++) {
    if (series[i].regime === currentRegime) {
      if (occStart === null) occStart = i;
    } else {
      if (occStart !== null) {
        occurrences.push({ start: occStart, end: i - 1 });
        occStart = null;
      }
    }
  }

  /* Exclude the current occurrence */
  const pastOccurrences = occurrences.filter((o) => o.end < series.length - weeksActive);
  const historicalDurations = pastOccurrences.map((o) => o.end - o.start + 1);
  const avgWeeks = historicalDurations.length > 0
    ? Math.round(historicalDurations.reduce((a, b) => a + b, 0) / historicalDurations.length)
    : null;

  /* What usually follows this regime */
  const outcomes: Record<string, number> = {};
  pastOccurrences.forEach((o) => {
    const nextIdx = o.end + 1;
    if (nextIdx < series.length) {
      const next = series[nextIdx].regime;
      outcomes[next] = (outcomes[next] ?? 0) + 1;
    }
  });

  const outcomeEntries = Object.entries(outcomes);
  const total = outcomeEntries.reduce((a, [, c]) => a + c, 0);
  const commonOutcome = outcomeEntries.length > 0
    ? outcomeEntries.sort((a, b) => b[1] - a[1])[0][0]
    : null;
  const outcomeProbability = commonOutcome && total > 0
    ? Math.round((outcomes[commonOutcome] / total) * 100)
    : null;

  return { currentRegime, weeksActive, historicalAvgWeeks: avgWeeks, commonOutcome, outcomeProbability };
}

/**
 * Project how many weeks until a threshold crossing, given current scores and deltas.
 */
export function getRegimeProjection(
  currentRegime: string,
  tightness: number,
  riskAppetite: number,
  /* Week-over-week change in the score, i.e. points per week. NOT
   * `RegimeDiagnostics.tightnessDelta`, which carries the same name but is a
   * distance from the threshold; passing that compiles and yields a
   * dimensionless ratio rendered as weeks. */
  tightnessVelocity: number,
  riskAppetiteVelocity: number,
  tightnessThreshold = 70,
  riskAppetiteThreshold = 50,
): RegimeProjection {
  if (tightnessVelocity === 0 && riskAppetiteVelocity === 0) {
    return { weeksToFlip: null, projectedRegime: null, velocityLabel: "Stable — no significant movement." };
  }

  /* Determine which dimension is moving toward its threshold */
  const tightDist = currentRegime === "SCARCITY" || currentRegime === "DEFENSIVE"
    ? tightness - tightnessThreshold  /* positive = above threshold */
    : tightnessThreshold - tightness; /* positive = below threshold */
  const riskDist = currentRegime === "SCARCITY" || currentRegime === "VOLATILE"
    ? riskAppetiteThreshold - riskAppetite
    : riskAppetite - riskAppetiteThreshold;

  const tightVelocity = Math.abs(tightnessVelocity);
  const riskVelocity = Math.abs(riskAppetiteVelocity);
  const maxVelocity = Math.max(tightVelocity, riskVelocity);
  const minDist = Math.min(Math.abs(tightDist), Math.abs(riskDist));

  if (maxVelocity < 0.5 || minDist > 40) {
    return { weeksToFlip: null, projectedRegime: null, velocityLabel: "Slow movement — no change to the call expected soon." };
  }

  const weeksEstimate = Math.round(minDist / maxVelocity);
  const velocityLabel = weeksEstimate <= 4
    ? `At current pace, threshold crossing possible within ${weeksEstimate} ${weeksEstimate === 1 ? "week" : "weeks"}.`
    : `Slow trend — no change to the call expected soon.`;

  /* Project which regime would follow */
  const tightDir = tightnessVelocity > 0 ? "tightening" : "easing";

  const projectedRegime = weeksEstimate <= 4
    ? (tightDir === "tightening" ? "SCARCITY" : "EXPANSION")
    : null;

  return { weeksToFlip: weeksEstimate <= 4 ? weeksEstimate : null, projectedRegime, velocityLabel };
}
