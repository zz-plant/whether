import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import {
  BASE_RATE_VELOCITY_LOOKBACK_DAYS,
  BASE_RATE_VELOCITY_POINTS,
  BASE_RATE_VELOCITY_THRESHOLD,
  computeBaseRateVelocityPoints,
  computeTightnessScore,
  classifyRegime,
  DEFAULT_THRESHOLDS,
  resolveBaseRateVelocityDelta,
  type RegimeThresholds,
} from "../lib/regimeEngineCore";
import { advanceRegimeState, SHOCK_CROSSING_POINTS } from "../lib/regimeStateMachine";
import { applyMacroAdjustments } from "../lib/regimeEngineDiagnostics";
import { buildWeeklySummary } from "../lib/summary/weeklySummary";
import { buildMonthlySummary } from "../lib/summary/monthlySummary";
import { getTimeMachineRegimeSeries } from "../lib/timeMachine/timeMachineCache";
import summaryArchive from "../data/summary_archive.json";
import { z } from "zod";
import type { RegimeAssessment } from "../lib/regimeEngine";
import type { MacroSeriesReading } from "../lib/types";

const thresholds: RegimeThresholds = { ...DEFAULT_THRESHOLDS };

const dayOffset = (daysAgo: number) =>
  new Date(Date.UTC(2026, 5, 30) - daysAgo * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

describe("tightening-speed term", () => {
  it("measures the base-rate move closest to the lookback inside the gap bounds", () => {
    const history = [
      { date: dayOffset(200), value: 1.0 }, // outside the gap bounds, ignored
      { date: dayOffset(95), value: 1.4 }, // closest to the 91-day target
      { date: dayOffset(70), value: 1.6 }, // inside bounds but farther from target
      { date: dayOffset(0), value: 2.5 },
    ];
    assert.equal(resolveBaseRateVelocityDelta(history), 1.1);
  });

  it("returns null when no observation falls inside the gap bounds", () => {
    const history = [
      { date: dayOffset(10), value: 2.0 },
      { date: dayOffset(0), value: 2.5 },
    ];
    assert.equal(resolveBaseRateVelocityDelta(history), null);
    assert.equal(resolveBaseRateVelocityDelta(null), null);
    assert.equal(resolveBaseRateVelocityDelta([]), null);
  });

  it("ramps past the threshold, caps at the ceiling, and floors easing at zero", () => {
    const at = (delta: number) =>
      computeBaseRateVelocityPoints([
        { date: dayOffset(95), value: 1.0 },
        { date: dayOffset(0), value: 1.0 + delta },
      ]);

    assert.equal(at(BASE_RATE_VELOCITY_THRESHOLD).points, 0); // at threshold: nothing
    assert.equal(at(BASE_RATE_VELOCITY_THRESHOLD + 0.1).points, 12); // 0.1 × 120
    const capped = at(2.0);
    assert.equal(capped.points, BASE_RATE_VELOCITY_POINTS); // saturates
    assert.equal(at(-0.5).points, 0); // easing never tightens
  });

  it("reads 0 without history so omitting call sites stay comparable", () => {
    assert.deepEqual(computeBaseRateVelocityPoints(undefined), { points: 0, delta: null });
  });

  it("adds velocity points to the tightness score sub-ceiling", () => {
    // Rate below the 3.5% ramp, no inversion: velocity alone must carry the score.
    const score = computeTightnessScore(1.5, 0.5, thresholds.baseRateTightness, 60);
    assert.equal(score, 60);
    // Over-subscription is clipped by the published cap, per the level-ramp convention.
    const clipped = computeTightnessScore(4.5, -1.0, thresholds.baseRateTightness, 60);
    assert.equal(clipped, 100);
  });
});

const macroReading = (
  id: MacroSeriesReading["id"],
  value: number | null,
  history?: { date: string; value: number | null }[],
): MacroSeriesReading => ({
  id,
  label: id,
  value,
  unit: "index",
  explanation: "test",
  sourceLabel: "test",
  sourceUrl: "https://example.com",
  formulaUrl: "/formulas",
  record_date: "2026-06-30",
  fetched_at: "2026-06-30T00:00:00.000Z",
  isLive: false,
  history,
});

describe("market-stress veto", () => {
  // Baseline 75: the spot haircut (−20 max) alone cannot reach the regime line,
  // so the veto is what binds — that is the disagreement the veto exists for.
  const vixMean = (mean: number, spot = mean) => {
    const history = Array.from({ length: 10 }, (_, i) => ({
      date: dayOffset(i),
      value: mean,
    }));
    return macroReading("VIX_INDEX", spot, history);
  };

  it("caps the risk-appetite proxy at the regime line when the trailing mean is extreme", () => {
    const result = applyMacroAdjustments(80, 75, [vixMean(35)]);
    assert.equal(result.riskAppetite, 50); // cannot read better than VOLATILE-side
    assert.equal(result.marketStressVetoApplied, true);
    assert.ok(result.boundaryContributors.some((line) => line.includes("veto")));
  });

  it("caps five points above the line while stress unwinds", () => {
    const result = applyMacroAdjustments(80, 75, [vixMean(25)]);
    assert.equal(result.riskAppetite, 55);
  });

  it("does not cap below the unwind band", () => {
    const result = applyMacroAdjustments(80, 75, [vixMean(18)]);
    assert.equal(result.riskAppetite, 75);
    assert.equal(result.marketStressVetoApplied, false);
  });

  it("falls back to the spot value when the reading carries no history", () => {
    const result = applyMacroAdjustments(80, 75, [macroReading("VIX_INDEX", 40)]);
    assert.equal(result.riskAppetite, 50);
  });

  it("never tightens the cap — a lower score is left alone", () => {
    const result = applyMacroAdjustments(80, 40, [vixMean(35)]);
    assert.equal(result.riskAppetite, 20);
    assert.equal(result.marketStressVetoApplied, false);
  });
});

const machineSignals = (tightness: number, riskAppetite: number) => {
  const nearestThresholdDelta = Math.min(
    Math.abs(tightness - thresholds.tightnessRegime),
    Math.abs(riskAppetite - thresholds.riskAppetiteRegime),
  );
  return {
    tightness,
    riskAppetite,
    thresholds,
    diagnostics: {
      confidence: nearestThresholdDelta >= 13 ? ("HIGH" as const) : ("MEDIUM" as const),
      nearestThresholdDelta,
      transitionWatch: nearestThresholdDelta <= 5,
    },
  };
};

describe("flip governance", () => {
  it("commits a shock crossing immediately and marks it", () => {
    // Tightness jumps the 70-line by more than SHOCK_CROSSING_POINTS in one step.
    const first = advanceRegimeState(null, machineSignals(40, 60));
    const shock = advanceRegimeState(first.snapshot, machineSignals(40 + SHOCK_CROSSING_POINTS + 6, 40));
    assert.equal(shock.committed, true);
    assert.equal(shock.shock, true);
    assert.ok(shock.transitionReason.includes("no published reversal condition fired"));
  });

  it("does not mark a shock when the prior reading sat inside the near band", () => {
    // 69 is one point from the 70-line: the near-band warning was live, so the
    // published reversal condition could have fired. The 26-point jump crosses
    // by a shock-sized move but is not a shock; it confirms through the gate.
    const first = advanceRegimeState(null, machineSignals(69, 30));
    const crossing = advanceRegimeState(first.snapshot, machineSignals(95, 30));
    assert.equal(crossing.candidateState, "SCARCITY");
    assert.equal(crossing.shock, undefined);
    assert.ok(!crossing.transitionReason.includes("no published reversal condition fired"));
  });

  it("requires two confirmations for a near-boundary gradual crossing", () => {
    const start = advanceRegimeState(null, machineSignals(66, 55));
    // Crosses the tightness line by 3 points — inside the near band, not a shock.
    const pending = advanceRegimeState(start.snapshot, machineSignals(73, 55));
    assert.equal(pending.committed, false);
    assert.equal(pending.pending, true);
    const committed = advanceRegimeState(pending.snapshot, machineSignals(74, 55));
    assert.equal(committed.committed, true);
    assert.equal(committed.shock, undefined);
  });

  it("keeps classifyRegime a pure quadrant read with no machine memory", () => {
    assert.equal(classifyRegime(75, 30, thresholds), "SCARCITY");
    assert.equal(classifyRegime(30, 40, thresholds), "VOLATILE");
    assert.equal(classifyRegime(75, 55, thresholds), "DEFENSIVE");
    assert.equal(classifyRegime(30, 60, thresholds), "EXPANSION");
  });
});

const summaryProvenance = {
  sourceLabel: "test",
  sourceUrl: "https://example.com",
  timestampLabel: "Jun 30, 2026",
  ageLabel: "0h.",
  statusLabel: "Live",
};

const assessment = (
  overrides: Partial<{
    regime: "SCARCITY" | "DEFENSIVE" | "VOLATILE" | "EXPANSION";
    tightnessSaturated: boolean;
    shockCrossing: boolean;
  }>,
) => {
  const regime = overrides.regime ?? "EXPANSION";
  const tightness = regime === "EXPANSION" || regime === "VOLATILE" ? 40 : 80;
  const riskAppetite = regime === "SCARCITY" || regime === "VOLATILE" ? 40 : 60;
  const fixture: RegimeAssessment = {
    regime,
    regimeTransition: undefined,
    scores: {
      tightness,
      tightnessPressure: overrides.tightnessSaturated ? 101 : 40,
      tightnessSaturated: overrides.tightnessSaturated === true,
      riskAppetite,
      baseRateUsed: "1M" as const,
      baseRate: 2.0,
      curveSlope: 0.5,
    },
    diagnostics: {
      tightnessVsThreshold: 0,
      riskAppetiteVsThreshold: 0,
      nearestThresholdDelta: 20,
      confidence: "HIGH" as const,
      transitionWatch: false,
      intensity: "STRONG" as const,
      boundaryContributors: [],
      weakReadCount: 0,
      twoWeakReadsWarning: false,
      shockCrossing: overrides.shockCrossing === true,
    },
    description: "test description",
    constraints: [],
    tightnessExplanation: "test",
    riskAppetiteExplanation: "test",
    dataWarnings: [],
    thresholds,
    inputs: [],
    policyAssessment: {
      version: "test",
      normalizations: [],
      composites: { cts: 0, ras: 0 },
      posture: "RISK_ON" as const,
      band: "NEUTRAL" as const,
      confidenceIndex: { signalDisagreement: 0, distanceFromNeutral: 0, signalDispersion: 0 },
      refusal: { refused: false, reasons: [] },
      governanceParameters: {
        hiringThreshold: "MODERATE",
        paybackWindowTolerance: "STANDARD",
        rollbackRequirement: "REVERSIBLE_ONLY",
        approvalVelocity: "BALANCED",
        expansionScope: "BALANCED",
        experimentationTolerance: "MEDIUM",
      },
    },
    signalInfluence: [],
  };
  return fixture;
};

describe("saturated-financing tempo", () => {
  it("swaps the expansion guidance when the financing read saturates", () => {
    const summary = buildWeeklySummary({
      assessment: assessment({ regime: "EXPANSION", tightnessSaturated: true }),
      provenance: summaryProvenance,
    });
    assert.match(summary.guidance, /selectively inside proven demand lanes/);
    assert.doesNotMatch(summary.guidance, /scale the highest-ROI bets/);
  });

  it("keeps the standard expansion guidance when the read has not saturated", () => {
    const summary = buildWeeklySummary({
      assessment: assessment({ regime: "EXPANSION" }),
      provenance: summaryProvenance,
    });
    assert.match(summary.guidance, /scale the highest-ROI bets/);
  });

  it("does not change non-expansion guidance", () => {
    const summary = buildMonthlySummary({
      assessment: assessment({ regime: "SCARCITY", tightnessSaturated: true }),
      provenance: summaryProvenance,
    });
    assert.match(summary.guidance, /lock discretionary spend/);
  });
});

describe("shock-crossing honesty in published copy", () => {
  it("weekly and monthly summaries admit an unconfirmed flip", () => {
    for (const build of [buildWeeklySummary, buildMonthlySummary]) {
      const summary = build({
        assessment: assessment({ regime: "SCARCITY", shockCrossing: true }),
        provenance: summaryProvenance,
      });
      assert.match(
        summary.summary,
        /no published reversal condition fired/,
      );
    }
  });

  it("leaves ordinary calls alone", () => {
    const summary = buildWeeklySummary({
      assessment: assessment({ regime: "SCARCITY" }),
      provenance: summaryProvenance,
    });
    assert.doesNotMatch(summary.summary, /reversal condition/);
  });
});

describe("lookback window constant", () => {
  it("stays inside the resolver's gap bounds", () => {
    assert.ok(BASE_RATE_VELOCITY_LOOKBACK_DAYS >= 60 && BASE_RATE_VELOCITY_LOOKBACK_DAYS <= 130);
  });
});

describe("governed replay parity", () => {
  /**
   * The runtime walk and the archive generators replay the same months with
   * the same inputs — the stored daily VIX tail and the resolved base-rate
   * velocity pair — so they must publish the same record. They drifted when
   * the walk approximated daily cadence with month-end values: November and
   * December 2020 published 50/VOLATILE from /history while the archives
   * recorded 66/68 EXPANSION. (Those archive numbers were themselves inflated:
   * the generators read FRED's empty holiday fields as a VIX of 0, which pulled
   * the veto's trailing mean under its unwind band. With holidays as nulls the
   * corrected record is 55/VOLATILE for both months, and both walks agree.)
   *
   * The archive loader's zod schema keeps only the copy surfaces need, so the
   * scores the generator writes at the entry level are read through a minimal
   * schema here. Skipping is loud: a month whose scores went missing must fail
   * the test, not silently leave the parity set.
   */
  const MonthlyArchiveScoresSchema = z.object({
    cadence: z.literal("monthly"),
    year: z.number(),
    month: z.number(),
    tightness: z.number(),
    riskAppetite: z.number(),
    summary: z.object({ regime: z.string() }),
  });

  const rawArchiveEntries = z.array(z.record(z.string(), z.unknown())).parse(summaryArchive);
  const monthlyRawCount = rawArchiveEntries.filter((entry) => entry.cadence === "monthly").length;
  const monthlyArchive = rawArchiveEntries.flatMap((entry) => {
    const parsed = MonthlyArchiveScoresSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });

  it("reads every monthly archive entry with its scores", () => {
    assert.equal(monthlyArchive.length, monthlyRawCount);
    assert.equal(monthlyArchive.length > 100, true);
  });

  it("publishes the same regime and scores as the archive for every month on record", () => {
    const walk = getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER);
    const byMonth = new Map(walk.map((entry) => [`${entry.year}-${entry.month}`, entry]));
    assert.equal(monthlyArchive.length > 100, true);

    const diffs: string[] = [];
    for (const entry of monthlyArchive) {
      const replayed = byMonth.get(`${entry.year}-${entry.month}`);
      if (!replayed) {
        diffs.push(`${entry.year}-${entry.month}: missing from the runtime walk`);
        continue;
      }
      if (
        replayed.regime !== entry.summary.regime ||
        replayed.tightness !== entry.tightness ||
        replayed.riskAppetite !== entry.riskAppetite
      ) {
        diffs.push(
          `${entry.year}-${entry.month}: walk ${replayed.regime} ${replayed.tightness}/${replayed.riskAppetite}` +
            ` vs archive ${entry.summary.regime} ${entry.tightness}/${entry.riskAppetite}`,
        );
      }
    }
    assert.deepEqual(diffs, []);
  });

  it("scores the 2020 stress unwind from the daily VIX tail, not a monthly mean", () => {
    const byMonth = new Map(
      getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER).map((entry) => [
        `${entry.year}-${entry.month}`,
        entry,
      ]),
    );
    // Late Nov and late Dec 2020 the daily VIX averaged 22-23, inside the
    // late-unwind band, so the veto caps risk appetite at 55. A month-end-only
    // mean read those months at 50/VOLATILE; a holiday read as 0 lifted the cap
    // and published 66/68 EXPANSION. Either defect moves these numbers.
    const november = byMonth.get("2020-11");
    const december = byMonth.get("2020-12");
    assert.equal(november?.riskAppetite, 55);
    assert.equal(december?.riskAppetite, 55);
    assert.equal(november?.regime, "VOLATILE");
    assert.equal(december?.regime, "VOLATILE");
  });
});
