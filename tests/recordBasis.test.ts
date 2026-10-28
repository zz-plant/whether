import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "bun:test";
import rawPublishedBriefs from "../data/published_briefs.json";
import { DEFAULT_THRESHOLDS, ENGINE_VERSION, RECORD_BASIS_MARKET_INPUTS, evaluateRegime } from "../lib/regimeEngine";
import type { RegimeMachineSnapshot } from "../lib/regimeStateMachine";
import { buildCanonicalBoundedDecisionRules, isRuleConditionMet } from "../lib/report/boundedDecisionRules";
import { scoreStoredInputs } from "../lib/report/comparisonReading";
import { findPublishedBrief } from "../lib/report/publishedBriefs";
import { describePublishedWeekBasis, resolveScoringBasis, scoringBasisForEngine } from "../lib/report/scoringBasis";
import { confidenceCalibrationTotals } from "../lib/report/confidenceCalibration";
import { countRecord } from "../lib/report/trackRecord";
import { describeCalibrationRescore, describeTrackRecordRescore } from "../lib/report/trackRecordCopy";
import { buildRegimeTrackRecord } from "../lib/summary/regimeTrackRecord";
import { getTimeMachineRegimeSeries, getTimeMachineSnapshots } from "../lib/timeMachine/timeMachineCache";
import type { MacroSeriesId, MacroSeriesReading, TreasuryData } from "../lib/types";

/*
 * The record basis (2026-10-09). The month-end archive behind /history, the
 * track record and /calibration scores interest rates, the curve, the pace of
 * rate rises and stock-market volatility. The weekly call also counted the
 * venture funding pace and the tech-layoff trend (curated snapshots), the
 * high-yield spread and the Chicago Fed index, none of which the archive holds,
 * so four published weeks read Freezing whose month-end read Cloudy, and the
 * calibration study vouched for a different score from the one that set the
 * guidance. Only the inputs the archive scores move the published scores now;
 * the rest are scored into `offRecord`, shown, and move nothing.
 */

const macro = (id: MacroSeriesId, value: number, history: { date: string; value: number }[] = []): MacroSeriesReading => ({
  id,
  label: id,
  value,
  unit: "index",
  explanation: "",
  sourceLabel: "FRED",
  sourceUrl: "https://fred.stlouisfed.org/",
  formulaUrl: "/trust#formula-reference",
  record_date: "2026-10-07",
  fetched_at: "2026-10-08T02:00:00.000Z",
  isLive: true,
  history,
});

/* The Oct 7, 2026 reading: funding pressure 90, the curve alone puts risk appetite at 59. */
const OCT_7: TreasuryData = {
  source: "https://fred.stlouisfed.org/series/DGS1MO",
  record_date: "2026-10-07",
  fetched_at: "2026-10-08T02:00:00.000Z",
  isLive: true,
  yields: { oneMonth: 4.06, threeMonth: 4.21, twoYear: 4.79, tenYear: 5.27 },
};
const ON_RECORD_READS = [macro("VIX_INDEX", 15.01)];
/* The curated values that took risk appetite to 48, under its change line. */
const STARTUP_READS = [macro("VC_FUNDING_VELOCITY", -32.8), macro("TECH_LAYOFF_TREND", 66)];
const CREDIT_READS = [macro("HY_CREDIT_SPREAD", 3.03), macro("CHICAGO_FCI", -0.494)];

type Scores = { tightness: number; riskAppetite: number };

/** Each area's state against its published lines, as the rules table judges it. */
const areaStates = (scores: Scores, regime: Parameters<typeof buildCanonicalBoundedDecisionRules>[0]["regime"]) =>
  buildCanonicalBoundedDecisionRules({ regime, thresholds: DEFAULT_THRESHOLDS, scores }).map((rule) => ({
    area: rule.area,
    state: rule.pause.conditions.some((line) => isRuleConditionMet(line, scores[line.metric]))
      ? "pause"
      : rule.resume.conditions.every((line) => isRuleConditionMet(line, scores[line.metric]))
        ? "resume"
        : "hold",
  }));

const MACHINES: (RegimeMachineSnapshot | null)[] = [
  null,
  { committedState: "SCARCITY", pendingState: null, pendingCount: 0, lastSignals: { tightness: 90, riskAppetite: 48 } },
  { committedState: "DEFENSIVE", pendingState: null, pendingCount: 0, lastSignals: { tightness: 90, riskAppetite: 59 } },
];

describe("the record basis", () => {
  it("lets no input outside the record move the conditions, the scores or an area's state on its own", () => {
    for (const machine of MACHINES) {
      const onRecord = evaluateRegime(OCT_7, DEFAULT_THRESHOLDS, ON_RECORD_READS, machine);
      const withEverything = evaluateRegime(OCT_7, DEFAULT_THRESHOLDS, [...ON_RECORD_READS, ...STARTUP_READS, ...CREDIT_READS], machine);
      const label = machine?.committedState ?? "no machine";

      assert.equal(withEverything.regime, onRecord.regime, `${label}: the conditions`);
      assert.equal(withEverything.scores.tightness, onRecord.scores.tightness, `${label}: funding pressure`);
      assert.equal(withEverything.scores.riskAppetite, onRecord.scores.riskAppetite, `${label}: risk appetite`);
      assert.deepEqual(areaStates(withEverything.scores, withEverything.regime), areaStates(onRecord.scores, onRecord.regime), `${label}: every area`);
      assert.deepEqual(withEverything.regimeTransition?.snapshot, onRecord.regimeTransition?.snapshot, `${label}: the machine's state`);
    }
  });

  it("puts the Oct 7 reading at Cloudy, where the startup-market inputs put it at Freezing", () => {
    const assessment = evaluateRegime(OCT_7, DEFAULT_THRESHOLDS, [...ON_RECORD_READS, ...STARTUP_READS, ...CREDIT_READS]);

    assert.equal(assessment.scores.tightness, 90);
    assert.equal(assessment.scores.riskAppetite, 59);
    assert.equal(assessment.regime, "DEFENSIVE");
    assert.deepEqual(assessment.scores.offRecord, { tightness: 90, riskAppetite: 48, inputs: ["VC_FUNDING_VELOCITY", "TECH_LAYOFF_TREND"] });
  });

  it("still shows what the inputs left out say, as a warning when they would cross a line", () => {
    const assessment = evaluateRegime(OCT_7, DEFAULT_THRESHOLDS, [...ON_RECORD_READS, ...STARTUP_READS]);
    const basis = resolveScoringBasis({ engineVersion: ENGINE_VERSION, assessment });

    assert.equal(basis.key, "record");
    assert.equal(basis.sentence, "Scored on the record's inputs.");
    assert.deepEqual(basis.notCounted, [
      {
        metric: "riskAppetite",
        source: "startupMarket",
        label: "startup-market inputs",
        score: 48,
        published: 59,
        line: "its change line",
      },
    ]);
    assert.equal(basis.warning, "Startup-market inputs would put risk appetite at 48, below its change line.");
  });

  it("names an area's line when the inputs left out would cross no change line, and says nothing when they cross none", () => {
    /* A 0.6% curve: risk appetite 64 on the record; the curated reads take 11, to 53, under the resume line at 54. */
    const steeper = { ...OCT_7, yields: { ...OCT_7.yields, tenYear: 5.39 } };
    const resumeOnly = resolveScoringBasis({
      engineVersion: ENGINE_VERSION,
      assessment: evaluateRegime(steeper, DEFAULT_THRESHOLDS, STARTUP_READS),
    });
    assert.equal(resumeOnly.warning, "Startup-market inputs would put risk appetite at 53, below the resume line for Hiring, Roadmap, Fundraising and New bets.");

    /* A 1.2% curve: risk appetite 88; less 11 is 77, past no line the published score is not past. */
    const steep = { ...OCT_7, yields: { ...OCT_7.yields, tenYear: 5.99 } };
    const crossesNone = resolveScoringBasis({ engineVersion: ENGINE_VERSION, assessment: evaluateRegime(steep, DEFAULT_THRESHOLDS, STARTUP_READS) });
    assert.equal(crossesNone.warning, null);
    assert.equal(crossesNone.notCounted[0]?.line, null, "still listed, as what the score leaves out");
  });

  it("moves only what the archive scores: every record-basis input has a value at every cached month-end", () => {
    const cacheField: Partial<Record<MacroSeriesId, (entry: ReturnType<typeof getTimeMachineSnapshots>[number]) => unknown>> = {
      VIX_INDEX: (entry) => entry.vix,
      CHICAGO_FCI: (entry) => entry.chicagoFci,
    };
    const snapshots = getTimeMachineSnapshots();
    assert.ok(snapshots.length >= 176);
    for (const id of RECORD_BASIS_MARKET_INPUTS) {
      const read = cacheField[id];
      assert.ok(read, `${id} is on the record basis, so the cache must name where it stores it`);
      const missing = snapshots.filter((entry) => typeof read(entry) !== "number").map((entry) => entry.record_date);
      assert.deepEqual(missing, [], `${id} has a month-end value in every cached month`);
    }
  });

  it("names the engines whose published scores counted every input", () => {
    assert.notEqual(ENGINE_VERSION, "engine-2026-10-06");
    assert.equal(scoringBasisForEngine(ENGINE_VERSION), "record");
    assert.equal(scoringBasisForEngine("engine-2026-10-06"), "extended");
    assert.equal(scoringBasisForEngine(undefined), "extended", "a record frozen before engines were named");
    const extended = resolveScoringBasis({
      engineVersion: "engine-2026-10-06",
      assessment: evaluateRegime(OCT_7, DEFAULT_THRESHOLDS, [...ON_RECORD_READS, ...STARTUP_READS]),
    });
    assert.equal(extended.sentence, "Scored on more inputs than the record.");
    assert.equal(extended.warning, null, "its scores already counted them");
  });
});

describe("the published week the live reading differs from", () => {
  const w41 = findPublishedBrief("2026-w41");

  it("says why once the live conditions leave the week's, when the inputs the record cannot test are why", () => {
    assert.ok(w41?.inputs, "w41 stored its inputs");
    const rescored = scoreStoredInputs(evaluateRegime, DEFAULT_THRESHOLDS, w41.inputs, w41.recordDate);
    const published = { regime: w41.regime, weekLabel: "Oct 5, 2026", engineVersion: w41.scores?.engineVersion };

    assert.equal(
      describePublishedWeekBasis({ live: { regime: "DEFENSIVE" }, published, rescored }),
      "The brief published for the week of Oct 5, 2026 read Freezing only because it counted startup-market inputs, which can't be scored against past month-ends.",
    );
    assert.equal(describePublishedWeekBasis({ live: { regime: "SCARCITY" }, published, rescored }), null, "while the live call still agrees");
  });

  it("says nothing for a week scored on the record's inputs, or one whose inputs on the record would publish the same", () => {
    assert.ok(w41?.inputs);
    const rescored = scoreStoredInputs(evaluateRegime, DEFAULT_THRESHOLDS, w41.inputs, w41.recordDate);
    assert.equal(
      describePublishedWeekBasis({ live: { regime: "DEFENSIVE" }, published: { regime: "SCARCITY", weekLabel: "Oct 12", engineVersion: ENGINE_VERSION }, rescored }),
      null,
    );
    const quiet = scoreStoredInputs(evaluateRegime, DEFAULT_THRESHOLDS, { ...w41.inputs, macro: { VIX_INDEX: 15 } }, w41.recordDate);
    assert.equal(
      describePublishedWeekBasis({ live: { regime: "EXPANSION" }, published: { regime: "SCARCITY", weekLabel: "Oct 5", engineVersion: undefined }, rescored: quiet }),
      null,
    );
  });
});

/*
 * Frozen weeks are never edited: the gate takes effect from the next freeze, and
 * the archive is evidence the call was published as it was. Each week frozen
 * before the record basis is pinned byte for byte; a freeze appends, and the
 * pins still hold.
 */
const FROZEN_BEFORE_RECORD_BASIS: Record<string, string> = {
  "2026-w31": "5e5f50a3879746f0832d5b3d496f1b02",
  "2026-w38": "c4ee84c212c142f1a8d8b985598132e2",
  "2026-w39": "74aab56fa060dd46cf6da00af364dcab",
  "2026-w40": "6adfc965330e62c93ac6393de4bed532",
  "2026-w41": "dea00e653c02550ef297ab985e706b10",
};

describe("weeks published before the record basis", () => {
  it("are byte-identical to what was frozen", () => {
    const bySlug = new Map(rawPublishedBriefs.map((entry) => [entry.slug, entry]));
    for (const [slug, digest] of Object.entries(FROZEN_BEFORE_RECORD_BASIS)) {
      const entry = bySlug.get(slug);
      assert.ok(entry, `${slug} is still in the archive`);
      assert.equal(createHash("sha256").update(JSON.stringify(entry)).digest("hex").slice(0, 32), digest, `${slug} is unchanged`);
    }
  });
});

/*
 * The archive re-scored with the Chicago Fed index (engine-2026-10-09b). The index
 * read above zero only from March to May 2020, when funding pressure sat at 0, so
 * it added two points to March and April 2020 and moved no month's conditions.
 * The record's figures as published before the re-score are stated beside the
 * record, and the line says when they still hold.
 */
describe("the record re-scored on the record basis", () => {
  it("says the study's count before the re-score, and that it is unchanged", () => {
    const totals = confidenceCalibrationTotals();
    assert.deepEqual(totals, { months: 176, held: 169 });
    assert.equal(
      describeCalibrationRescore({ held: totals.held, comparisons: totals.months }),
      "We re-scored the record on Oct 9, 2026, after adding the Chicago Fed's financial conditions index, so the record uses the same inputs that now set the guidance. No month's conditions changed, so the count above matches the one published before.",
    );
    assert.match(describeCalibrationRescore({ held: 170, comparisons: 177 }), /Before it, 169 of 176 comparisons held \(96%\)\.$/, "a count that moved prints the old one");
  });

  it("says the changes and the advance signals before the re-score, and that they are unchanged", () => {
    const changes = countRecord(getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER))?.changes;
    const graded = buildRegimeTrackRecord(getTimeMachineRegimeSeries(60));
    assert.equal(changes, 7);
    assert.equal(graded.signaledCount, 2);
    assert.equal(graded.transitions.length, 5);
    assert.match(
      describeTrackRecordRescore({ changes: 7, signaled: graded.signaledCount, graded: graded.transitions.length }),
      /No month's conditions changed, so the counts above match the ones published before\.$/,
    );
    assert.match(
      describeTrackRecordRescore({ changes: 8, signaled: 2, graded: 6 }),
      /Before it, the record showed 7 changes in conditions, and 2 of the last 5 signaled in advance\.$/,
    );
  });

  it("puts the September 2026 month-end at Cloudy, where w41's own inputs on the record's basis put that week", () => {
    const september = getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER).find((entry) => entry.recordDate === "2026-09-30");
    assert.equal(september?.regime, "DEFENSIVE");
    const w41 = findPublishedBrief("2026-w41");
    assert.ok(w41?.inputs);
    assert.equal(scoreStoredInputs(evaluateRegime, DEFAULT_THRESHOLDS, w41.inputs, w41.recordDate).regime, "DEFENSIVE");
    assert.equal(w41.regime, "SCARCITY", "as published, on more inputs than the record");
  });
});

