import {
  DEFAULT_THRESHOLDS,
  REGIME_CONFIDENCE_NEAR_THRESHOLD,
  type RegimeThresholds,
} from "../regimeEngineCore";

/**
 * Grades the historical record of regime calls against what the series then did.
 *
 * The product publishes calls with thresholds and reversal conditions, and
 * /history bills itself as the permanent record cited in board documents — but
 * nothing ever said whether the record held up. These stats are the honest,
 * engine-true version of that grading: no forecast is invented, and "signaled"
 * is defined by the engine's own boundaries (tightness/riskAppetite lines) and
 * its own near-band constant, not by numbers this module made up.
 */

export type TrackRecordObservation = {
  recordDate: string;
  regime: string;
  tightness: number;
  riskAppetite: number;
};

export type RegimeSpellRecord = {
  regime: string;
  startDate: string;
  endDate: string;
  months: number;
  /** False for the spell still running at the end of the window. */
  completed: boolean;
};

export type FlippedAxis = "tightness" | "riskAppetite";

export type RegimeTransitionRecord = {
  /** First observation inside the new regime. */
  atDate: string;
  from: string;
  to: string;
  /** Which classification lines were crossed at the flip. */
  flippedAxes: FlippedAxis[];
  /**
   * Consecutive months immediately before the flip where a crossing axis sat
   * within the near band of its line while still on the old side — i.e. how
   * long the flip was visibly coming.
   */
  leadMonths: number;
  signaled: boolean;
};

export type RegimeTrackRecord = {
  observations: number;
  windowStart: string | null;
  windowEnd: string | null;
  spells: RegimeSpellRecord[];
  transitions: RegimeTransitionRecord[];
  /** Median length of completed spells; null until one spell has completed. */
  medianHoldMonths: number | null;
  /** Completed spells that lasted a single month — call churn, the trust killer. */
  whipsawCount: number;
  signaledCount: number;
  nearBandPts: number;
};

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export const buildRegimeTrackRecord = (
  series: readonly TrackRecordObservation[],
  thresholds: Pick<RegimeThresholds, "tightnessRegime" | "riskAppetiteRegime"> = DEFAULT_THRESHOLDS,
  nearBandPts: number = REGIME_CONFIDENCE_NEAR_THRESHOLD,
): RegimeTrackRecord => {
  const spells: RegimeSpellRecord[] = [];
  const transitions: RegimeTransitionRecord[] = [];

  const tightSide = (obs: TrackRecordObservation) => obs.tightness >= thresholds.tightnessRegime;
  const appetiteSide = (obs: TrackRecordObservation) => obs.riskAppetite >= thresholds.riskAppetiteRegime;

  for (let i = 0; i < series.length; i += 1) {
    const obs = series[i];
    const last = spells[spells.length - 1];
    if (last && last.regime === obs.regime) {
      last.endDate = obs.recordDate;
      last.months += 1;
      continue;
    }
    if (last) last.completed = true;
    spells.push({
      regime: obs.regime,
      startDate: obs.recordDate,
      endDate: obs.recordDate,
      months: 1,
      completed: false,
    });

    if (i === 0) continue;

    const prev = series[i - 1];
    const flippedAxes: FlippedAxis[] = [];
    if (tightSide(prev) !== tightSide(obs)) flippedAxes.push("tightness");
    if (appetiteSide(prev) !== appetiteSide(obs)) flippedAxes.push("riskAppetite");

    /* Lead: walk back through the old regime counting months where a crossing
       axis was already inside the near band of the line it went on to cross.
       An axis that jumped the line from far outside the band contributes no
       lead — that is exactly the unsignaled case this surface exists to admit. */
    let leadMonths = 0;
    for (let j = i - 1; j >= 0; j -= 1) {
      const back = series[j];
      if (back.regime !== prev.regime) break;
      const inBand = flippedAxes.some((axis) => {
        const line = axis === "tightness" ? thresholds.tightnessRegime : thresholds.riskAppetiteRegime;
        const value = axis === "tightness" ? back.tightness : back.riskAppetite;
        const oldSide = axis === "tightness" ? tightSide(prev) : appetiteSide(prev);
        const backSide = value >= line;
        return backSide === oldSide && Math.abs(value - line) <= nearBandPts;
      });
      if (!inBand) break;
      leadMonths += 1;
    }

    transitions.push({
      atDate: obs.recordDate,
      from: prev.regime,
      to: obs.regime,
      flippedAxes,
      leadMonths,
      signaled: leadMonths >= 1,
    });
  }

  const completedSpells = spells.filter((spell) => spell.completed);

  return {
    observations: series.length,
    windowStart: series[0]?.recordDate ?? null,
    windowEnd: series[series.length - 1]?.recordDate ?? null,
    spells,
    transitions,
    medianHoldMonths: median(completedSpells.map((spell) => spell.months)),
    whipsawCount: completedSpells.filter((spell) => spell.months <= 1).length,
    signaledCount: transitions.filter((transition) => transition.signaled).length,
    nearBandPts,
  };
};
