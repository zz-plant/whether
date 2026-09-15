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

type TrackRecordObservation = {
  recordDate: string;
  regime: string;
  tightness: number;
  riskAppetite: number;
};

type RegimeSpellRecord = {
  regime: string;
  startDate: string;
  endDate: string;
  months: number;
  /** False for the spell still running at the end of the window. */
  completed: boolean;
};

type FlippedAxis = "tightness" | "riskAppetite";

const ALL_AXES: FlippedAxis[] = ["tightness", "riskAppetite"];

type RegimeTransitionRecord = {
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

type RegimeTrackRecord = {
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

/**
 * Which side of an axis's classification line a regime quadrant sits on.
 *
 * Every quadrant pins both axes (SCARCITY = tight above the line, appetite
 * below; DEFENSIVE = both above; VOLATILE = both below; EXPANSION = tightness
 * below, appetite above), so the axes a flip moved are read off the two
 * quadrants — not off a side change between the last two published
 * observations. Under the confirmation gate the label moves a read after the
 * score crossed (Aug 2022 sat in the SCARCITY quadrant at tightness 75 while
 * still publishing VOLATILE), so a consecutive-observation comparison sees no
 * crossing at all and grades a banded, gated flip as unsignaled.
 */
const regimeSide = (regime: string, axis: FlippedAxis): boolean => {
  switch (regime) {
    case "SCARCITY":
      return axis === "tightness";
    case "DEFENSIVE":
      return true;
    case "VOLATILE":
      return false;
    default:
      return axis === "riskAppetite";
  }
};

export const buildRegimeTrackRecord = (
  series: readonly TrackRecordObservation[],
  thresholds: Pick<RegimeThresholds, "tightnessRegime" | "riskAppetiteRegime"> = DEFAULT_THRESHOLDS,
  nearBandPts: number = REGIME_CONFIDENCE_NEAR_THRESHOLD,
): RegimeTrackRecord => {
  const spells: RegimeSpellRecord[] = [];
  const transitions: RegimeTransitionRecord[] = [];

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
    const flippedAxes: FlippedAxis[] = ALL_AXES.filter(
      (axis) => regimeSide(prev.regime, axis) !== regimeSide(obs.regime, axis),
    );

    /* Lead: walk back through the old regime counting months where a crossing
       axis sat within the near band of the line it went on to cross — either
       side of the line. The band is a warning zone, not a side: under the
       confirmation gate a flip publishes after the score has already crossed
       and dwelt in the band on the new side (Jul 2022 tightness 71, Aug 75,
       published Sep), and counting only old-side dwell would call every gated
       flip unsignaled. An axis that jumped the line from far outside the band
       contributes no lead — that is exactly the unsignaled case this surface
       exists to admit. */
    let leadMonths = 0;
    for (let j = i - 1; j >= 0; j -= 1) {
      const back = series[j];
      if (back.regime !== prev.regime) break;
      const inBand = flippedAxes.some((axis) => {
        const line = axis === "tightness" ? thresholds.tightnessRegime : thresholds.riskAppetiteRegime;
        const value = axis === "tightness" ? back.tightness : back.riskAppetite;
        return Math.abs(value - line) <= nearBandPts;
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
