/**
 * The premise test's statistics and decision rule, exactly as registered in
 * docs/research/premise-test-preregistration.md (§6, §8, §9). Pure functions;
 * `scripts/research/premiseTest.ts` assembles the data and calls them.
 */

/* ------------------------------------------------------------------------ */
/* Resampling                                                                */
/* ------------------------------------------------------------------------ */

/** Registered bootstrap settings (§6.1). */
export const BOOTSTRAP = { blockLength: 8, resamples: 10_000, seed: 20261009 } as const;

/** mulberry32: a small seeded generator, so every interval reproduces from the seed. */
const seededRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

/**
 * Circular moving-block bootstrap index sets: each resample is blocks of
 * `blockLength` consecutive positions (wrapping at the end), starting uniformly
 * at random, concatenated and cut to `n`. Shared by every statistic so the
 * paired comparison resamples the same blocks for each ramp.
 */
export const blockBootstrapIndices = (
  n: number,
  { blockLength, resamples, seed }: { blockLength: number; resamples: number; seed: number },
): number[][] => {
  const random = seededRandom(seed);
  const sets: number[][] = [];
  for (let resample = 0; resample < resamples; resample += 1) {
    const indices: number[] = [];
    while (indices.length < n) {
      const start = Math.floor(random() * n);
      for (let offset = 0; offset < blockLength && indices.length < n; offset += 1) {
        indices.push((start + offset) % n);
      }
    }
    sets.push(indices);
  }
  return sets;
};

/** The 2.5th and 97.5th percentiles of the finite values (linear interpolation). */
export const percentileInterval = (values: readonly number[]): { low: number; high: number } | null => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) {
    return null;
  }
  const at = (q: number) => {
    const position = (sorted.length - 1) * q;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
  };
  return { low: at(0.025), high: at(0.975) };
};

/* ------------------------------------------------------------------------ */
/* Statistics                                                                */
/* ------------------------------------------------------------------------ */

const mean = (values: readonly number[]) =>
  values.length === 0 ? Number.NaN : values.reduce((total, value) => total + value, 0) / values.length;

/** Average ranks, ties sharing the mean of their positions. */
const ranks = (values: readonly number[]): number[] => {
  const order = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const result: number[] = Array.from({ length: values.length }, () => 0);
  let position = 0;
  while (position < order.length) {
    let end = position;
    while (end + 1 < order.length && order[end + 1].value === order[position].value) {
      end += 1;
    }
    const rank = (position + end) / 2 + 1;
    for (let tie = position; tie <= end; tie += 1) {
      result[order[tie].index] = rank;
    }
    position = end + 1;
  }
  return result;
};

const pearson = (x: readonly number[], y: readonly number[]): number => {
  const mx = mean(x);
  const my = mean(y);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let index = 0; index < x.length; index += 1) {
    sxy += (x[index] - mx) * (y[index] - my);
    sxx += (x[index] - mx) ** 2;
    syy += (y[index] - my) ** 2;
  }
  return sxx === 0 || syy === 0 ? Number.NaN : sxy / Math.sqrt(sxx * syy);
};

export const spearman = (x: readonly number[], y: readonly number[]): number => pearson(ranks(x), ranks(y));

/** One signal quarter: whether the reading was tight, its two scores, and the forward outcomes. */
export type SignalQuarter = {
  quarter: string;
  tight: boolean;
  fundingPressure: number;
  riskAppetite: number;
  /** F_s for deal value and deal count: mean log year-over-year growth over s+2…s+4. */
  forwardValue: number;
  forwardCount: number;
};

export type Outcome = "forwardValue" | "forwardCount";

/** Δ = mean(F | tight) − mean(F | not tight); NaN when a group is empty. */
export const meanDifference = (rows: readonly SignalQuarter[], outcome: Outcome): number => {
  const tight = rows.filter((row) => row.tight).map((row) => row[outcome]);
  const loose = rows.filter((row) => !row.tight).map((row) => row[outcome]);
  return tight.length === 0 || loose.length === 0 ? Number.NaN : mean(tight) - mean(loose);
};

const declineShare = (rows: readonly SignalQuarter[], outcome: Outcome) =>
  rows.length === 0 ? Number.NaN : rows.filter((row) => row[outcome] < 0).length / rows.length;

export const hitRates = (rows: readonly SignalQuarter[], outcome: Outcome) => {
  const tight = rows.filter((row) => row.tight);
  const loose = rows.filter((row) => !row.tight);
  const tightRate = declineShare(tight, outcome);
  const looseRate = declineShare(loose, outcome);
  return {
    tight: tightRate,
    notTight: looseRate,
    base: declineShare(rows, outcome),
    difference: tight.length === 0 || loose.length === 0 ? Number.NaN : tightRate - looseRate,
    tightCount: tight.length,
    notTightCount: loose.length,
  };
};

/** P2's difference in skill: S_FP − S_RA, where S_FP = −ρ(pressure, F) and S_RA = ρ(risk appetite, F). */
export const skillDifference = (rows: readonly SignalQuarter[], outcome: Outcome) => {
  const forward = rows.map((row) => row[outcome]);
  const fundingPressureSkill = -spearman(rows.map((row) => row.fundingPressure), forward);
  const riskAppetiteSkill = spearman(rows.map((row) => row.riskAppetite), forward);
  return { fundingPressureSkill, riskAppetiteSkill, difference: fundingPressureSkill - riskAppetiteSkill };
};

/** The registered premise score (§8.3): −(Δ_value + Δ_count) / 2. */
export const premiseScore = (rows: readonly SignalQuarter[]) =>
  -(meanDifference(rows, "forwardValue") + meanDifference(rows, "forwardCount")) / 2;

/** A statistic with its bootstrap interval and the resamples that could not compute it. */
export type Estimate = { value: number; low: number | null; high: number | null; discarded: number };

export const bootstrapEstimate = (
  rows: readonly SignalQuarter[],
  indexSets: readonly number[][],
  statistic: (rows: readonly SignalQuarter[]) => number,
): Estimate => {
  const draws = indexSets.map((indices) => statistic(indices.map((index) => rows[index])));
  const interval = percentileInterval(draws);
  return {
    value: statistic(rows),
    low: interval?.low ?? null,
    high: interval?.high ?? null,
    discarded: draws.filter((draw) => !Number.isFinite(draw)).length,
  };
};

/* ------------------------------------------------------------------------ */
/* Verdicts                                                                  */
/* ------------------------------------------------------------------------ */

export type P1Outcome = { meanDifference: Estimate; hitRate: ReturnType<typeof hitRates>; hitRateDifference: Estimate };
export type P1Verdict = "supported" | "partly supported" | "not supported" | "contradicted";

const meetsP1 = (result: P1Outcome) =>
  result.meanDifference.value < 0 &&
  result.meanDifference.high !== null &&
  result.meanDifference.high < 0 &&
  result.hitRate.tight > result.hitRate.base;

const contradictsP1 = (result: P1Outcome) =>
  result.meanDifference.value > 0 && result.meanDifference.low !== null && result.meanDifference.low > 0;

/** §6.2: both outcomes meet the bar, one does, neither does, or either is significantly the wrong way. */
export const p1Verdict = (value: P1Outcome, count: P1Outcome): P1Verdict => {
  if (contradictsP1(value) || contradictsP1(count)) {
    return "contradicted";
  }
  const met = [meetsP1(value), meetsP1(count)].filter(Boolean).length;
  return met === 2 ? "supported" : met === 1 ? "partly supported" : "not supported";
};

export type P2Verdict = "funding pressure predicts better" | "risk appetite predicts better" | "no detectable difference";

/** §6.3, two-sided on the interval for D = S_FP − S_RA. */
export const p2Verdict = (difference: Estimate): P2Verdict => {
  if (difference.low !== null && difference.low > 0) {
    return "funding pressure predicts better";
  }
  if (difference.high !== null && difference.high < 0) {
    return "risk appetite predicts better";
  }
  return "no detectable difference";
};

/* ------------------------------------------------------------------------ */
/* Decision rule                                                             */
/* ------------------------------------------------------------------------ */

/** Registered constants of the decision rule (§9). */
export const DECISION_RULE = {
  premiseMargin: 0.05,
  premiseShare: 0.8,
  saturationRatio: 0.5,
  maxChanges: 10,
  dislocationRatio: 0.75,
} as const;

export type RampMetrics = {
  ramp: string;
  premiseScore: number;
  /** Share of paired resamples in which this ramp's premise score beats the current ramp's. */
  premiseBeatsCurrentShare: number;
  deltaValue: number;
  deltaCount: number;
  saturationShare: number;
  changes: number;
  dislocation: number;
};

export type CandidateDecision = {
  ramp: string;
  premise: boolean;
  saturation: boolean;
  turnover: boolean;
  dislocation: boolean;
  passes: boolean;
  premiseGain: number;
};

/**
 * §9: a candidate is eligible only when all four conditions hold against the
 * current ramp. Of the eligible, the largest premise gain wins, then the fewer
 * changes in conditions; with none eligible the current ramp stays.
 */
export const evaluateDecisionRule = (
  current: RampMetrics,
  candidates: readonly RampMetrics[],
): { decisions: CandidateDecision[]; chosen: string | null } => {
  const decisions = candidates.map((candidate): CandidateDecision => {
    const premiseGain = candidate.premiseScore - current.premiseScore;
    const premise =
      premiseGain >= DECISION_RULE.premiseMargin &&
      candidate.premiseBeatsCurrentShare >= DECISION_RULE.premiseShare &&
      candidate.deltaValue < 0 &&
      candidate.deltaCount < 0;
    const saturation = candidate.saturationShare <= DECISION_RULE.saturationRatio * current.saturationShare;
    const turnover = candidate.changes <= DECISION_RULE.maxChanges;
    const dislocation = candidate.dislocation <= DECISION_RULE.dislocationRatio * current.dislocation;
    return {
      ramp: candidate.ramp,
      premise,
      saturation,
      turnover,
      dislocation,
      passes: premise && saturation && turnover && dislocation,
      premiseGain,
    };
  });
  const eligible = decisions
    .filter((decision) => decision.passes)
    .sort((a, b) => {
      if (b.premiseGain !== a.premiseGain) {
        return b.premiseGain - a.premiseGain;
      }
      const changesOf = (ramp: string) => candidates.find((candidate) => candidate.ramp === ramp)?.changes ?? Number.POSITIVE_INFINITY;
      return changesOf(a.ramp) - changesOf(b.ramp);
    });
  return { decisions, chosen: eligible[0]?.ramp ?? null };
};
