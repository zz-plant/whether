/**
 * The registered analysis (pre-registration §6) as pure functions over the committed labels
 * and the monthly record. `analyze.ts` runs it; `siteData.ts` reuses the series builders;
 * `tests/adviceCorpusAnalysis.test.ts` pins the weighting and the lag arithmetic.
 */
import {
  blockBootstrapIndices,
  circularShifts,
  firmMatchedDifference,
  firmWeightedShare,
  laggedCorrelation,
  mean,
  pearson,
  percentileInterval,
  permutationPValue,
  pooledShare,
  rotate,
  seededRandom,
  type Labelled,
} from "./stats";

export type Stance = "expand" | "conserve" | "craft" | "none";
export const STANCE_KEYS: readonly Stance[] = ["expand", "conserve", "craft", "none"];

export type CorpusPost = {
  id: string;
  firm: string;
  month: string;
  prefilter: "candidate" | "sample";
  capitalRelevant: boolean;
  audience: "founders" | "lps" | "general";
  stance: Stance;
  metrics: readonly string[];
  confidence: "high" | "medium" | "low";
};

export type RecordMonth = { month: string; fp: number; ra: number };

/** The registered weight: a sampled non-candidate stands for ten. */
export const SAMPLE_WEIGHT = 10;
export const FP_LINE = 70;
export const RA_LINE = 50;
export const MIN_POSTS_PER_MONTH = 3;

export const monthIndex = (month: string) => {
  const [year, value] = month.split("-").map(Number);
  return year * 12 + (value - 1);
};
export const monthFromIndex = (index: number) => `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
export const addMonths = (month: string, count: number) => monthFromIndex(monthIndex(month) + count);
export const quarterOf = (month: string) => `${month.slice(0, 4)}Q${Math.floor((Number(month.slice(5, 7)) - 1) / 3) + 1}`;

export function monthGrid(first: string, last: string): string[] {
  const months: string[] = [];
  for (let index = monthIndex(first); index <= monthIndex(last); index += 1) months.push(monthFromIndex(index));
  return months;
}

export type Selection = {
  /** Only capital-relevant posts (H1–H3); false for all founder-addressed posts (H4, R3). */
  capitalOnly: boolean;
  /** Include sampled non-candidates at their registered weight (H4, R3, R5). */
  includeSample: boolean;
  /** Drop low-confidence labels (R6). */
  minConfidence?: "medium";
  /** Drop one firm (R2). */
  excludeFirm?: string;
};

export const PRIMARY: Selection = { capitalOnly: true, includeSample: false };

export function selectPosts(posts: readonly CorpusPost[], selection: Selection): CorpusPost[] {
  return posts.filter(
    (post) =>
      post.audience === "founders" &&
      (!selection.capitalOnly || post.capitalRelevant) &&
      (selection.includeSample || post.prefilter === "candidate") &&
      (selection.minConfidence !== "medium" || post.confidence !== "low") &&
      post.firm !== selection.excludeFirm,
  );
}

export const asLabelled = (post: CorpusPost, labelOf: (post: CorpusPost) => string = (entry) => entry.stance): Labelled<string> => ({
  firm: post.firm,
  stance: labelOf(post),
  weight: post.prefilter === "sample" ? SAMPLE_WEIGHT : 1,
});

export type PeriodShares = { period: string; n: number; firms: number; shares: Record<Stance, number> };

/** Shares per period (month or quarter), firm-weighted unless `pooled`. */
export function periodShares(
  posts: readonly CorpusPost[],
  periods: readonly string[],
  periodOf: (month: string) => string,
  pooled = false,
): PeriodShares[] {
  const byPeriod = new Map<string, CorpusPost[]>();
  for (const post of posts) {
    const period = periodOf(post.month);
    byPeriod.set(period, [...(byPeriod.get(period) ?? []), post]);
  }
  return periods.map((period) => {
    const inPeriod = byPeriod.get(period) ?? [];
    const labelled = inPeriod.map((post) => asLabelled(post));
    const share = (stance: Stance) => (pooled ? pooledShare(labelled, stance) : firmWeightedShare(labelled, stance));
    return {
      period,
      n: inPeriod.length,
      firms: new Set(inPeriod.map((post) => post.firm)).size,
      shares: { expand: share("expand"), conserve: share("conserve"), craft: share("craft"), none: share("none") },
    };
  });
}

/** Net stance (expand − conserve) per month, null where a month has too few posts. */
export function netSeries(posts: readonly CorpusPost[], months: readonly string[], pooled = false): (number | null)[] {
  return periodShares(posts, months, (month) => month, pooled).map((row) =>
    row.n >= MIN_POSTS_PER_MONTH ? row.shares.expand - row.shares.conserve : null,
  );
}

/** Items in the months `pick` selects, a month repeated as often as `indices` names it. */
const itemsIn = (
  byMonth: Map<string, CorpusPost[]>,
  months: readonly string[],
  indices: readonly number[],
  pick: (index: number) => boolean,
  labelOf?: (post: CorpusPost) => string,
) => indices.flatMap((index) => (pick(index) ? (byMonth.get(months[index]) ?? []).map((post) => asLabelled(post, labelOf)) : []));

export const groupByMonth = (posts: readonly CorpusPost[]) => {
  const byMonth = new Map<string, CorpusPost[]>();
  for (const post of posts) byMonth.set(post.month, [...(byMonth.get(post.month) ?? []), post]);
  return byMonth;
};

export type Estimate = { estimate: number; low: number; high: number; p?: number; firms?: number };

/**
 * H1 / H4 / H5 shape: the firm-matched difference in a stance's share between months where
 * `isHigh(record)` holds and months where it does not, with a block-bootstrap interval and a
 * one-sided circular-shift p-value.
 */
export function highLowDifference(
  posts: readonly CorpusPost[],
  record: readonly RecordMonth[],
  isHigh: (month: RecordMonth) => boolean,
  target: string,
  options: { replicates: number; seed: number; direction: "lower" | "higher"; pooled?: boolean; labelOf?: (post: CorpusPost) => string },
): Estimate {
  const months = record.map((month) => month.month);
  const byMonth = groupByMonth(posts);
  const all = months.map((_, index) => index);
  const statistic = (high: readonly boolean[], indices: readonly number[]) => {
    const a = itemsIn(byMonth, months, indices, (index) => high[index], options.labelOf);
    const b = itemsIn(byMonth, months, indices, (index) => !high[index], options.labelOf);
    if (options.pooled) return { difference: pooledShare(a, target) - pooledShare(b, target), firms: Number.NaN };
    return firmMatchedDifference(a, b, target);
  };
  const high = record.map(isHigh);
  const observed = statistic(high, all);
  const random = seededRandom(options.seed);
  const replicates = blockBootstrapIndices(months.length, 12, options.replicates, random).map((indices) => statistic(high, indices).difference);
  const [low, upper] = percentileInterval(replicates);
  const nulls = circularShifts(months.length, 12).map((shift) => statistic(rotate(high, shift), all).difference);
  return { estimate: observed.difference, low, high: upper, p: permutationPValue(observed.difference, nulls, options.direction), firms: observed.firms };
}

/** Share of `stance` over posts in `months`: each firm present counted once, or post by post when `pooled`. */
const windowShare = (byMonth: Map<string, CorpusPost[]>, months: readonly string[], stance: Stance, pooled = false) => {
  const items = months.flatMap((month) => (byMonth.get(month) ?? []).map((post) => asLabelled(post)));
  return pooled ? pooledShare(items, stance) : firmWeightedShare(items, stance);
};

const rangeMonths = (from: string, count: number) => Array.from({ length: count }, (_, offset) => addMonths(from, offset));

/** Δ₂(L): share over [c+L, c+L+11] minus the share over [c−12, c−1]. */
export function stepDifference(byMonth: Map<string, CorpusPost[]>, crossing: string, lag: number, stance: Stance, pooled = false, window = 12) {
  return (
    windowShare(byMonth, rangeMonths(addMonths(crossing, lag), window), stance, pooled) -
    windowShare(byMonth, rangeMonths(addMonths(crossing, -window), window), stance, pooled)
  );
}

/** Resample posts with replacement inside each month (the H2 and event-window interval; §11 D1). */
function resampleWithinMonths(byMonth: Map<string, CorpusPost[]>, random: () => number) {
  const resampled = new Map<string, CorpusPost[]>();
  for (const [month, posts] of byMonth) {
    resampled.set(
      month,
      posts.map(() => posts[Math.floor(random() * posts.length)]),
    );
  }
  return resampled;
}

export type LagScan = { lags: { lag: number; difference: number }[]; bestLag: number; best: number };

export function scanLags(byMonth: Map<string, CorpusPost[]>, crossing: string, lags: readonly number[], stance: Stance, pooled = false): LagScan {
  const scanned = lags.map((lag) => ({ lag, difference: stepDifference(byMonth, crossing, lag, stance, pooled) }));
  const finite = scanned.filter((entry) => Number.isFinite(entry.difference));
  const best = finite.reduce((top, entry) => (entry.difference > top.difference ? entry : top), finite[0] ?? { lag: Number.NaN, difference: Number.NaN });
  return { lags: scanned, bestLag: best.lag, best: best.difference };
}

/**
 * H2: the lag scan at the registered crossing, the pseudo-crossing null over quiet months,
 * and an interval for the best difference with L* re-estimated in every replicate.
 */
export function lagAfterCrossing(
  posts: readonly CorpusPost[],
  options: { crossing: string; pseudoCrossings: readonly string[]; lags: readonly number[]; replicates: number; seed: number; pooled?: boolean },
) {
  const byMonth = groupByMonth(posts);
  const pooled = options.pooled ?? false;
  const observed = scanLags(byMonth, options.crossing, options.lags, "conserve", pooled);
  const nulls = options.pseudoCrossings.map((month) => scanLags(byMonth, month, options.lags, "conserve", pooled).best);
  const random = seededRandom(options.seed);
  const replicateBest: number[] = [];
  const replicateLags: number[] = [];
  for (let replicate = 0; replicate < options.replicates; replicate += 1) {
    const scan = scanLags(resampleWithinMonths(byMonth, random), options.crossing, options.lags, "conserve", pooled);
    replicateBest.push(scan.best);
    replicateLags.push(scan.bestLag);
  }
  const [low, high] = percentileInterval(replicateBest);
  const [lagLow, lagHigh] = percentileInterval(replicateLags);
  return {
    scan: observed,
    estimate: { estimate: observed.best, low, high, p: permutationPValue(observed.best, nulls, "higher") },
    lagInterval: [lagLow, lagHigh],
    pseudoCrossings: nulls.length,
  };
}

/** Event window: the share of `stance` over the `width` months before a change and from it. */
export function eventWindow(posts: readonly CorpusPost[], change: string, stance: Stance, options: { width: number; replicates: number; seed: number; last: string }) {
  const byMonth = groupByMonth(posts);
  const before = rangeMonths(addMonths(change, -options.width), options.width);
  const after = rangeMonths(change, options.width).filter((month) => month <= options.last);
  const count = (months: readonly string[]) => months.reduce((sum, month) => sum + (byMonth.get(month)?.length ?? 0), 0);
  const estimate = (map: Map<string, CorpusPost[]>) => ({
    before: windowShare(map, before, stance),
    after: after.length > 0 ? windowShare(map, after, stance) : Number.NaN,
  });
  const observed = estimate(byMonth);
  const random = seededRandom(options.seed);
  const differences: number[] = [];
  for (let replicate = 0; replicate < options.replicates; replicate += 1) {
    const value = estimate(resampleWithinMonths(byMonth, random));
    differences.push(value.after - value.before);
  }
  const [low, high] = percentileInterval(differences);
  return { ...observed, difference: observed.after - observed.before, low, high, nBefore: count(before), nAfter: count(after), afterMonths: after.length };
}

/**
 * H3: the predicted-direction correlation of net stance with each score at its best lag, and
 * the difference D₃ = R_FP − R_RA with a block-bootstrap interval that re-selects both lags.
 */
export function compareDrivers(
  net: readonly (number | null)[],
  fp: readonly number[],
  ra: readonly number[],
  options: { lags: readonly number[]; replicates: number; seed: number },
) {
  const best = (outcome: readonly (number | null)[], driver: readonly number[], sign: number, indices?: readonly number[]) => {
    let top = { lag: Number.NaN, r: Number.NEGATIVE_INFINITY };
    for (const lag of options.lags) {
      const pairsOutcome: (number | null)[] = [];
      const pairsDriver: (number | null)[] = [];
      const ts = indices ?? outcome.map((_, index) => index);
      for (const t of ts) {
        if (t - lag < 0) continue;
        pairsOutcome.push(outcome[t]);
        pairsDriver.push(driver[t - lag]);
      }
      const r = sign * pearson(pairsOutcome, pairsDriver);
      if (Number.isFinite(r) && r > top.r) top = { lag, r };
    }
    return top;
  };
  const fpBest = best(net, fp, -1);
  const raBest = best(net, ra, 1);
  const random = seededRandom(options.seed);
  const differences = blockBootstrapIndices(net.length, 12, options.replicates, random).map(
    (indices) => best(net, fp, -1, indices).r - best(net, ra, 1, indices).r,
  );
  const [low, high] = percentileInterval(differences);
  const shiftNulls = (driver: readonly number[], sign: number) =>
    circularShifts(net.length, 12).map((shift) => best(net, rotate(driver, shift), sign).r);
  return {
    fp: { ...fpBest, p: permutationPValue(fpBest.r, shiftNulls(fp, -1), "higher") },
    ra: { ...raBest, p: permutationPValue(raBest.r, shiftNulls(ra, 1), "higher") },
    difference: { estimate: fpBest.r - raBest.r, low, high },
    lag0: { fp: laggedCorrelation(net, fp, 0), ra: laggedCorrelation(net, ra, 0) },
    joint: standardisedCoefficients(net, fp, ra),
  };
}

/** Ordinary least squares of y on two standardised predictors (complete cases). */
export function standardisedCoefficients(y: readonly (number | null)[], a: readonly number[], b: readonly number[]) {
  const rows: [number, number, number][] = [];
  y.forEach((value, index) => {
    if (value !== null && Number.isFinite(value)) rows.push([value, a[index], b[index]]);
  });
  const z = (values: number[]) => {
    const m = mean(values);
    const sd = Math.sqrt(mean(values.map((value) => (value - m) ** 2)));
    return values.map((value) => (sd === 0 ? 0 : (value - m) / sd));
  };
  const ys = z(rows.map((row) => row[0]));
  const za = z(rows.map((row) => row[1]));
  const zb = z(rows.map((row) => row[2]));
  const raa = mean(za.map((value) => value * value));
  const rbb = mean(zb.map((value) => value * value));
  const rab = mean(za.map((value, index) => value * zb[index]));
  const rya = mean(ys.map((value, index) => value * za[index]));
  const ryb = mean(ys.map((value, index) => value * zb[index]));
  const determinant = raa * rbb - rab * rab;
  if (determinant === 0) return { fp: Number.NaN, ra: Number.NaN, n: rows.length };
  return { fp: (rya * rbb - ryb * rab) / determinant, ra: (ryb * raa - rya * rab) / determinant, n: rows.length };
}

/** Months above / at or below a line, as a share of the record. */
export const shareOfMonths = (record: readonly RecordMonth[], isHigh: (month: RecordMonth) => boolean) =>
  record.filter(isHigh).length / record.length;
