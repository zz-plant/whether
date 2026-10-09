/**
 * Runs the premise test registered in docs/research/premise-test-preregistration.md
 * and writes every number the results report cites to
 * data/research/premise-test-results.json.
 *
 *   bun scripts/research/premiseTest.ts           compute, write the results file, print the tables
 *   bun scripts/research/premiseTest.ts --check   recompute and fail if the committed results differ
 *
 * Offline and deterministic: the inputs are the bundled month-end cache and the
 * two research datasets, and every interval comes from the registered seed.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { getTimeMachineRegimeSeries, buildTimeMachineReplaySteps, findTimeMachineGovernedAssessment } from "../../lib/timeMachine/timeMachineCache";
import {
  REGISTERED_CANDIDATE_RAMPS,
  isRampSaturated,
  isTightReading,
  readRamp,
  replayRamp,
  trailingMonthEndWindow,
  type RampId,
} from "../../lib/research/candidateRamps";
import type { RegimeKey } from "../../lib/regimeEngineCore";
import { RATE_INPUTS_PATH, REGISTERED_RECORD_END, RateInputsSchema, type RateInputs } from "./premiseTestRateInputs";
import { VENTURE_DATASET_PATH, VentureDatasetSchema, quarterIndex, shiftQuarter } from "./ventureFundraising";
import {
  BOOTSTRAP,
  blockBootstrapIndices,
  bootstrapEstimate,
  evaluateDecisionRule,
  hitRates,
  meanDifference,
  p1Verdict,
  p2Verdict,
  premiseScore,
  skillDifference,
  spearman,
  type Estimate,
  type Outcome,
  type P1Outcome,
  type RampMetrics,
  type SignalQuarter,
} from "./premiseTestAnalysis";

const RESULTS_PATH = "data/research/premise-test-results.json";

const FIRST_SIGNAL_QUARTER = "2012Q1";
const HORIZONS = [2, 3, 4] as const;
const LEAD_LAG_OFFSETS = Array.from({ length: 13 }, (_, index) => index - 4);
const RAMPS: readonly RampId[] = ["current", ...REGISTERED_CANDIDATE_RAMPS];

type MonthReading = {
  recordDate: string;
  fundingPressure: number | null;
  riskAppetite: number;
  conditions: RegimeKey | null;
  tight: boolean | null;
  ratePoints: number | null;
  saturated: boolean;
};

const quarterOfMonthEnd = (recordDate: string): string | null => {
  const month = Number(recordDate.slice(5, 7));
  return month % 3 === 0 ? `${recordDate.slice(0, 4)}Q${month / 3}` : null;
};

const round = (value: number | null, digits = 4) => (value === null || !Number.isFinite(value) ? null : Number(value.toFixed(digits)));

const roundEstimate = (estimate: Estimate) => ({
  value: round(estimate.value),
  low: round(estimate.low),
  high: round(estimate.high),
  discarded: estimate.discarded,
});

const changesIn = (readings: readonly MonthReading[]) =>
  readings.reduce((count, reading, index) => {
    const previous = readings[index - 1];
    return previous && reading.conditions !== null && previous.conditions !== null && reading.conditions !== previous.conditions
      ? count + 1
      : count;
  }, 0);

/* ------------------------------------------------------------------------ */

const loadInputs = () => {
  const venture = VentureDatasetSchema.parse(JSON.parse(readFileSync(VENTURE_DATASET_PATH, "utf8")));
  const rates: RateInputs = RateInputsSchema.parse(JSON.parse(readFileSync(RATE_INPUTS_PATH, "utf8")));
  return { venture, rates };
};

/** Log year-over-year growth by quarter, for one vintage. */
const growthSeries = (venture: ReturnType<typeof loadInputs>["venture"], vintage: "mature" | "firstPublished") => {
  const series = new Map<string, { value: number; count: number; immature: boolean }>();
  for (const row of venture.quarters) {
    const pair = row[vintage];
    if (!pair) {
      continue;
    }
    series.set(row.quarter, {
      value: Math.log(pair.current.dealValueUsdBn / pair.yearEarlier.dealValueUsdBn),
      count: Math.log(pair.current.dealCount / pair.yearEarlier.dealCount),
      immature: vintage === "mature" ? pair.immature : false,
    });
  }
  return series;
};

const buildSignalRows = (
  readings: readonly MonthReading[],
  growth: Map<string, { value: number; count: number; immature: boolean }>,
  options: { lastSignal: string; allowImmature: boolean; horizons?: readonly number[]; tightOf?: (reading: MonthReading) => boolean | null },
): SignalQuarter[] => {
  const horizons = options.horizons ?? HORIZONS;
  const rows: SignalQuarter[] = [];
  for (const reading of readings) {
    const quarter = quarterOfMonthEnd(reading.recordDate);
    if (!quarter || quarterIndex(quarter) < quarterIndex(FIRST_SIGNAL_QUARTER) || quarterIndex(quarter) > quarterIndex(options.lastSignal)) {
      continue;
    }
    const tight = options.tightOf ? options.tightOf(reading) : reading.tight;
    const forward = horizons.map((h) => growth.get(shiftQuarter(quarter, h)));
    if (
      tight === null ||
      reading.fundingPressure === null ||
      forward.some((entry) => entry === undefined || (!options.allowImmature && entry.immature))
    ) {
      continue;
    }
    const present = forward.filter((entry): entry is { value: number; count: number; immature: boolean } => entry !== undefined);
    rows.push({
      quarter,
      tight,
      fundingPressure: reading.fundingPressure,
      riskAppetite: reading.riskAppetite,
      forwardValue: present.reduce((total, entry) => total + entry.value, 0) / present.length,
      forwardCount: present.reduce((total, entry) => total + entry.count, 0) / present.length,
    });
  }
  return rows;
};

const p1For = (rows: readonly SignalQuarter[], indexSets: readonly number[][]) => {
  const outcome = (key: Outcome): P1Outcome => ({
    meanDifference: bootstrapEstimate(rows, indexSets, (sample) => meanDifference(sample, key)),
    hitRate: hitRates(rows, key),
    hitRateDifference: bootstrapEstimate(rows, indexSets, (sample) => hitRates(sample, key).difference),
  });
  const value = outcome("forwardValue");
  const count = outcome("forwardCount");
  return { value, count, verdict: p1Verdict(value, count) };
};

const serializeP1 = (result: ReturnType<typeof p1For>) => {
  const one = (outcome: P1Outcome) => ({
    meanDifference: roundEstimate(outcome.meanDifference),
    hitRate: {
      tight: round(outcome.hitRate.tight),
      notTight: round(outcome.hitRate.notTight),
      base: round(outcome.hitRate.base),
      tightCount: outcome.hitRate.tightCount,
      notTightCount: outcome.hitRate.notTightCount,
    },
    hitRateDifference: roundEstimate(outcome.hitRateDifference),
  });
  return { value: one(result.value), count: one(result.count), verdict: result.verdict };
};

const p2For = (rows: readonly SignalQuarter[], indexSets: readonly number[][]) => {
  const outcome = (key: Outcome) => {
    const point = skillDifference(rows, key);
    const difference = bootstrapEstimate(rows, indexSets, (sample) => skillDifference(sample, key).difference);
    return {
      fundingPressureSkill: round(point.fundingPressureSkill),
      riskAppetiteSkill: round(point.riskAppetiteSkill),
      difference: roundEstimate(difference),
      verdict: p2Verdict(difference),
    };
  };
  return { value: outcome("forwardValue"), count: outcome("forwardCount") };
};

/* ------------------------------------------------------------------------ */

const runPremiseTest = () => {
  const { venture, rates } = loadInputs();
  // The registered record only (§2): a later cache month is outside the test.
  const steps = buildTimeMachineReplaySteps().filter((step) => step.treasury.record_date <= REGISTERED_RECORD_END);

  const monthEnds = new Map<string, number>(rates.oneMonthBillMonthEnds.map((entry) => [entry.month, entry.value]));
  for (const step of steps) {
    if (typeof step.treasury.yields.oneMonth === "number") {
      monthEnds.set(step.treasury.record_date.slice(0, 7), step.treasury.yields.oneMonth);
    }
  }
  const windowFor = (date: string) => trailingMonthEndWindow(date.slice(0, 7), monthEnds);
  const replaySteps = steps.map((step) => ({ ...step, trailingMonthEnds: windowFor(step.treasury.record_date) }));

  // Every ramp replayed over the same 177 month-ends.
  const readingsByRamp = new Map<RampId, MonthReading[]>();
  for (const ramp of RAMPS) {
    const scores = replayRamp(ramp, replaySteps);
    readingsByRamp.set(
      ramp,
      scores.map((score, index) => {
        const step = replaySteps[index];
        return {
          recordDate: step.treasury.record_date,
          fundingPressure: score.fundingPressure,
          riskAppetite: score.riskAppetite,
          conditions: score.conditions,
          tight: isTightReading(score.fundingPressure, score.conditions),
          ratePoints: score.reading.ratePoints,
          saturated: isRampSaturated(ramp, {
            oneMonth: step.treasury.yields.oneMonth ?? null,
            threeMonth: step.treasury.yields.threeMonth ?? null,
            trailingMonthEnds: step.trailingMonthEnds,
          }),
        };
      }),
    );
  }

  // The current ramp through this module must be the published record, month for month (§5).
  const published = getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER).filter((entry) => entry.recordDate <= REGISTERED_RECORD_END);
  if (published.length !== steps.length) {
    throw new Error(`The published record has ${published.length} month-ends in the registered window, the replay ${steps.length}.`);
  }
  const current = readingsByRamp.get("current") ?? [];
  published.forEach((entry, index) => {
    const mine = current[index];
    if (
      !mine ||
      mine.recordDate !== entry.recordDate ||
      mine.conditions !== entry.regime ||
      mine.fundingPressure !== entry.tightness ||
      mine.riskAppetite !== entry.riskAppetite
    ) {
      throw new Error(`The current ramp does not reproduce the published record at ${entry.recordDate}.`);
    }
  });

  const mature = growthSeries(venture, "mature");
  const firstPublished = growthSeries(venture, "firstPublished");
  const lastMature = [...mature.entries()].filter(([, entry]) => !entry.immature).map(([quarter]) => quarter).sort((a, b) => quarterIndex(a) - quarterIndex(b)).at(-1);
  if (!lastMature) {
    throw new Error("No mature outcome quarters.");
  }
  const lastSignal = shiftQuarter(lastMature, -Math.max(...HORIZONS));

  const rowsFor = (ramp: RampId, extra: Partial<Parameters<typeof buildSignalRows>[2]> = {}) =>
    buildSignalRows(readingsByRamp.get(ramp) ?? [], mature, { lastSignal, allowImmature: false, ...extra });

  const primaryRows = rowsFor("current");
  const indexSets = blockBootstrapIndices(primaryRows.length, BOOTSTRAP);
  const indexSetsFor = (n: number, blockLength: number = BOOTSTRAP.blockLength) => blockBootstrapIndices(n, { ...BOOTSTRAP, blockLength });

  // P1 and P2 for the current ramp (the published call).
  const p1 = p1For(primaryRows, indexSets);
  const p1ByHorizon = HORIZONS.map((h) => {
    const rows = rowsFor("current", { horizons: [h] });
    return { horizon: h, n: rows.length, ...serializeP1(p1For(rows, indexSetsFor(rows.length))) };
  });
  const p2 = p2For(primaryRows, indexSets);
  const assessmentPressure = (recordDate: string) =>
    findTimeMachineGovernedAssessment(recordDate)?.scores.tightnessPressure ?? Number.NaN;
  const pressureRows = primaryRows.map((row) => {
    const reading = current.find((entry) => quarterOfMonthEnd(entry.recordDate) === row.quarter);
    return { ...row, fundingPressure: reading ? assessmentPressure(reading.recordDate) : Number.NaN };
  });
  const p2Unbounded = p2For(pressureRows, indexSets);

  const leadLag = LEAD_LAG_OFFSETS.map((offset) => {
    const pairs = current
      .map((reading) => ({ reading, quarter: quarterOfMonthEnd(reading.recordDate) }))
      .filter((entry): entry is { reading: MonthReading; quarter: string } => entry.quarter !== null && quarterIndex(entry.quarter) >= quarterIndex(FIRST_SIGNAL_QUARTER))
      .map(({ reading, quarter }) => ({ reading, growth: mature.get(shiftQuarter(quarter, offset)) }))
      .filter((entry): entry is { reading: MonthReading; growth: { value: number; count: number; immature: boolean } } =>
        entry.growth !== undefined && !entry.growth.immature && entry.reading.fundingPressure !== null);
    const pressure = pairs.map((pair) => pair.reading.fundingPressure ?? Number.NaN);
    const appetite = pairs.map((pair) => pair.reading.riskAppetite);
    const value = pairs.map((pair) => pair.growth.value);
    const count = pairs.map((pair) => pair.growth.count);
    return {
      offset,
      n: pairs.length,
      fundingPressureValue: round(spearman(pressure, value), 3),
      fundingPressureCount: round(spearman(pressure, count), 3),
      riskAppetiteValue: round(spearman(appetite, value), 3),
      riskAppetiteCount: round(spearman(appetite, count), 3),
    };
  });

  // Sensitivity analyses (§6.5): reported, no verdict rests on them. Both may run to the newest release.
  const newestQuarter = venture.quarters.at(-1)?.quarter ?? lastMature;
  const lastSignalAny = shiftQuarter(newestQuarter, -Math.max(...HORIZONS));
  const firstPublishedRows = buildSignalRows(current, firstPublished, { lastSignal: lastSignalAny, allowImmature: true });
  const immatureRows = buildSignalRows(current, mature, { lastSignal: lastSignalAny, allowImmature: true });
  const pressureHalfRows = rowsFor("current", { tightOf: (reading) => (reading.fundingPressure === null ? null : reading.fundingPressure > 70) });
  const weatherHalfRows = rowsFor("current", { tightOf: (reading) => (reading.conditions === null ? null : reading.conditions === "SCARCITY" || reading.conditions === "VOLATILE") });
  const sensitivity = {
    firstPublished: { n: firstPublishedRows.length, firstQuarter: firstPublishedRows[0]?.quarter ?? null, p1: serializeP1(p1For(firstPublishedRows, indexSetsFor(firstPublishedRows.length))), p2: p2For(firstPublishedRows, indexSetsFor(firstPublishedRows.length)) },
    blockLength4: { p1: serializeP1(p1For(primaryRows, indexSetsFor(primaryRows.length, 4))), p2: p2For(primaryRows, indexSetsFor(primaryRows.length, 4)) },
    blockLength12: { p1: serializeP1(p1For(primaryRows, indexSetsFor(primaryRows.length, 12))), p2: p2For(primaryRows, indexSetsFor(primaryRows.length, 12)) },
    fundingPressureAbove70Only: { tightQuarters: pressureHalfRows.filter((row) => row.tight).length, p1: serializeP1(p1For(pressureHalfRows, indexSetsFor(pressureHalfRows.length))) },
    freezingOrStormyOnly: { tightQuarters: weatherHalfRows.filter((row) => row.tight).length, p1: serializeP1(p1For(weatherHalfRows, indexSetsFor(weatherHalfRows.length))) },
    includingImmature: { n: immatureRows.length, p1: serializeP1(p1For(immatureRows, indexSetsFor(immatureRows.length))) },
  };

  // Candidate measurements (§8).
  const pairsBySet = new Map<string, RateInputs["dislocationPairs"]>();
  for (const pair of rates.dislocationPairs) {
    pairsBySet.set(pair.set, [...(pairsBySet.get(pair.set) ?? []), pair]);
  }
  const dislocationFor = (ramp: RampId) => {
    const responses = (pairs: RateInputs["dislocationPairs"]) =>
      pairs.map((pair) => {
        const window = windowFor(pair.date);
        const nonMonetary = (bill: "oneMonth" | "threeMonth") =>
          pair.atDate[bill] - pair.atDate.fedFunds - (pair.atReference[bill] - pair.atReference.fedFunds);
        const actual = readRamp(ramp, { oneMonth: pair.atDate.oneMonth, threeMonth: pair.atDate.threeMonth, trailingMonthEnds: window }).ratePoints;
        const counterfactual = readRamp(ramp, {
          oneMonth: pair.atDate.oneMonth - nonMonetary("oneMonth"),
          threeMonth: pair.atDate.threeMonth - nonMonetary("threeMonth"),
          trailingMonthEnds: window,
        }).ratePoints;
        const atReference = readRamp(ramp, { oneMonth: pair.atReference.oneMonth, threeMonth: pair.atReference.threeMonth, trailingMonthEnds: window }).ratePoints;
        if (actual === null || counterfactual === null || atReference === null) {
          throw new Error(`${ramp} cannot read the dislocation pair on ${pair.date}.`);
        }
        return { nonMonetary: Math.abs(actual - counterfactual), monetary: Math.abs(counterfactual - atReference) };
      });
    const meanOf = (values: number[]) => (values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length);
    const monthEnd = responses(pairsBySet.get("month-end") ?? []);
    const episodes = ["debt-ceiling-2013", "debt-ceiling-2021", "debt-ceiling-2023"].map((set) => {
      const result = responses(pairsBySet.get(set) ?? []);
      return { set, dates: result.length, mean: round(meanOf(result.map((entry) => entry.nonMonetary))), max: Math.max(0, ...result.map((entry) => entry.nonMonetary)) };
    });
    const debt = ["debt-ceiling-2013", "debt-ceiling-2021", "debt-ceiling-2023"].flatMap((set) => responses(pairsBySet.get(set) ?? []));
    const dsMonth = meanOf(monthEnd.map((entry) => entry.nonMonetary));
    const dsDebt = meanOf(debt.map((entry) => entry.nonMonetary));
    const all = [...monthEnd, ...debt];
    const monetaryMean = meanOf(all.map((entry) => entry.monetary));
    return {
      monthEnd: round(dsMonth),
      debtCeiling: round(dsDebt),
      combined: round((dsMonth + dsDebt) / 2),
      episodes,
      noiseShare: monetaryMean === 0 ? null : round(meanOf(all.map((entry) => entry.nonMonetary)) / monetaryMean),
    };
  };

  const candidateRows = new Map(RAMPS.map((ramp) => [ramp, rowsFor(ramp)]));
  const currentRows = candidateRows.get("current") ?? [];
  const measurements = RAMPS.map((ramp) => {
    const readings = readingsByRamp.get(ramp) ?? [];
    const rows = candidateRows.get(ramp) ?? [];
    if (rows.length !== currentRows.length || rows.some((row, index) => row.quarter !== currentRows[index]?.quarter)) {
      throw new Error(`${ramp} does not score the same signal quarters as the current ramp.`);
    }
    const draws = indexSets.map((indices) => {
      const mine = premiseScore(indices.map((index) => rows[index]));
      const theirs = premiseScore(indices.map((index) => currentRows[index]));
      return Number.isFinite(mine) && Number.isFinite(theirs) ? (mine > theirs ? 1 : 0) : Number.NaN;
    });
    const usable = draws.filter(Number.isFinite);
    const scored = readings.filter((reading) => reading.ratePoints !== null);
    return {
      ramp,
      monthsScored: scored.length,
      tightQuarters: rows.filter((row) => row.tight).length,
      saturationShare: round(readings.filter((reading) => reading.saturated).length / readings.length),
      scoreAt100Share: round(readings.filter((reading) => reading.fundingPressure === 100).length / readings.length),
      changes: changesIn(readings),
      changesPerYear: round(changesIn(readings) / ((readings.length - 1) / 12), 3),
      deltaValue: round(meanDifference(rows, "forwardValue")),
      deltaCount: round(meanDifference(rows, "forwardCount")),
      premiseScore: round(premiseScore(rows)),
      premiseBeatsCurrentShare: round(usable.length === 0 ? 0 : usable.reduce((total, draw) => total + draw, 0) / usable.length),
      premiseComparisonDiscarded: draws.length - usable.length,
      dislocation: dislocationFor(ramp),
      changesInConditions: readings.flatMap((reading, index) => {
        const previous = readings[index - 1];
        return previous && previous.conditions !== null && reading.conditions !== null && previous.conditions !== reading.conditions
          ? [{ recordDate: reading.recordDate, from: previous.conditions, to: reading.conditions }]
          : [];
      }),
    };
  });

  const asMetrics = (entry: (typeof measurements)[number]): RampMetrics => ({
    ramp: entry.ramp,
    premiseScore: entry.premiseScore ?? Number.NaN,
    premiseBeatsCurrentShare: entry.premiseBeatsCurrentShare ?? 0,
    deltaValue: entry.deltaValue ?? Number.NaN,
    deltaCount: entry.deltaCount ?? Number.NaN,
    saturationShare: entry.saturationShare ?? Number.NaN,
    changes: entry.changes,
    dislocation: entry.dislocation.combined ?? Number.NaN,
  });
  const currentMeasurement = measurements.find((entry) => entry.ramp === "current");
  if (!currentMeasurement) {
    throw new Error("The current ramp was not measured.");
  }
  const decision = evaluateDecisionRule(
    asMetrics(currentMeasurement),
    measurements.filter((entry) => entry.ramp !== "current").map(asMetrics),
  );

  return {
    registration: "docs/research/premise-test-preregistration.md",
    generator: "scripts/research/premiseTest.ts",
    record: { months: steps.length, first: steps[0]?.treasury.record_date ?? null, last: steps.at(-1)?.treasury.record_date ?? null },
    signalQuarters: { first: primaryRows[0]?.quarter ?? null, last: primaryRows.at(-1)?.quarter ?? null, n: primaryRows.length, tight: primaryRows.filter((row) => row.tight).length, lastMatureOutcome: lastMature },
    bootstrap: BOOTSTRAP,
    signals: primaryRows.map((row) => ({ quarter: row.quarter, tight: row.tight, fundingPressure: row.fundingPressure, riskAppetite: row.riskAppetite, forwardValue: round(row.forwardValue), forwardCount: round(row.forwardCount) })),
    p1: serializeP1(p1),
    p1ByHorizon,
    p2,
    p2UnboundedPressure: p2Unbounded,
    leadLag,
    sensitivity,
    p3: { n: 0, verdict: "not testable", reason: "No published weekly brief yet has an observed outcome two quarters later." },
    candidates: measurements,
    decision,
  };
};

const main = () => {
  const results = runPremiseTest();
  const serialized = `${JSON.stringify(results, null, 2)}\n`;
  if (process.argv.includes("--check")) {
    if (readFileSync(RESULTS_PATH, "utf8") !== serialized) {
      process.stderr.write(`[premise-test] ${RESULTS_PATH} differs from a fresh run.\n`);
      process.exit(1);
    }
    process.stdout.write(`[premise-test] ${RESULTS_PATH} reproduces.\n`);
    return;
  }
  writeFileSync(RESULTS_PATH, serialized);
  process.stdout.write(`[premise-test] wrote ${RESULTS_PATH}\n`);
};

if (import.meta.main) {
  main();
}
