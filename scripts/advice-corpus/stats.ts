/**
 * The arithmetic the pre-registration names, with no dependency: a seeded generator, Pearson
 * correlation, lagged correlation, firm-weighted shares, the moving-block bootstrap, the
 * circular-shift permutation test, Cohen's kappa and Holm's adjustment.
 *
 * Pure functions over plain arrays, so `tests/adviceCorpusStats.test.ts` pins each one.
 */

/** Mulberry32: a small, fast, seeded generator. Same seed, same sequence, on every machine. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates on a copy. */
export function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

/** Percentile rank in [0, 1] of each value among `values` (ties share the mean rank). */
export function percentileRanks(values: readonly number[]): number[] {
  const order = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const ranks: number[] = Array.from({ length: values.length }, () => 0);
  let start = 0;
  while (start < order.length) {
    let end = start;
    while (end + 1 < order.length && order[end + 1].value === order[start].value) end += 1;
    const meanRank = (start + end) / 2;
    for (let position = start; position <= end; position += 1) {
      ranks[order[position].index] = order.length > 1 ? meanRank / (order.length - 1) : 0.5;
    }
    start = end + 1;
  }
  return ranks;
}

export const mean = (values: readonly number[]) => (values.length === 0 ? Number.NaN : values.reduce((sum, value) => sum + value, 0) / values.length);

/** Pearson's r over the pairs where both values are finite; NaN with fewer than three pairs or no variance. */
export function pearson(xs: readonly (number | null)[], ys: readonly (number | null)[]): number {
  const pairs: [number, number][] = [];
  for (let index = 0; index < Math.min(xs.length, ys.length); index += 1) {
    const x = xs[index];
    const y = ys[index];
    if (x !== null && y !== null && Number.isFinite(x) && Number.isFinite(y)) pairs.push([x, y]);
  }
  if (pairs.length < 3) return Number.NaN;
  const mx = mean(pairs.map(([x]) => x));
  const my = mean(pairs.map(([, y]) => y));
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const [x, y] of pairs) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
  }
  return sxx === 0 || syy === 0 ? Number.NaN : sxy / Math.sqrt(sxx * syy);
}

/**
 * corr(outcome[t], driver[t − lag]): the outcome this month against the driver `lag` months
 * earlier. Both series are on the same monthly grid; a positive lag means the driver leads.
 */
export function laggedCorrelation(outcome: readonly (number | null)[], driver: readonly (number | null)[], lag: number): number {
  if (lag < 0) return laggedCorrelation(driver, outcome, -lag);
  return pearson(outcome.slice(lag), driver.slice(0, driver.length - lag));
}

export type Labelled<S extends string> = { firm: string; stance: S; weight: number };

/**
 * The share of `stance` among `items`, each firm counted once: every firm present gets equal
 * weight, and within a firm each item counts by its `weight` (1, or the inverse sampling
 * probability for a sampled non-candidate). NaN when no firm is present.
 */
export function firmWeightedShare<S extends string>(items: readonly Labelled<S>[], stance: S): number {
  const byFirm = new Map<string, { hit: number; total: number }>();
  for (const item of items) {
    const firm = byFirm.get(item.firm) ?? { hit: 0, total: 0 };
    firm.total += item.weight;
    if (item.stance === stance) firm.hit += item.weight;
    byFirm.set(item.firm, firm);
  }
  const shares = [...byFirm.values()].filter((firm) => firm.total > 0).map((firm) => firm.hit / firm.total);
  return mean(shares);
}

/** Post-level share, every item counted by its weight alone (the unweighted robustness check). */
export function pooledShare<S extends string>(items: readonly Labelled<S>[], stance: S): number {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  if (total === 0) return Number.NaN;
  return items.reduce((sum, item) => sum + (item.stance === stance ? item.weight : 0), 0) / total;
}

/**
 * Firm-matched difference of shares between two sets of items: for each firm with at least
 * `minPerSide` items on both sides, its share in `a` minus its share in `b`; then the mean
 * over those firms. Composition cannot move it, because every firm is compared with itself.
 */
export function firmMatchedDifference<S extends string>(
  a: readonly Labelled<S>[],
  b: readonly Labelled<S>[],
  stance: S,
  minPerSide = 3,
): { difference: number; firms: number } {
  const firms = new Set([...a.map((item) => item.firm), ...b.map((item) => item.firm)]);
  const differences: number[] = [];
  for (const firm of firms) {
    const inA = a.filter((item) => item.firm === firm);
    const inB = b.filter((item) => item.firm === firm);
    if (inA.length < minPerSide || inB.length < minPerSide) continue;
    differences.push(pooledShare(inA, stance) - pooledShare(inB, stance));
  }
  return { difference: mean(differences), firms: differences.length };
}

/**
 * Moving-block bootstrap over a series of `length` periods: each replicate is a list of
 * period indices built from blocks of `blockLength` consecutive periods drawn with
 * replacement, trimmed to `length`. Serial dependence inside a block survives resampling.
 */
export function blockBootstrapIndices(length: number, blockLength: number, replicates: number, random: () => number): number[][] {
  const starts = Math.max(1, length - blockLength + 1);
  return Array.from({ length: replicates }, () => {
    const indices: number[] = [];
    while (indices.length < length) {
      const start = Math.floor(random() * starts);
      for (let offset = 0; offset < blockLength && indices.length < length; offset += 1) indices.push(start + offset);
    }
    return indices;
  });
}

/** The 2.5th and 97.5th percentiles of the finite values (linear interpolation). */
export function percentileInterval(values: readonly number[], level = 0.95): [number, number] {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (sorted.length === 0) return [Number.NaN, Number.NaN];
  const at = (q: number) => {
    const position = q * (sorted.length - 1);
    const low = Math.floor(position);
    const high = Math.ceil(position);
    return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
  };
  const tail = (1 - level) / 2;
  return [at(tail), at(1 - tail)];
}

/** Every circular shift of `length` periods at least `minShift` away from zero in either direction. */
export function circularShifts(length: number, minShift: number): number[] {
  const shifts: number[] = [];
  for (let shift = minShift; shift <= length - minShift; shift += 1) shifts.push(shift);
  return shifts;
}

/** Rotate a series by `shift` periods (index t takes the value from t − shift, wrapping). */
export function rotate<T>(series: readonly T[], shift: number): T[] {
  const length = series.length;
  return series.map((_, index) => series[(((index - shift) % length) + length) % length]);
}

/**
 * One-sided permutation p-value with the observed statistic counted among the permutations:
 * (1 + #{null ≤ observed}) / (1 + n) when the prediction is "lower", or ≥ for "higher".
 */
export function permutationPValue(observed: number, nulls: readonly number[], direction: "lower" | "higher"): number {
  const finite = nulls.filter((value) => Number.isFinite(value));
  const extreme = finite.filter((value) => (direction === "lower" ? value <= observed : value >= observed)).length;
  return (1 + extreme) / (1 + finite.length);
}

/** Cohen's kappa for two raters over the same items, and the observed agreement. */
export function cohensKappa<T extends string>(a: readonly T[], b: readonly T[]): { kappa: number; agreement: number; n: number } {
  const n = Math.min(a.length, b.length);
  if (n === 0) return { kappa: Number.NaN, agreement: Number.NaN, n: 0 };
  const categories = [...new Set([...a.slice(0, n), ...b.slice(0, n)])];
  let agree = 0;
  for (let index = 0; index < n; index += 1) if (a[index] === b[index]) agree += 1;
  const observed = agree / n;
  let expected = 0;
  for (const category of categories) {
    const pa = a.slice(0, n).filter((value) => value === category).length / n;
    const pb = b.slice(0, n).filter((value) => value === category).length / n;
    expected += pa * pb;
  }
  return { kappa: expected === 1 ? 1 : (observed - expected) / (1 - expected), agreement: observed, n };
}

/** Rows: the first rater (reference); columns: the second. */
export function confusionMatrix<T extends string>(reference: readonly T[], predicted: readonly T[], categories: readonly T[]): number[][] {
  const matrix = categories.map(() => categories.map(() => 0));
  for (let index = 0; index < Math.min(reference.length, predicted.length); index += 1) {
    const row = categories.indexOf(reference[index]);
    const column = categories.indexOf(predicted[index]);
    if (row >= 0 && column >= 0) matrix[row][column] += 1;
  }
  return matrix;
}

/** Holm–Bonferroni adjusted p-values, in the input order. */
export function holmAdjust(pValues: readonly number[]): number[] {
  const order = pValues.map((p, index) => ({ p, index })).sort((a, b) => a.p - b.p);
  const adjusted: number[] = Array.from({ length: pValues.length }, () => Number.NaN);
  let running = 0;
  order.forEach(({ p, index }, rank) => {
    running = Math.max(running, Math.min(1, (pValues.length - rank) * p));
    adjusted[index] = running;
  });
  return adjusted;
}
