import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import type { unstable_cache } from "next/cache";
import { renderToStaticMarkup } from "react-dom/server";
import { WhatChangedSection } from "../app/components/home/WhatChangedSection";
import { buildScoreMovementLine, previousScoresFromDynamics } from "../lib/export/scoreReference";
import { macroSeries } from "../lib/macroSnapshot";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import { resetOperatingSnapshotStore } from "../lib/operatingState/snapshotStore";
import { ENGINE_VERSION } from "../lib/regimeEngine";
import { buildComparedWith, comparisonBasis } from "../lib/report/comparisonBasis";
import { findWeeklyComparisonReading, type ComparisonReading } from "../lib/report/comparisonReading";
import { findSignalDelta } from "../lib/report/evidenceReaderModel";
import {
  buildSignalChangeRows,
  describeWeeklyMovement,
} from "../lib/report/home/homeSectionModel";
import { createHomePageReportDataLoader } from "../lib/report/homePageData";
import { assembleHomePage } from "../lib/report/homePageAssembler";
import { findPublishedBrief, getPublishedBriefs, type PublishedBrief } from "../lib/report/publishedBriefs";
import { loadReportData } from "../lib/report/reportData";
import { buildActionNowShort, buildReportDynamics, buildReportEvidenceItems } from "../lib/report/reportEvidence";
import { buildRegimeAlert } from "../lib/report/reportFormatting";
import { describeScoreMovementCaveat } from "../lib/report/scoreMovement";
import { snapshotData } from "../lib/snapshot";
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

describe("the reading a week compares with", () => {
  it("is the most recent brief five to fourteen days before it", () => {
    const archive = [brief("2026-09-15"), brief("2026-09-22"), brief("2026-09-29")];

    assert.equal(findWeeklyComparisonReading(archive, "2026-10-05", ENGINE)?.recordDate, "2026-09-29");
    // A mid-week read compares with the previous week's brief, never this week's own.
    assert.equal(findWeeklyComparisonReading(archive, "2026-10-01", ENGINE)?.recordDate, "2026-09-22");
  });

  it("is never a record dated on or after the reading, or under five days before it", () => {
    const thisWeek = [brief("2026-09-29")];

    for (const reading of ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-03"]) {
      assert.equal(findWeeklyComparisonReading(thisWeek, reading, ENGINE), null, `a read of ${reading}`);
    }
    assert.equal(findWeeklyComparisonReading(thisWeek, "2026-10-04", ENGINE)?.recordDate, "2026-09-29", "five days is last week");
  });

  it("reaches back two weeks for a missed freeze, and no further, so the month-end takes over", () => {
    assert.equal(findWeeklyComparisonReading([brief("2026-09-21")], "2026-10-05", ENGINE)?.recordDate, "2026-09-21");
    assert.equal(findWeeklyComparisonReading([brief("2026-09-20")], "2026-10-05", ENGINE), null);
  });

  it("passes over a record that carries no scores", () => {
    const archive = [brief("2026-09-24"), { recordDate: "2026-09-29", regime: "SCARCITY" as const, scores: undefined }];

    assert.equal(findWeeklyComparisonReading(archive, "2026-10-05", ENGINE)?.recordDate, "2026-09-24");
  });

  it("carries the record's conditions and scores, and no rate the record did not store", () => {
    const w40Shape = { tightness: 90, riskAppetite: 44, tightnessDelta: 27, riskAppetiteDelta: -12 };
    assert.deepEqual(findWeeklyComparisonReading([brief("2026-09-29", w40Shape)], "2026-10-05", ENGINE), {
      recordDate: "2026-09-29",
      regime: "SCARCITY",
      scores: { tightness: 90, riskAppetite: 44, baseRate: null, curveSlope: null },
    });
    const stored = findWeeklyComparisonReading([brief("2026-09-29", { ...w40Shape, baseRate: 3.98, curveSlope: 0.41 })], "2026-10-05", ENGINE);
    assert.deepEqual(stored?.scores, { tightness: 90, riskAppetite: 44, baseRate: 3.98, curveSlope: 0.41 });
  });

  it("passes over a record scored by another engine, or by one it did not record", () => {
    const otherEngine = { recordDate: "2026-09-29", regime: "SCARCITY" as const, scores: { tightness: 80, riskAppetite: 40, engineVersion: "engine-before" } };
    const unrecorded = { recordDate: "2026-09-29", regime: "SCARCITY" as const, scores: { tightness: 80, riskAppetite: 40 } };

    assert.equal(findWeeklyComparisonReading([otherEngine], "2026-10-05", ENGINE), null, "the move would be the scoring change's");
    assert.equal(findWeeklyComparisonReading([unrecorded], "2026-10-05", ENGINE), null);
    assert.equal(findWeeklyComparisonReading([brief("2026-09-24"), otherEngine], "2026-10-05", ENGINE)?.recordDate, "2026-09-24");
  });

  it("finds no brief in the archive for the Oct 5 reading: w38–w40 did not record their engine", () => {
    const archive = getPublishedBriefs();
    const w40 = archive.find((record) => record.recordDate === "2026-09-29");

    assert.ok(w40?.scores, "the archive holds the Sep 29 brief");
    assert.equal(w40.scores.engineVersion, undefined);
    assert.equal(findWeeklyComparisonReading(archive, "2026-10-05", ENGINE_VERSION), null);
    assert.equal(findWeeklyComparisonReading(archive, "2020-03-31", ENGINE_VERSION), null);
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
