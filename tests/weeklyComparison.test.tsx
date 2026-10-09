import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import type { unstable_cache } from "next/cache";
import { renderToStaticMarkup } from "react-dom/server";
import { WhatChangedSection } from "../app/components/home/WhatChangedSection";
import { buildScoreMovementLine, previousScoresFromDynamics } from "../lib/export/scoreReference";
import { macroSeries } from "../lib/macroSnapshot";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import { resetOperatingSnapshotStore } from "../lib/operatingState/snapshotStore";
import { DEFAULT_THRESHOLDS, ENGINE_VERSION, evaluateRegime } from "../lib/regimeEngine";
import { buildComparedWith, comparisonBasis } from "../lib/report/comparisonBasis";
import {
  buildStoredInputs,
  findWeeklyComparisonReading,
  rescoreStoredInputs,
  scoreStoredInputs,
  type ComparisonReading,
  type RescoreStoredInputs,
} from "../lib/report/comparisonReading";
import { findSignalDelta } from "../lib/report/evidenceReaderModel";
import {
  buildSignalChangeRows,
  describeWeeklyMovement,
} from "../lib/report/home/homeSectionModel";
import { createHomePageReportDataLoader } from "../lib/report/homePageData";
import { assembleHomePage } from "../lib/report/homePageAssembler";
import { findPublishedBrief, getPublishedBriefs, PublishedBriefSchema, type PublishedBrief } from "../lib/report/publishedBriefs";
import { assembleCurrentWeekBrief } from "../lib/report/publishedBriefRecord";
import { loadReportData } from "../lib/report/reportData";
import { buildActionNowShort, buildReportDynamics, buildReportEvidenceItems } from "../lib/report/reportEvidence";
import { buildRegimeAlert } from "../lib/report/reportFormatting";
import { describeScoreMovementCaveat } from "../lib/report/scoreMovement";
import { snapshotData } from "../lib/snapshot";
import { selectWeekComparison } from "../lib/report/weekComparison";
import type { TreasuryData } from "../lib/types";
import { buildAssessmentFixture } from "./fixtures/reportFixtures";

/*
 * "What changed this week" compares the reading with last week's published
 * brief, and with the previous month-end only where the archive has no brief
 * from the previous one to two weeks (owner decision, 2026-10-07). Until then
 * every read in a month compared with the same month-end, so the Sep 15, 22 and
 * 29 briefs each restated the move since Aug 31.
 */

type RecordFields = Pick<PublishedBrief, "recordDate" | "regime" | "scores">;

/* The engine the unit records below were scored by, and the one reading them. */
const ENGINE = "engine-under-test";

const brief = (recordDate: string, scores: PublishedBrief["scores"] = { tightness: 80, riskAppetite: 40 }): RecordFields => ({
  recordDate,
  regime: "SCARCITY",
  scores: scores && { engineVersion: ENGINE, ...scores },
});

/* For records nothing re-scores: one scored by the engine reading it, or one that stored no inputs. */
const notRescored: RescoreStoredInputs = () => {
  throw new Error("a record this engine scored is compared as stored, and one with no inputs is passed over");
};

describe("the reading a week compares with", () => {
  it("is the most recent brief five to fourteen days before it", () => {
    const archive = [brief("2026-09-15"), brief("2026-09-22"), brief("2026-09-29")];

    assert.equal(findWeeklyComparisonReading(archive, "2026-10-05", ENGINE, notRescored)?.recordDate, "2026-09-29");
    // A mid-week read compares with the previous week's brief, never this week's own.
    assert.equal(findWeeklyComparisonReading(archive, "2026-10-01", ENGINE, notRescored)?.recordDate, "2026-09-22");
  });

  it("is never a record dated on or after the reading, or under five days before it", () => {
    const thisWeek = [brief("2026-09-29")];

    for (const reading of ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-03"]) {
      assert.equal(findWeeklyComparisonReading(thisWeek, reading, ENGINE, notRescored), null, `a read of ${reading}`);
    }
    assert.equal(findWeeklyComparisonReading(thisWeek, "2026-10-04", ENGINE, notRescored)?.recordDate, "2026-09-29", "five days is last week");
  });

  it("reaches back two weeks for a missed freeze, and no further, so the month-end takes over", () => {
    assert.equal(findWeeklyComparisonReading([brief("2026-09-21")], "2026-10-05", ENGINE, notRescored)?.recordDate, "2026-09-21");
    assert.equal(findWeeklyComparisonReading([brief("2026-09-20")], "2026-10-05", ENGINE, notRescored), null);
  });

  it("passes over a record that carries no scores", () => {
    const archive = [brief("2026-09-24"), { recordDate: "2026-09-29", regime: "SCARCITY" as const, scores: undefined }];

    assert.equal(findWeeklyComparisonReading(archive, "2026-10-05", ENGINE, notRescored)?.recordDate, "2026-09-24");
  });

  it("carries the record's conditions and scores, and no rate the record did not store", () => {
    const w40Shape = { tightness: 90, riskAppetite: 44, tightnessDelta: 27, riskAppetiteDelta: -12 };
    assert.deepEqual(findWeeklyComparisonReading([brief("2026-09-29", w40Shape)], "2026-10-05", ENGINE, notRescored), {
      recordDate: "2026-09-29",
      regime: "SCARCITY",
      scores: { tightness: 90, riskAppetite: 44, baseRate: null, curveSlope: null },
    });
    const stored = findWeeklyComparisonReading([brief("2026-09-29", { ...w40Shape, baseRate: 3.98, curveSlope: 0.41 })], "2026-10-05", ENGINE, notRescored);
    assert.deepEqual(stored?.scores, { tightness: 90, riskAppetite: 44, baseRate: 3.98, curveSlope: 0.41 });
  });

  it("passes over a record scored by another engine, or by one it did not record, that stored no inputs", () => {
    const otherEngine = { recordDate: "2026-09-29", regime: "SCARCITY" as const, scores: { tightness: 80, riskAppetite: 40, engineVersion: "engine-before" } };
    const unrecorded = { recordDate: "2026-09-29", regime: "SCARCITY" as const, scores: { tightness: 80, riskAppetite: 40 } };

    assert.equal(findWeeklyComparisonReading([otherEngine], "2026-10-05", ENGINE, notRescored), null, "the move would be the scoring change's");
    assert.equal(findWeeklyComparisonReading([unrecorded], "2026-10-05", ENGINE, notRescored), null);
    assert.equal(findWeeklyComparisonReading([brief("2026-09-24"), otherEngine], "2026-10-05", ENGINE, notRescored)?.recordDate, "2026-09-24");
  });

  it("finds no brief in the archive for the Oct 5 reading: w38–w40 recorded neither their engine nor their inputs", () => {
    const archive = getPublishedBriefs();
    const w40 = archive.find((record) => record.recordDate === "2026-09-29");

    assert.ok(w40?.scores, "the archive holds the Sep 29 brief");
    assert.equal(w40.scores.engineVersion, undefined);
    assert.equal(w40.inputs, undefined);
    assert.equal(findWeeklyComparisonReading(archive, "2026-10-05", ENGINE_VERSION, notRescored), null);
    assert.equal(findWeeklyComparisonReading(archive, "2020-03-31", ENGINE_VERSION, notRescored), null);
  });
});

/*
 * Every ENGINE_VERSION bump used to leave no brief to compare with until one from
 * the new engine was five days old, so the week fell back to the month-end. A
 * record frozen with its inputs is scored again by the engine reading it
 * (§1.1.53 of docs/feature-specs-current.md).
 */
describe("the one rule the loader and the stored snapshot choose by", () => {
  const monthEnd = {
    reading: { recordDate: "2026-09-30", regime: "DEFENSIVE" as const, scores: { tightness: 90, riskAppetite: 56, baseRate: null, curveSlope: null } },
    comparedWith: buildComparedWith("2026-09-30", "2026-10-05"),
  };

  it("takes last week's brief, named by its date, and never builds the month-end", () => {
    const weekly: ComparisonReading = { recordDate: "2026-09-29", regime: "SCARCITY", scores: { tightness: 80, riskAppetite: 40, baseRate: null, curveSlope: null } };
    const chosen = selectWeekComparison("2026-10-05", weekly, () => {
      throw new Error("the month-end is not scored when last week's brief is compared with");
    });
    assert.equal(chosen?.reading, weekly);
    assert.deepEqual(chosen?.comparedWith, buildComparedWith("2026-09-29", "2026-10-05"));
  });

  it("falls back to the month-end only where no brief can be compared with", () => {
    assert.equal(selectWeekComparison("2026-10-05", null, () => monthEnd), monthEnd);
    assert.equal(selectWeekComparison("2026-10-05", null, () => null), null);
  });
});

describe("a brief frozen by an earlier engine", () => {
  /* Last week's reading: a 52bp rise in the bill over 91 days, so the tightening-speed term fires. */
  const lastWeek: TreasuryData = {
    source: "https://fred.stlouisfed.org/",
    record_date: "2026-09-29",
    fetched_at: "2026-09-29T12:00:00.000Z",
    isLive: true,
    yields: { oneMonth: 3.62, threeMonth: 3.7, twoYear: 3.55, tenYear: 4.1 },
    oneMonthHistory: [
      { date: "2026-06-30", value: 3.1 },
      { date: "2026-07-31", value: 3.3 },
      { date: "2026-09-29", value: 3.62 },
    ],
  };
  const scored = evaluateRegime(lastWeek, DEFAULT_THRESHOLDS, macroSeries, null, { baseRateHistory: lastWeek.oneMonthHistory });
  const inputs = buildStoredInputs(lastWeek, macroSeries);
  const rescore = rescoreStoredInputs(evaluateRegime, DEFAULT_THRESHOLDS);
  /* Stored scores that are not this engine's, so a reading that matches the engine's was re-scored. */
  const earlier = {
    recordDate: "2026-09-29",
    regime: "SCARCITY" as const,
    scores: { tightness: 1, riskAppetite: 99, baseRate: 9, curveSlope: 9, engineVersion: "engine-before" },
    inputs,
  };

  it("is scored again from the inputs it stored, and compared with", () => {
    assert.ok(scored.scores.baseRateVelocityPoints, "the stored pair carries the tightening-speed term");
    assert.ok(scored.scores.offRecord, "and the market series outside the record are scored, into offRecord");

    assert.deepEqual(findWeeklyComparisonReading([earlier], "2026-10-05", ENGINE, rescore), {
      recordDate: "2026-09-29",
      regime: scored.regime,
      scores: {
        tightness: scored.scores.tightness,
        riskAppetite: scored.scores.riskAppetite,
        baseRate: 3.62,
        curveSlope: scored.scores.curveSlope,
      },
    });
  });

  it("carries every scored series into the re-score, the VIX closes the veto means among them", () => {
    /* Each of the five adjusts a score here: spreads and conditions add funding pressure, and the
       closes' mean of 31 caps risk appetite at its line, though the day's close of 18 takes nothing. */
    const stressed = macroSeries.map((series) => {
      if (series.id === "HY_CREDIT_SPREAD") return { ...series, value: 5.5 };
      if (series.id === "CHICAGO_FCI") return { ...series, value: 0.3 };
      if (series.id === "VIX_INDEX") {
        return { ...series, value: 18, history: Array.from({ length: 10 }, (_, day) => ({ date: `2026-09-${16 + day}`, value: 31 })) };
      }
      return series;
    });
    const expected = evaluateRegime(lastWeek, DEFAULT_THRESHOLDS, stressed, null, { baseRateHistory: lastWeek.oneMonthHistory });
    /* Conditions and the veto move the published scores; the high-yield spread, venture funding
       and layoffs move the off-record ones. The close alone (18) takes nothing. */
    assert.equal(expected.diagnostics.boundaryContributors.length, 2, "the record's series moved the published scores");
    assert.deepEqual(expected.scores.offRecord?.inputs, ["HY_CREDIT_SPREAD", "VC_FUNDING_VELOCITY", "TECH_LAYOFF_TREND"]);
    assert.deepEqual(
      scoreStoredInputs(evaluateRegime, DEFAULT_THRESHOLDS, buildStoredInputs(lastWeek, stressed), "2026-09-29").scores.offRecord,
      expected.scores.offRecord,
      "and the stored inputs say what the ones outside the record would have made the scores",
    );

    const rescored = rescore(buildStoredInputs(lastWeek, stressed), "2026-09-29");
    assert.deepEqual(rescored, {
      regime: expected.regime,
      scores: {
        tightness: expected.scores.tightness,
        riskAppetite: expected.scores.riskAppetite,
        baseRate: expected.scores.baseRate,
        curveSlope: expected.scores.curveSlope,
      },
    });
  });

  it("is compared with when it is the newest record in range that can be, whichever engine scored the rest", () => {
    assert.equal(findWeeklyComparisonReading([earlier, brief("2026-09-24")], "2026-10-05", ENGINE, rescore)?.scores.tightness, scored.scores.tightness);
    assert.equal(findWeeklyComparisonReading([earlier, brief("2026-09-30")], "2026-10-05", ENGINE, notRescored)?.recordDate, "2026-09-30");
    const withoutInputs = { ...earlier, inputs: undefined };
    assert.equal(findWeeklyComparisonReading([withoutInputs], "2026-10-05", ENGINE, notRescored), null, "no inputs, no re-score");
    assert.equal(
      findWeeklyComparisonReading([{ ...earlier, recordDate: "2026-09-24" }, withoutInputs], "2026-10-05", ENGINE, rescore)?.recordDate,
      "2026-09-24",
      "the newest record that can be compared with",
    );
  });

  it("compares no short-term rate the re-score did not read", () => {
    const noRate = { ...earlier, inputs: { ...inputs, yields: { oneMonth: null, threeMonth: null, twoYear: 3.55, tenYear: 4.1 } } };

    assert.equal(findWeeklyComparisonReading([noRate], "2026-10-05", ENGINE, rescore)?.scores.baseRate, null, "scored as 0, which is not a reading");
  });

  /* The month-end comparison re-scores with no machine state, and so does this: the conditions are the scores' quadrant. */
  it("names the conditions the re-scored scores sit in, not the ones a held flip published", () => {
    /* Risk appetite one point over its line: too close for the gate, so the machine held Stormy. */
    const held = evaluateRegime(
      lastWeek,
      DEFAULT_THRESHOLDS,
      macroSeries,
      { committedState: "VOLATILE", pendingState: null, pendingCount: 0, lastSignals: { tightness: 36, riskAppetite: 49 } },
      { baseRateHistory: lastWeek.oneMonthHistory },
    );
    assert.equal(held.regime, "VOLATILE");
    assert.equal(scored.regime, "EXPANSION");
    assert.deepEqual(held.scores, scored.scores, "the machine moves the conditions, never the scores");

    const published = { ...earlier, regime: held.regime, scores: { ...earlier.scores, engineVersion: ENGINE } };
    assert.equal(findWeeklyComparisonReading([published], "2026-10-05", ENGINE, notRescored)?.regime, "VOLATILE", "as published");
    assert.equal(
      findWeeklyComparisonReading([{ ...published, scores: { ...published.scores, engineVersion: "engine-before" } }], "2026-10-05", ENGINE, rescore)?.regime,
      "EXPANSION",
      "as re-scored",
    );
  });

  it("stores the market series the scores read, and no other", () => {
    const quiet: TreasuryData = { ...lastWeek, oneMonthHistory: undefined };
    const baseline = evaluateRegime(quiet, DEFAULT_THRESHOLDS, [], null).scores;
    const moved = macroSeries.flatMap((series) =>
      [-1000, 1000].some((value) => {
        const extreme = { ...series, value, history: Array.from({ length: 10 }, () => ({ date: quiet.record_date, value })) };
        const { tightness, riskAppetite, offRecord } = evaluateRegime(quiet, DEFAULT_THRESHOLDS, [extreme], null).scores;
        /* Published or not counted: a record stores what a later engine needs for either. */
        const counted = offRecord ?? { tightness, riskAppetite };
        return (
          tightness !== baseline.tightness ||
          riskAppetite !== baseline.riskAppetite ||
          counted.tightness !== baseline.tightness ||
          counted.riskAppetite !== baseline.riskAppetite
        );
      })
        ? [series.id]
        : [],
    );

    assert.equal(macroSeries.length, 12, "every series the engine knows");
    assert.deepEqual([...moved].sort(), Object.keys(PublishedBriefSchema.shape.inputs.unwrap().shape.macro.shape).sort());
  });
});

describe("the week's dynamics against last week's brief", () => {
  const current = buildAssessmentFixture({
    regime: "SCARCITY",
    scores: { tightness: 90, riskAppetite: 48, baseRate: 4.05, curveSlope: 0.47 },
  });
  const w40: ComparisonReading = {
    recordDate: "2026-09-29",
    regime: "SCARCITY",
    scores: { tightness: 90, riskAppetite: 44, baseRate: null, curveSlope: null },
  };
  const comparedWith = buildComparedWith(w40.recordDate, "2026-10-05");
  const dynamics = buildReportDynamics({ current, previous: w40, comparedWith });

  it("moves each score from the record's, named by the record's date", () => {
    assert.deepEqual(dynamics.comparedWith, { recordDate: "2026-09-29", label: "Sep 29" });
    assert.equal(findSignalDelta(dynamics, "tightness"), 0);
    assert.equal(findSignalDelta(dynamics, "riskAppetite"), 4);
    assert.deepEqual(previousScoresFromDynamics(dynamics, { tightness: 90, riskAppetite: 48 }), {
      tightness: 90,
      riskAppetite: 44,
      comparedWith,
    });
    assert.equal(dynamics.directionLabel, "improving");
    assert.equal(dynamics.regimeChanged, false);
    assert.equal(buildRegimeAlert(current, w40, "2026-10-05", w40.recordDate), null, "no line where conditions change was crossed");
  });

  it("prints no move for a rate the record did not store, rather than an unchanged one", () => {
    assert.deepEqual(dynamics.notCompared, ["baseRate", "curveSlope"]);
    assert.equal(findSignalDelta(dynamics, "baseRate"), null);
    assert.equal(findSignalDelta(dynamics, "curveSlope"), null);

    const rows = buildSignalChangeRows({
      indicators: (["tightness", "riskAppetite", "baseRate", "curveSlope"] as const).map((key) => ({
        key,
        label: key,
        valueLabel: "",
        rawValue: key === "baseRate" ? 4.05 : key === "curveSlope" ? 0.47 : key === "tightness" ? 90 : 48,
        trendArrow: "→",
        trendDeltaLabel: "",
        sparkline: [],
        isFallback: false,
      })),
      lines: { tightness: { callChange: 70 }, riskAppetite: { callChange: 50 } },
      dynamics,
    });
    for (const key of ["baseRate", "curveSlope"] as const) {
      const row = rows.find((candidate) => candidate.key === key);
      assert.equal(row?.previous, null, `${key}: no earlier reading`);
      assert.equal(row?.delta, null, `${key}: no move`);
    }
    assert.equal(rows.find((row) => row.key === "riskAppetite")?.previous, 44);

    const evidence = buildReportEvidenceItems({ reportDynamics: dynamics, assessment: current, lastUpdated: "2026-10-05" });
    const baseRate = evidence.find((item) => item.key === "baseRate");
    assert.equal(baseRate?.directionLabel, "Not compared");
    assert.doesNotMatch(baseRate?.immediateImplication ?? "", /No material operating change/);
    assert.doesNotMatch(baseRate?.supportingBullets.join(" ") ?? "", /No measurable move/);
  });

  it("compares the rates the record stored", () => {
    const stored = buildReportDynamics({
      current,
      previous: { ...w40, scores: { ...w40.scores, baseRate: 3.95, curveSlope: 0.47 } },
      comparedWith,
    });

    assert.equal(stored.notCompared, undefined);
    assert.ok(Math.abs((findSignalDelta(stored, "baseRate") ?? Number.NaN) - 0.1) < 1e-9);
    assert.equal(findSignalDelta(stored, "curveSlope"), 0, "stored and unmoved is a zero move");
  });

  /* The engine scores a missing short-term rate as 0, not null. */
  it("compares no short-term rate this week did not read, rather than a fall to zero", () => {
    const missing = buildAssessmentFixture({
      regime: "SCARCITY",
      scores: { tightness: 90, riskAppetite: 48, baseRateUsed: "MISSING", baseRate: 0, curveSlope: 0.47 },
    });
    const dynamicsWithoutRate = buildReportDynamics({
      current: missing,
      previous: { ...w40, scores: { ...w40.scores, baseRate: 3.95, curveSlope: 0.47 } },
      comparedWith,
    });

    assert.deepEqual(dynamicsWithoutRate.notCompared, ["baseRate"]);
    assert.equal(findSignalDelta(dynamicsWithoutRate, "baseRate"), null);
    assert.equal(dynamicsWithoutRate.anomalySignals.length, 0, "a feed failure is not an anomalous move");
  });

  it("splits nothing and says nothing about interest rates alone: both readings were scored the same way", () => {
    const basis = comparisonBasis(dynamics.comparedWith);

    assert.equal(dynamics.movement, undefined);
    assert.equal(describeScoreMovementCaveat(dynamics.movement, basis), null);
    assert.equal(buildScoreMovementLine(previousScoresFromDynamics(dynamics, { tightness: 90, riskAppetite: 48 })), null);
    assert.equal(
      describeWeeklyMovement({ tightnessDelta: 0, riskAppetiteDelta: 4, comparisonUnavailable: false, basis }),
      "The scores moved toward easier money since Sep 29.",
    );
  });
});

/* The homepage loader is wrapped in Next's data cache, which needs a request to live in. */
const uncached: typeof unstable_cache = (load) => load;
const originalFetch = globalThis.fetch;
const noFetch: typeof fetch = async () => {
  throw new Error("the reading is the stored operating snapshot; nothing here reads the network");
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  resetOperatingSnapshotStore();
});

describe("the assembled homepage on Oct 5, 2026", () => {
  it("compares with the month-end, not with the Sep 29 brief an earlier engine scored", async () => {
    await resetOperatingSnapshotStore().write(
      buildOperatingSnapshot({
        treasury: {
          ...snapshotData,
          isLive: true,
          fallback_at: undefined,
          fallback_reason: undefined,
          record_date: "2026-10-05",
          fetched_at: "2026-10-05T12:00:00.000Z",
        },
        macroSeries,
        now: new Date("2026-10-05T12:00:00.000Z"),
      }),
    );
    globalThis.fetch = noFetch;

    const home = await assembleHomePage({}, { loadHomePageReportData: createHomePageReportDataLoader({ unstableCache: uncached }) });
    assert.ok(home.reportResult.ok, "the stored snapshot is a live reading");
    const reportData = home.reportResult.data;
    const dynamics = home.weeklyDecisionCardModel.decision.reportDynamics;
    assert.ok(findPublishedBrief("2026-w40")?.scores, "the archive holds the Sep 29 brief");

    /* w40 was frozen before records stored their engine, and the engine has
       changed since (ENGINE_VERSION), so its scores are not this reading's. */
    const monthEnd = reportData.monthEndComparison?.comparedWith;
    assert.ok(monthEnd, "the month-end before Oct 5");
    assert.notEqual(monthEnd.recordDate, "2026-09-29");
    assert.deepEqual(dynamics.comparedWith, monthEnd);

    const basis = comparisonBasis(dynamics.comparedWith);
    const rows = buildSignalChangeRows({
      indicators: home.weeklyDecisionCardModel.diagnostics.regimeSignalIndicators,
      dynamics,
      lines: { tightness: { callChange: 70 }, riskAppetite: { callChange: 50 } },
    });
    const movement = home.weeklyDecisionCardModel.decision.decisionMovement;
    const text = renderToStaticMarkup(
      <WhatChangedSection rows={rows} lead={movement?.sentence ?? ""} comparisonUnavailable={false} basis={basis} />,
    ).replace(/<[^>]+>/g, " ");

    assert.match(text, new RegExp(`${monthEnd.label} → this week`));
    assert.doesNotMatch(text, /Sep 29/);
  });

  /* Through the path both freeze writers take: the stored snapshot, the loader, the record builder, the file's form. */
  it("freezes inputs that a later engine scores back to the record's own numbers", async () => {
    await resetOperatingSnapshotStore().write(
      buildOperatingSnapshot({
        treasury: {
          ...snapshotData,
          isLive: true,
          fallback_at: undefined,
          fallback_reason: undefined,
          record_date: "2026-10-05",
          fetched_at: "2026-10-05T12:00:00.000Z",
          oneMonthHistory: [
            { date: "2026-07-06", value: 3.1 },
            { date: "2026-10-05", value: snapshotData.yields.oneMonth },
          ],
        },
        macroSeries,
        now: new Date("2026-10-05T12:00:00.000Z"),
      }),
    );
    globalThis.fetch = noFetch;

    const frozen = await assembleCurrentWeekBrief({ now: new Date("2026-10-05T18:00:00.000Z") });
    if (!frozen.ok) assert.fail(frozen.reason);
    const record = PublishedBriefSchema.parse(JSON.parse(JSON.stringify(frozen.record)));
    assert.ok(record.inputs?.baseRateWindow, "the week's inputs, the tightening-speed pair among them");
    assert.ok(record.inputs.vixCloses);

    const asStored = findWeeklyComparisonReading([record], "2026-10-12", ENGINE_VERSION, notRescored);
    const asRescored = findWeeklyComparisonReading([record], "2026-10-12", "engine-next", rescoreStoredInputs(evaluateRegime, DEFAULT_THRESHOLDS));
    assert.ok(asStored);
    assert.deepEqual(asRescored, asStored, "the same engine scores the stored inputs to the stored scores and conditions");
  });

  it("keeps a replayed month on the month-end before it", async () => {
    const replay = await loadReportData({ month: "3", year: "2020" });

    assert.equal(replay.treasury.record_date.slice(0, 7), "2020-03");
    assert.equal(replay.reportDynamics.comparedWith?.recordDate.slice(0, 7), "2020-02");
    assert.deepEqual(replay.monthEndComparison?.comparedWith, replay.reportDynamics.comparedWith);
  });
});

describe("the headline on a week that improved while a pause applies", () => {
  it("holds rather than tells the reader to resume paused work", () => {
    /* Against last week's brief, risk appetite rose 4 on Oct 5 while funding
       pressure sat 14 points past the pause line for four areas. */
    const paused = buildActionNowShort({ directionLabel: "improving", regimeChanged: false, regime: "SCARCITY", pauseApplies: true });
    assert.equal(paused, "Conditions are holding. Keep spend flat and require paybacks inside 6 months.");
    assert.doesNotMatch(paused, /Resume paused work/);
    assert.match(
      buildActionNowShort({ directionLabel: "improving", regimeChanged: false, regime: "SCARCITY", pauseApplies: false }),
      /^Conditions are easing\./,
    );
    assert.match(
      buildActionNowShort({ directionLabel: "deteriorating", regimeChanged: false, regime: "SCARCITY", pauseApplies: true }),
      /^Conditions are tightening\./,
    );
  });
});
