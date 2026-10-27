import { getTimeMachineRegimeSeries } from "../timeMachine/timeMachineCache";
import { classifyRegimeQuadrant } from "../regimeStateMachine";

type RegimeContext = {
  currentRegime: string;
  /**
   * Consecutive month-end snapshots, counting back from `latestSnapshot`, that were in
   * this regime. Months, not weeks: the record this reads is monthly. It was named
   * `weeksActive`, and an agent told "8 weeks" was being told 8 months.
   */
  monthsActive: number;
  /** How long this regime's earlier runs lasted on average, in months. */
  historicalAvgMonths: number | null;
  commonOutcome: string | null;
  outcomeProbability: number | null;
  /**
   * The last month-end snapshot every count above runs to, and the regime it was in. A regime
   * that began after it has `monthsActive` 0, which is a fact about the record and not a
   * finding that the regime is not the current one.
   */
  latestSnapshot: { recordDate: string; regime: string } | null;
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
  let monthsActive = 0;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].regime === currentRegime) {
      monthsActive++;
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
  const pastOccurrences = occurrences.filter((o) => o.end < series.length - monthsActive);
  const historicalDurations = pastOccurrences.map((o) => o.end - o.start + 1);
  const avgMonths = historicalDurations.length > 0
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

  const latest = series.at(-1);
  return {
    currentRegime,
    monthsActive,
    historicalAvgMonths: avgMonths,
    commonOutcome,
    outcomeProbability,
    latestSnapshot: latest ? { recordDate: latest.recordDate, regime: latest.regime } : null,
  };
}

/**
 * Project how many weeks until a threshold crossing, given current scores and deltas.
 *
 * Direction-blind: it divides the nearest line's distance by the fastest pace, whichever way
 * either score is moving, so two scores running away from both lines read as a crossing in a
 * week. The alert path (`lib/alert/checkRegimeChange.ts`) still calls this, and feeds it the
 * change since the week's comparison reading as a weekly pace: since 2026-10-07 that is last
 * week's brief, a week, where the archive has one, and otherwise still the previous month-end
 * snapshot; changing what that posts to Slack is a decision for the owner and is not made here
 * (docs/feature-specs-current.md §6.9). The agent tool asks `projectRegimeFromPace`.
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
    return { weeksToFlip: null, projectedRegime: null, velocityLabel: "Slow movement — no change in conditions expected soon." };
  }

  const weeksEstimate = Math.round(minDist / maxVelocity);
  const velocityLabel = weeksEstimate <= 4
    ? `At this pace, a score could cross its line within ${weeksEstimate} ${weeksEstimate === 1 ? "week" : "weeks"}.`
    : `Slow trend — no change in conditions expected soon.`;

  /* Project which regime would follow */
  const tightDir = tightnessVelocity > 0 ? "tightening" : "easing";

  const projectedRegime = weeksEstimate <= 4
    ? (tightDir === "tightening" ? "SCARCITY" : "EXPANSION")
    : null;

  return { weeksToFlip: weeksEstimate <= 4 ? weeksEstimate : null, projectedRegime, velocityLabel };
}

/** How far ahead a pace is read: a straight line drawn further than a month says more than the data does. */
const PROJECTION_HORIZON_WEEKS = 4;

/** Below this many points a week a score is not moving. */
const MIN_PACE_POINTS_PER_WEEK = 0.5;

/**
 * Where the two scores land if they keep their pace, and how soon that is a different regime.
 *
 * Direction-aware, and drawn from the engine's own quadrant table (`classifyRegimeQuadrant`):
 * each week both scores move by their pace, and the first week they classify differently from
 * where they sit now is the answer, with the regime they classify into. Scores moving away from
 * their lines do not cross them. `sitsIn` is the regime the scores classify into today, which
 * is not always the committed one: a change waits for confirmation.
 */
export function projectRegimeFromPace({
  tightness,
  riskAppetite,
  tightnessPerWeek,
  riskAppetitePerWeek,
  tightnessThreshold = 70,
  riskAppetiteThreshold = 50,
}: {
  tightness: number;
  riskAppetite: number;
  /** Points per week: the pace, not the change since an earlier reading. */
  tightnessPerWeek: number;
  riskAppetitePerWeek: number;
  tightnessThreshold?: number;
  riskAppetiteThreshold?: number;
}): RegimeProjection & { sitsIn: string } {
  const thresholds = { tightnessRegime: tightnessThreshold, riskAppetiteRegime: riskAppetiteThreshold };
  const quadrantAt = (week: number) =>
    classifyRegimeQuadrant({
      tightness: tightness + tightnessPerWeek * week,
      riskAppetite: riskAppetite + riskAppetitePerWeek * week,
      thresholds,
    });
  const sitsIn = quadrantAt(0);

  if (tightnessPerWeek === 0 && riskAppetitePerWeek === 0) {
    return { weeksToFlip: null, projectedRegime: null, velocityLabel: "Stable — no significant movement.", sitsIn };
  }
  if (Math.max(Math.abs(tightnessPerWeek), Math.abs(riskAppetitePerWeek)) < MIN_PACE_POINTS_PER_WEEK) {
    return { weeksToFlip: null, projectedRegime: null, velocityLabel: "Slow movement — no change in conditions expected soon.", sitsIn };
  }

  for (let week = 1; week <= PROJECTION_HORIZON_WEEKS; week += 1) {
    const then = quadrantAt(week);
    if (then !== sitsIn) {
      return {
        weeksToFlip: week,
        projectedRegime: then,
        velocityLabel: `At this pace, a score could cross its line within ${week} ${week === 1 ? "week" : "weeks"}.`,
        sitsIn,
      };
    }
  }

  const closing = [
    { score: tightness, pace: tightnessPerWeek, line: tightnessThreshold },
    { score: riskAppetite, pace: riskAppetitePerWeek, line: riskAppetiteThreshold },
  ].some(({ score, pace, line }) => Math.abs(pace) >= MIN_PACE_POINTS_PER_WEEK && Math.abs(score + pace - line) < Math.abs(score - line));
  return {
    weeksToFlip: null,
    projectedRegime: null,
    velocityLabel: closing
      ? "Slow trend — no change in conditions expected soon."
      : "Moving away from the lines — no change in conditions expected soon.",
    sitsIn,
  };
}
