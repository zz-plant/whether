import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { evaluateRegime } from "../lib/regimeEngine";
import {
  buildLastYearComparison,
  buildReportDynamics,
  buildSnapshotFallbackTreasury,
  buildHistoricalAnalogs,
  buildFlipThreshold,
  buildReportEvidenceItems,
  buildWeeklyConfidenceSeries,
  classifyConfidenceTrend,
} from "../lib/report/reportData";
import type { TreasuryData } from "../lib/types";
import type { RegimeAssessment } from "../lib/regimeEngine";
import { resolveSectorKey } from "../lib/report/sectorSensitivity";
import { resolveConfidencePercent, resolvePublishedConfidence } from "../lib/report/confidence";
import { buildCanonicalBoundedDecisionRules } from "../lib/report/boundedDecisionRules";
import { formatConfidencePlainLabel } from "../lib/report/reportFormatting";
import { assessment as fixtureAssessment } from "./factories/exportFixtures";

const makeTreasury = (
  record_date: string,
  oneMonth: number,
  twoYear: number,
  tenYear: number
): TreasuryData => ({
  source: "US Treasury",
  record_date,
  fetched_at: `${record_date}T12:00:00Z`,
  isLive: false,
  yields: {
    oneMonth,
    twoYear,
    tenYear,
  },
});

describe("buildLastYearComparison", () => {
  it("maps prior and current assessments into a comparable shape", () => {
    const priorAssessment = evaluateRegime(makeTreasury("2024-02-29", 5.1, 4.8, 4.5));
    const currentAssessment = evaluateRegime(makeTreasury("2025-02-28", 4.2, 4.1, 4.2));

    const comparison = buildLastYearComparison({
      prior: priorAssessment,
      priorRecordDate: "2024-02-29",
      current: currentAssessment,
      currentRecordDate: "2025-02-28",
    });

    assert.equal(comparison.prior.recordDate, "2024-02-29");
    assert.equal(comparison.current.recordDate, "2025-02-28");
    assert.equal(comparison.prior.regime, priorAssessment.regime);
    assert.equal(comparison.current.regime, currentAssessment.regime);
    assert.equal(comparison.prior.tightness, priorAssessment.scores.tightness);
    assert.equal(comparison.current.riskAppetite, currentAssessment.scores.riskAppetite);
  });
});


describe("buildReportDynamics", () => {
  const makeAssessment = ({
    tightness,
    riskAppetite,
    baseRate,
    curveSlope,
    regime = "VOLATILE",
  }: {
    tightness: number;
    riskAppetite: number;
    baseRate: number;
    curveSlope: number;
    regime?: "SCARCITY" | "DEFENSIVE" | "VOLATILE" | "EXPANSION";
  }) =>
    ({
      regime,
      scores: { tightness, riskAppetite, baseRate, curveSlope },
    }) as ReturnType<typeof evaluateRegime>;

  it("marks improving when favorable signal directions dominate", () => {
    const previous = makeAssessment({ tightness: 60, riskAppetite: 45, baseRate: 5, curveSlope: -0.5 });
    const current = makeAssessment({ tightness: 50, riskAppetite: 55, baseRate: 4, curveSlope: -0.2 });

    const dynamics = buildReportDynamics({ current, previous });

    assert.equal(dynamics.directionLabel, "improving");
  });

  it("marks deteriorating when unfavorable signal directions dominate", () => {
    const previous = makeAssessment({ tightness: 40, riskAppetite: 55, baseRate: 4, curveSlope: 0.2 });
    const current = makeAssessment({ tightness: 55, riskAppetite: 40, baseRate: 5, curveSlope: -0.4 });

    const dynamics = buildReportDynamics({ current, previous });

    assert.equal(dynamics.directionLabel, "deteriorating");
  });

  it("marks mixed when improvements and deteriorations are both present", () => {
    const previous = makeAssessment({ tightness: 50, riskAppetite: 50, baseRate: 4, curveSlope: 0.1 });
    const current = makeAssessment({ tightness: 45, riskAppetite: 40, baseRate: 4.5, curveSlope: 0.2 });

    const dynamics = buildReportDynamics({ current, previous });

    assert.equal(dynamics.directionLabel, "mixed");
  });

  it("orders changed signals by largest absolute movement", () => {
    const previous = makeAssessment({ tightness: 50, riskAppetite: 50, baseRate: 4, curveSlope: 0.1 });
    const current = makeAssessment({ tightness: 50.2, riskAppetite: 60, baseRate: 4.5, curveSlope: 0.15 });

    const dynamics = buildReportDynamics({ current, previous });

    assert.deepEqual(
      dynamics.changedSignals.map((signal) => signal.key),
      ["riskAppetite", "baseRate", "tightness", "curveSlope"],
    );
  });

  it("flags extreme weekly shifts as anomalies instead of normal deltas", () => {
    const previous = makeAssessment({ tightness: 94, riskAppetite: 61, baseRate: 4, curveSlope: 0.2 });
    const current = makeAssessment({ tightness: 0, riskAppetite: 60, baseRate: 4.05, curveSlope: 0.21 });

    const dynamics = buildReportDynamics({ current, previous });

    assert.equal(dynamics.changedSignals.some((signal) => signal.key === "tightness"), false);
    assert.equal(dynamics.anomalySignals.length, 1);
    assert.equal(dynamics.anomalySignals[0]?.key, "tightness");
    assert.match(dynamics.anomalySignals[0]?.reason ?? "", /sanity threshold/i);
  });
});

describe("buildReportEvidenceItems", () => {
  /*
   * The reading of Oct 5, 2026 against Aug 31: Freezing, funding pressure 63 -> 90
   * (line 70), risk appetite 56 -> 48 (line 50), the recession warning gauge
   * +0.41% -> +0.47%. Built through `buildReportDynamics` so the moves are the
   * ones the loader would hand the builder.
   */
  const weekOf = (current: { tightness: number; riskAppetite: number; curveSlope: number }) => {
    const previous: RegimeAssessment = {
      ...fixtureAssessment,
      regime: "EXPANSION",
      scores: { ...fixtureAssessment.scores, tightness: 63, riskAppetite: 56, curveSlope: 0.41 },
    };
    const assessment: RegimeAssessment = {
      ...fixtureAssessment,
      regime: "SCARCITY",
      scores: { ...fixtureAssessment.scores, ...current },
    };
    const items = buildReportEvidenceItems({
      reportDynamics: buildReportDynamics({ current: assessment, previous }),
      assessment,
      lastUpdated: "2026-10-05",
    });
    const item = (key: "tightness" | "riskAppetite" | "baseRate" | "curveSlope") => {
      const found = items.find((entry) => entry.key === key);
      assert.ok(found, `evidence item for ${key}`);
      return found;
    };
    return { assessment, items, item };
  };

  const oct5 = { tightness: 90, riskAppetite: 48, curveSlope: 0.47 };

  it("titles each item with the signal's canonical name, never the retired 'Capital conditions'", () => {
    const { items, item } = weekOf(oct5);
    assert.equal(item("tightness").title, "Funding pressure");
    assert.equal(item("riskAppetite").title, "Risk appetite");
    assert.equal(item("curveSlope").title, "Recession warning gauge");
    assert.ok(items.every((entry) => entry.title !== "Capital conditions"));
  });

  it("calls a move tightening or easing by which way is worse for that signal, not by its sign", () => {
    const { item } = weekOf(oct5);
    // Funding pressure up is worse; risk appetite down is worse; the gauge up is better.
    assert.equal(item("tightness").directionLabel, "Tightening");
    assert.equal(item("riskAppetite").directionLabel, "Tightening");
    assert.equal(item("curveSlope").directionLabel, "Easing");
    assert.equal(item("baseRate").directionLabel, "Unchanged");
    assert.match(item("riskAppetite").supportingBullets[0] ?? "", /-8\.0 .*tightening the read/);
    assert.match(item("curveSlope").supportingBullets[0] ?? "", /easing the read/);
  });

  it("labels distance from the line by the distance, not by the size of the week's move", () => {
    const { assessment, item } = weekOf(oct5);
    // Risk appetite moved 8 points and sits 2 from its line: it is not "well clear".
    assert.doesNotMatch(item("riskAppetite").confidenceLabel, /well clear/);
    // The nearest line is the one the page's own confidence is measured from, so
    // that card and the trust strip say the same word.
    assert.equal(
      item("riskAppetite").confidenceLabel,
      formatConfidencePlainLabel(resolvePublishedConfidence({ assessment }).label),
    );
    // Funding pressure is 20 points past its line: that one is well clear.
    assert.match(item("tightness").confidenceLabel, /^High \(well clear/);

    // The other way round: a half-point move used to read Low ("close to the
    // line") whatever the distance. 6.5 points above the risk line is not close.
    const quiet = weekOf({ ...oct5, riskAppetite: 56.5 });
    assert.match(quiet.item("riskAppetite").confidenceLabel, /^High/);
  });

  it("states the recession warning gauge's payback bar as the Spending rule's, with no condition the reading contradicts", () => {
    const spending = buildCanonicalBoundedDecisionRules({
      regime: "SCARCITY",
      thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
      scores: { tightness: 90, riskAppetite: 48 },
    }).find((rule) => rule.area === "burn-discipline");
    const bar = /inside (\d+) months/.exec(spending?.recommendation ?? "")?.[1];
    assert.ok(bar, "the Spending rule states a payback bar");

    for (const curveSlope of [0.53, 0.35, -0.2]) {
      const line = weekOf({ ...oct5, curveSlope }).item("curveSlope").immediateImplication;
      assert.match(line, new RegExp(`\\b${bar}-month payback bar on new spend`), line);
      // The old line chose 12 or 9 months, said the curve "returns above 0.0%"
      // when it was already above, and "funding pressure stays below 70" at 90.
      assert.doesNotMatch(line, /\b(12|9)-month|returns above|remains above|stays below|funding pressure/i, line);
    }
    assert.match(weekOf({ ...oct5, curveSlope: 0.53 }).item("curveSlope").immediateImplication, /rising gauge/);
    assert.match(weekOf({ ...oct5, curveSlope: 0.35 }).item("curveSlope").immediateImplication, /falling gauge/);
  });
});


describe("buildSnapshotFallbackTreasury", () => {
  it("adds fallback markers when snapshot payload has none", () => {
    const snapshot = makeTreasury("2025-01-31", 4.4, 4.2, 4.1);
    const now = new Date("2026-01-15T12:00:00.000Z");

    const fallback = buildSnapshotFallbackTreasury(snapshot, now);

    assert.equal(fallback.fallback_at, "2026-01-15T12:00:00.000Z");
    assert.equal(
      fallback.fallback_reason,
      "Report dependency outage: serving cached treasury snapshot.",
    );
  });

  it("preserves existing fallback markers from upstream payload", () => {
    const snapshot: TreasuryData = {
      ...makeTreasury("2025-01-31", 4.4, 4.2, 4.1),
      fallback_at: "2025-01-31T13:00:00.000Z",
      fallback_reason: "Upstream treasury timeout.",
    };

    const fallback = buildSnapshotFallbackTreasury(snapshot, new Date("2026-01-15T12:00:00.000Z"));

    assert.equal(fallback.fallback_at, "2025-01-31T13:00:00.000Z");
    assert.equal(fallback.fallback_reason, "Upstream treasury timeout.");
  });
});


describe("sector overlay key resolution", () => {
  it("maps supported sector query values", () => {
    assert.equal(resolveSectorKey("b2b-saas"), "b2b-saas");
    assert.equal(resolveSectorKey("consumer"), "consumer");
    assert.equal(resolveSectorKey("infrastructure"), "infrastructure");
    assert.equal(resolveSectorKey("fintech"), "fintech");
    assert.equal(resolveSectorKey("healthcare"), "healthcare");
    assert.equal(resolveSectorKey("ai-platforms"), "ai-platforms");
  });

  it("falls back to b2b-saas for unknown or empty sector values", () => {
    assert.equal(resolveSectorKey(undefined), "b2b-saas");
    assert.equal(resolveSectorKey(""), "b2b-saas");
    assert.equal(resolveSectorKey("unknown-sector"), "b2b-saas");
  });
});


describe("buildHistoricalAnalogs", () => {
  const makeSnapshot = (recordDate: string, oneMonth: number, twoYear: number, tenYear: number): TreasuryData => ({
    source: "US Treasury",
    record_date: recordDate,
    fetched_at: `${recordDate}T12:00:00Z`,
    isLive: false,
    yields: { oneMonth, twoYear, tenYear },
  });

  it("returns empty list when there is no historical window", () => {
    const thresholds = { baseRateTightness: 5, tightnessRegime: 70, riskAppetiteRegime: 50 };
    const current = evaluateRegime(makeSnapshot("2026-03-01", 4.2, 4.0, 4.3), thresholds);

    const analogs = buildHistoricalAnalogs({
      current,
      snapshots: [makeSnapshot("2026-03-01", 4.2, 4.0, 4.3)],
      thresholds,
      currentTrendDirection: "stable",
    });

    assert.deepEqual(analogs, []);
  });

  it("breaks score ties by most recent record date", () => {
    const thresholds = { baseRateTightness: 5, tightnessRegime: 70, riskAppetiteRegime: 50 };
    const snapshots = [
      makeSnapshot("2025-01-31", 4.3, 4.2, 4.4),
      makeSnapshot("2025-02-28", 4.3, 4.2, 4.4),
      makeSnapshot("2025-03-31", 4.3, 4.2, 4.4),
    ];
    const current = evaluateRegime(snapshots[2], thresholds);

    const analogs = buildHistoricalAnalogs({
      current,
      snapshots,
      thresholds,
      currentTrendDirection: "stable",
    });

    assert.equal(analogs[0]?.recordDate, "2025-02-28");
    assert.equal(analogs[1]?.recordDate, "2025-01-31");
  });

  it("scores a candidate on its governed assessment when the record has one", () => {
    const thresholds = { baseRateTightness: 5, tightnessRegime: 70, riskAppetiteRegime: 50 };
    const snapshots = [
      makeSnapshot("2025-01-31", 4.3, 4.2, 4.4),
      makeSnapshot("2025-02-28", 4.3, 4.2, 4.4),
      makeSnapshot("2025-03-31", 4.3, 4.2, 4.4),
    ];
    const current = evaluateRegime(snapshots[2], thresholds);
    // Identical curves tie on a bare re-evaluation. The record says February
    // sat in a different quadrant (a stress veto the curve alone cannot see),
    // so it must lose the posture match and fall behind January.
    const governedFebruary = evaluateRegime(makeSnapshot("2025-02-28", 0.1, 0.2, 2.5), thresholds);
    assert.notEqual(governedFebruary.regime, current.regime);
    const consulted: string[] = [];

    const analogs = buildHistoricalAnalogs({
      current,
      snapshots,
      thresholds,
      currentTrendDirection: "stable",
      resolveGovernedAssessment: (recordDate) => {
        consulted.push(recordDate);
        return recordDate === "2025-02-28" ? governedFebruary : null;
      },
    });

    assert.deepEqual(consulted, ["2025-01-31", "2025-02-28"]);
    assert.equal(analogs[0]?.recordDate, "2025-01-31");
    assert.equal(analogs[0]?.dimensions.postureMatch, 1);
    assert.equal(analogs.find((item) => item.recordDate === "2025-02-28")?.dimensions.postureMatch, 0);
  });

  it("keeps deterministic ordering across equivalent runs", () => {
    const thresholds = { baseRateTightness: 5, tightnessRegime: 70, riskAppetiteRegime: 50 };
    const snapshots = [
      makeSnapshot("2024-12-31", 4.5, 4.3, 4.5),
      makeSnapshot("2025-01-31", 4.4, 4.2, 4.4),
      makeSnapshot("2025-02-28", 4.3, 4.1, 4.3),
      makeSnapshot("2025-03-31", 4.2, 4.0, 4.2),
    ];
    const current = evaluateRegime(snapshots[3], thresholds);

    const first = buildHistoricalAnalogs({
      current,
      snapshots,
      thresholds,
      currentTrendDirection: "stable",
    }).map((item) => item.recordDate);
    const second = buildHistoricalAnalogs({
      current,
      snapshots,
      thresholds,
      currentTrendDirection: "stable",
    }).map((item) => item.recordDate);

    assert.deepEqual(first, second);
  });
});



describe("weekly confidence history", () => {
  const thresholds = { baseRateTightness: 5, tightnessRegime: 70, riskAppetiteRegime: 50 };

  it("includes the current report snapshot when it is newer than cached history", () => {
    const snapshots = [
      makeTreasury("2025-01-03", 5.2, 4.8, 4.4),
      makeTreasury("2025-01-10", 5.1, 4.7, 4.4),
      makeTreasury("2025-01-17", 5.0, 4.6, 4.4),
    ];

    const series = buildWeeklyConfidenceSeries({
      snapshots,
      currentSnapshot: makeTreasury("2025-01-24", 4.8, 4.4, 4.4),
      thresholds,
      asOf: "2025-01-24",
      window: 8,
    });

    assert.equal(series.at(-1)?.recordDate, "2025-01-24");
    assert.equal(series.at(-1)?.isMissing, false);
  });

  it("reads a point's confidence from the governed assessment when the record has one", () => {
    const snapshots = [
      makeTreasury("2025-01-03", 5.2, 4.8, 4.4),
      makeTreasury("2025-01-10", 5.1, 4.7, 4.4),
      makeTreasury("2025-01-17", 5.0, 4.6, 4.4),
    ];
    const bare = buildWeeklyConfidenceSeries({ snapshots, thresholds, asOf: "2025-01-17", window: 8 });
    // The record for the middle week carries a veto the bare curve cannot see,
    // which puts it on the risk-appetite line; the point must show that distance.
    const governed = evaluateRegime(makeTreasury("2025-01-10", 4.0, 4.0, 4.25), thresholds);
    const withRecord = buildWeeklyConfidenceSeries({
      snapshots,
      thresholds,
      asOf: "2025-01-17",
      window: 8,
      resolveGovernedAssessment: (recordDate) => (recordDate === "2025-01-10" ? governed : null),
    });

    const barePoint = bare.find((point) => point.recordDate === "2025-01-10");
    const recordPoint = withRecord.find((point) => point.recordDate === "2025-01-10");
    assert.ok(barePoint && recordPoint);
    assert.notEqual(recordPoint.confidencePercent, barePoint.confidencePercent);
    assert.equal(
      recordPoint.confidencePercent,
      resolveConfidencePercent({ scores: governed.scores, thresholds: governed.thresholds }),
    );
    // Dates the record does not cover keep the bare evaluation.
    assert.equal(
      withRecord.find((point) => point.recordDate === "2025-01-03")?.confidencePercent,
      bare.find((point) => point.recordDate === "2025-01-03")?.confidencePercent,
    );
  });

  it("returns the last eight weekly points and injects missing-week markers", () => {
    const snapshots = [
      makeTreasury("2025-01-03", 5.2, 4.8, 4.4),
      makeTreasury("2025-01-10", 5.1, 4.7, 4.4),
      makeTreasury("2025-01-31", 5.0, 4.6, 4.4),
      makeTreasury("2025-02-07", 4.9, 4.5, 4.4),
      makeTreasury("2025-02-14", 4.8, 4.4, 4.4),
      makeTreasury("2025-02-21", 4.7, 4.3, 4.4),
      makeTreasury("2025-02-28", 4.6, 4.2, 4.4),
      makeTreasury("2025-03-07", 4.5, 4.1, 4.4),
      makeTreasury("2025-03-14", 4.4, 4.0, 4.4),
    ];

    const series = buildWeeklyConfidenceSeries({
      snapshots,
      thresholds,
      asOf: "2025-03-14",
      window: 8,
    });

    assert.equal(series.length, 8);
    assert.equal(series.at(-1)?.recordDate, "2025-03-14");
    assert.equal(series.some((point) => point.recordDate === "2025-02-07"), true);

    const withGap = buildWeeklyConfidenceSeries({
      snapshots: [
        makeTreasury("2025-01-03", 5.2, 4.8, 4.4),
        makeTreasury("2025-01-24", 5.1, 4.7, 4.4),
        makeTreasury("2025-01-31", 5.0, 4.6, 4.4),
      ],
      thresholds,
      asOf: "2025-01-31",
      window: 8,
    });

    assert.equal(withGap.some((point) => point.isMissing), true);
    const missing = withGap.find((point) => point.isMissing);
    assert.equal(missing?.confidencePercent, null);
  });

  it("classifies confidence trend from slope and volatility", () => {
    assert.equal(
      classifyConfidenceTrend([
        { recordDate: "2025-01-03", confidencePercent: 55, isMissing: false },
        { recordDate: "2025-01-10", confidencePercent: 59, isMissing: false },
        { recordDate: "2025-01-17", confidencePercent: 63, isMissing: false },
      ]),
      "strengthening",
    );

    assert.equal(
      classifyConfidenceTrend([
        { recordDate: "2025-01-03", confidencePercent: 68, isMissing: false },
        { recordDate: "2025-01-10", confidencePercent: 62, isMissing: false },
        { recordDate: "2025-01-17", confidencePercent: 56, isMissing: false },
      ]),
      "weakening",
    );

    assert.equal(
      classifyConfidenceTrend([
        { recordDate: "2025-01-03", confidencePercent: 55, isMissing: false },
        { recordDate: "2025-01-10", confidencePercent: 72, isMissing: false },
        { recordDate: "2025-01-17", confidencePercent: 57, isMissing: false },
      ]),
      "unstable",
    );
  });
});
describe("buildFlipThreshold", () => {
  const makeAssessment = (
    regime: "SCARCITY" | "DEFENSIVE" | "VOLATILE" | "EXPANSION",
  ) =>
    ({
      regime,
      thresholds: {
        tightnessRegime: 70,
        riskAppetiteRegime: 50,
      },
      scores: {
        tightness: 76,
        riskAppetite: 45,
      },
    }) as ReturnType<typeof evaluateRegime>;

  it("returns a future crossing for scarcity regimes", () => {
    const flip = buildFlipThreshold(makeAssessment("SCARCITY"));
    // One sentence, both boundaries, each carrying its live reading.
    assert.match(flip, /^(Funding pressure|Risk appetite) .+ or (funding pressure|risk appetite) .+\.$/);
    assert.doesNotMatch(flip, /flip condition is|flips this call/i);
    assert.match(flip, /\((?:already true at )?\d+(?: today)?\)/);
  });

  it("leads each boundary with the distance to it, in the direction it trips", () => {
    // Scarcity flips on funding pressure falling to 70 or below, or risk
    // appetite rising above 50. From 76 / 45 that is 6 pts down and 5 pts up.
    // The reader gets the subtraction done, and the inequality survives: a
    // score *at* 50 does not clear an "above 50" line, so that side says so.
    const flip = buildFlipThreshold(makeAssessment("SCARCITY"));
    assert.match(flip, /Funding pressure falls 6 pts to 70 or below \(76 today\)/);
    assert.match(flip, /risk appetite rises 5 pts to clear 50 \(45 today\)/);
  });

  it("returns a future crossing for defensive regimes", () => {
    const flip = buildFlipThreshold(makeAssessment("DEFENSIVE"));
    // One sentence, both boundaries, each carrying its live reading.
    assert.match(flip, /^(Funding pressure|Risk appetite) .+ or (funding pressure|risk appetite) .+\.$/);
    assert.doesNotMatch(flip, /flip condition is|flips this call/i);
    assert.match(flip, /\((?:already true at )?\d+(?: today)?\)/);
  });

  it("returns a future crossing for volatile regimes", () => {
    const flip = buildFlipThreshold(makeAssessment("VOLATILE"));
    // One sentence, both boundaries, each carrying its live reading.
    assert.match(flip, /^(Funding pressure|Risk appetite) .+ or (funding pressure|risk appetite) .+\.$/);
    assert.doesNotMatch(flip, /flip condition is|flips this call/i);
    assert.match(flip, /\((?:already true at )?\d+(?: today)?\)/);
  });

  it("returns a future crossing for expansion regimes", () => {
    const flip = buildFlipThreshold(makeAssessment("EXPANSION"));
    // One sentence, both boundaries, each carrying its live reading.
    assert.match(flip, /^(Funding pressure|Risk appetite) .+ or (funding pressure|risk appetite) .+\.$/);
    assert.doesNotMatch(flip, /flip condition is|flips this call/i);
    assert.match(flip, /\((?:already true at )?\d+(?: today)?\)/);
  });
});
