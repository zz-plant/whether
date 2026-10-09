import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "bun:test";
import rawPublishedBriefs from "../data/published_briefs.json";
import { DEFAULT_THRESHOLDS, ENGINE_VERSION, RECORD_BASIS_MARKET_INPUTS, evaluateRegime } from "../lib/regimeEngine";
import type { RegimeMachineSnapshot } from "../lib/regimeStateMachine";
import { buildCanonicalBoundedDecisionRules, isRuleConditionMet } from "../lib/report/boundedDecisionRules";
import { getTimeMachineSnapshots } from "../lib/timeMachine/timeMachineCache";
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

  it("moves only what the archive scores: every record-basis input has a value at every cached month-end", () => {
    const cacheField: Partial<Record<MacroSeriesId, (entry: ReturnType<typeof getTimeMachineSnapshots>[number]) => unknown>> = {
      VIX_INDEX: (entry) => entry.vix,
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

  it("is a new calibration, under a new engine version", () => {
    assert.notEqual(ENGINE_VERSION, "engine-2026-10-06");
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
