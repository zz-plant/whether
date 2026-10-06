import { describe, it } from "bun:test";
import assert from "node:assert/strict";

import {
  buildRegimePhaseModel,
  describePhaseGap,
  formatPhaseMonth,
  regimeAtCoordinates,
  resolvePhaseSpan,
  type PhaseSeriesEntry,
} from "../lib/regimePhaseSpace";
import { DEFAULT_THRESHOLDS } from "../lib/regimeEngineCore";
import { advanceRegimeState } from "../lib/regimeStateMachine";
import type { RegimeKey } from "../lib/types";

/** The state machine's own classifier, reached through its public entry point.
 *  With no previous state it commits the candidate immediately, so what comes
 *  back is the raw quadrant rather than a hysteresis-delayed one. */
const classifyViaStateMachine = (tightness: number, riskAppetite: number): RegimeKey =>
  advanceRegimeState(null, {
    tightness,
    riskAppetite,
    thresholds: DEFAULT_THRESHOLDS,
    diagnostics: { confidence: "HIGH", nearestThresholdDelta: 40, transitionWatch: false },
  }).nextState;

const entry = (recordDate: string, tightness: number, riskAppetite: number): PhaseSeriesEntry => ({
  recordDate,
  tightness,
  riskAppetite,
  regime: regimeAtCoordinates(tightness, riskAppetite),
});

describe("regimeAtCoordinates", () => {
  it("agrees with the state machine across the whole plane", () => {
    for (let tightness = 0; tightness <= 100; tightness += 5) {
      for (let riskAppetite = 0; riskAppetite <= 100; riskAppetite += 5) {
        assert.equal(
          regimeAtCoordinates(tightness, riskAppetite),
          classifyViaStateMachine(tightness, riskAppetite),
          `disagreed at tightness ${tightness}, riskAppetite ${riskAppetite}`,
        );
      }
    }
  });

  it("treats each boundary as exclusive above, so a reading on the line stays below it", () => {
    const { tightnessRegime: t, riskAppetiteRegime: r } = DEFAULT_THRESHOLDS;
    assert.equal(regimeAtCoordinates(t, r), "VOLATILE");
    assert.equal(regimeAtCoordinates(t + 1, r), "SCARCITY");
    assert.equal(regimeAtCoordinates(t, r + 1), "EXPANSION");
    assert.equal(regimeAtCoordinates(t + 1, r + 1), "DEFENSIVE");
  });
});

describe("buildRegimePhaseModel", () => {
  const series = [
    entry("2025-10-31", 90, 60),
    entry("2025-11-30", 90, 62),
    entry("2025-12-31", 43, 68),
    entry("2026-01-31", 40, 70),
  ];

  it("returns null below two months, because a trace needs a segment", () => {
    assert.equal(buildRegimePhaseModel([]), null);
    assert.equal(buildRegimePhaseModel([entry("2026-01-31", 40, 70)]), null);
  });

  it("marks the month the call changed, not every month in the new regime", () => {
    const model = buildRegimePhaseModel(series)!;
    assert.deepEqual(
      model.changes.map((point) => point.recordDate),
      ["2025-12-31"],
    );
  });

  it("measures each gap on its own axis and names the regime that axis alone would reach", () => {
    const { gaps } = buildRegimePhaseModel(series)!;

    // Funding pressure 40 against a boundary of 70.
    assert.equal(gaps.tightness.delta, -30);
    assert.equal(gaps.tightness.distance, 30);
    assert.equal(gaps.tightness.side, "below");
    assert.equal(gaps.tightness.flipsTo, "DEFENSIVE");

    // Risk appetite 70 against a boundary of 50.
    assert.equal(gaps.riskAppetite.delta, 20);
    assert.equal(gaps.riskAppetite.side, "above");
    assert.equal(gaps.riskAppetite.flipsTo, "VOLATILE");
  });

  it("names the current regime for neither gap, since one axis crossing always leaves it", () => {
    const { gaps, current } = buildRegimePhaseModel(series)!;
    assert.notEqual(gaps.tightness.flipsTo, current.regime);
    assert.notEqual(gaps.riskAppetite.flipsTo, current.regime);
  });

  it("counts occupancy over the whole window and breaks ties towards the harsher regime", () => {
    const model = buildRegimePhaseModel(series)!;
    // DEFENSIVE and EXPANSION each hold two of the four months.
    assert.equal(model.occupancy[0]!.regime, "DEFENSIVE");
    assert.equal(model.occupancy[0]!.months, 2);
    assert.equal(model.occupancy[0]!.share, 0.5);
    assert.equal(model.occupancy[1]!.regime, "EXPANSION");
    assert.equal(
      model.occupancy.reduce((total, row) => total + row.months, 0),
      series.length,
    );
  });

  it("flags a clipped funding-pressure reading rather than drawing it as measured", () => {
    const model = buildRegimePhaseModel([
      entry("2024-04-30", 100, 26),
      entry("2024-05-31", 100, 25),
      entry("2024-08-31", 90, 40),
    ])!;
    assert.equal(model.saturatedMonths, 2);
    assert.equal(model.current.saturated, false);
  });

  it("keeps at least a segment of recent markers even when asked for fewer", () => {
    assert.equal(buildRegimePhaseModel(series, { recentMonths: 1 })!.recent.length, 2);
  });

  it("honours threshold overrides in both the quadrant and the gaps", () => {
    const model = buildRegimePhaseModel(series, {
      thresholds: { ...DEFAULT_THRESHOLDS, tightnessRegime: 30 },
    })!;
    assert.equal(model.thresholds.tightness, 30);
    assert.equal(model.gaps.tightness.delta, 10);
    assert.equal(model.gaps.tightness.side, "above");
  });
});

describe("formatPhaseMonth", () => {
  it("reads a month-end record date in UTC, so it does not slide west of Greenwich", () => {
    assert.equal(formatPhaseMonth("2026-01-31"), "Jan 2026");
    assert.equal(formatPhaseMonth("2025-12-31"), "Dec 2025");
  });

  it("passes an unparseable stamp through rather than rendering Invalid Date", () => {
    assert.equal(formatPhaseMonth("not-a-date"), "not-a-date");
  });
});

describe("resolvePhaseSpan", () => {
  it("falls back rather than throwing, because this reads a query string", () => {
    assert.equal(resolvePhaseSpan(undefined).key, "5y");
    assert.equal(resolvePhaseSpan("nonsense").key, "5y");
    assert.equal(resolvePhaseSpan(["3y", "max"]).key, "3y");
  });

  it("resolves each declared window", () => {
    assert.equal(resolvePhaseSpan("3y").months, 36);
    assert.equal(resolvePhaseSpan("10y").months, 120);
  });
});

describe("describePhaseGap", () => {
  const { gaps } = buildRegimePhaseModel([entry("2026-01-30", 40, 70), entry("2026-01-31", 40, 70)])!;

  it("says which way the reading would have to move, and what it would then read", () => {
    assert.equal(
      describePhaseGap(gaps.tightness),
      "Funding pressure is 30 points below its boundary. Rising through it alone would read Cloudy.",
    );
    assert.equal(
      describePhaseGap(gaps.riskAppetite),
      "Risk appetite is 20 points above its boundary. Falling back through it alone would read Stormy.",
    );
  });

  it("singularises a one-point gap", () => {
    const single = buildRegimePhaseModel([entry("2026-01-30", 69, 70), entry("2026-01-31", 69, 70)])!;
    assert.match(describePhaseGap(single.gaps.tightness), /\b1 point below\b/);
  });
});
