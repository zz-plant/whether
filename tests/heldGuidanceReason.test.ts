import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import { evaluateRegime, type PolicyRefusalCode, type RegimeAssessment } from "../lib/regimeEngine";
import { buildCadenceCallModel } from "../lib/report/cadenceCallModel";
import { buildHomeBriefModel } from "../lib/report/homeBriefModel";
import { describePolicyHold } from "../lib/report/regimeDescription";
import { POLICY_OVERRIDE_CALL, POLICY_OVERRIDE_CALL_UNNAMED } from "../lib/report/reportCopy";
import { buildDecisionReadinessState, buildTrustStatus } from "../lib/report/trustStatus";
import { buildWeeklyCallContract } from "../lib/report/weeklyCallContract";
import { loadWeeklyBriefSnapshot } from "../lib/report/weeklyBriefSnapshot";
import {
  findTimeMachineGovernedAssessment,
  getTimeMachineRegimeSeries,
  getTimeMachineSnapshots,
} from "../lib/timeMachine/timeMachineCache";
import { buildReplayContext, replayRegimeWalk } from "../lib/timeMachine/regimeReplay";
import type { MacroSeriesReading, TreasuryData } from "../lib/types";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";

serveUnreachableUpstreams();

/*
 * Two defects, one decision: a replayed month is judged on the inputs its
 * record carries, and a held week says what it is held for.
 *
 * The archive behind every replayed month holds yields and VIX, and no credit
 * spread, inflation or unemployment history. The policy layer counted those as
 * missing inputs, so every one of the 176 replayed months was refused and
 * printed the held guidance, while /history's strip printed the same months'
 * conditions unheld. And the held guidance was one set of sentences, the
 * disagreement's, so those months told the reader their two scores pointed in
 * different directions when what was missing was the record.
 */

const MACRO_POLICY_IDS = ["BBB_CREDIT_SPREAD", "CPI_YOY", "UNEMPLOYMENT_RATE"] as const;

const reading = (id: MacroSeriesReading["id"], value: number | null, recordDate: string): MacroSeriesReading => ({
  id,
  label: id,
  value,
  unit: "%",
  explanation: "fixture",
  sourceLabel: "fixture",
  sourceUrl: "https://example.com",
  formulaUrl: "/formulas",
  record_date: recordDate,
  fetched_at: `${recordDate}T00:00:00.000Z`,
  isLive: true,
  history: [],
});

const snapshotFor = (recordDate: string): TreasuryData => {
  const snapshot = getTimeMachineSnapshots().find((entry) => entry.record_date === recordDate);
  assert.ok(snapshot, `${recordDate} is on record`);
  return snapshot;
};

describe("a replayed month is judged on the inputs its record carries", () => {
  it("refuses no month of the governed walk for missing inputs, though the record carries none of the macro series", () => {
    const snapshots = getTimeMachineSnapshots();
    assert.ok(snapshots.length > 170);
    let held = 0;
    for (const snapshot of snapshots) {
      const assessment = findTimeMachineGovernedAssessment(snapshot.record_date);
      assert.ok(assessment, `${snapshot.record_date} is in the walk`);
      const { refusal } = assessment.policyAssessment;
      assert.ok(!refusal.reasonCodes?.includes("inputs-missing"), `${snapshot.record_date} was held for missing inputs`);
      if (refusal.refused) held += 1;
    }
    // Every month was held until 2026-10-07; what remains is held for a reason the record shows.
    assert.ok(held < snapshots.length / 2, `${held} of ${snapshots.length} replayed months are still held`);
  });

  it("still refuses a live read whose feeds for those inputs are absent or failed", () => {
    const treasury = { ...snapshotFor("2022-06-30"), isLive: true };
    const replayed = findTimeMachineGovernedAssessment(treasury.record_date);
    assert.equal(replayed?.policyAssessment.refusal.refused, false, "the replayed month is not held");

    const absent = evaluateRegime(treasury, undefined, []);
    assert.ok(absent.policyAssessment.refusal.reasonCodes?.includes("inputs-missing"), "no feed at all");
    assert.equal(absent.policyAssessment.posture, "TRANSITION", "and the missing inputs still pin the pace");

    const failed = evaluateRegime(
      treasury,
      undefined,
      MACRO_POLICY_IDS.map((id) => reading(id, null, treasury.record_date)),
    );
    assert.ok(failed.policyAssessment.refusal.reasonCodes?.includes("inputs-missing"), "feeds that answered with no value");
  });

  it("leaves the composites alone: an input not on record still scores 0, it just is not counted missing", () => {
    const treasury = snapshotFor("2022-06-30");
    const live = evaluateRegime(treasury, undefined, []);
    const replay = evaluateRegime(treasury, undefined, [], null, {
      inputsNotOnRecord: ["BBB_CREDIT_SPREAD", "CPI_YOY", "UNEMPLOYMENT_RATE"],
    });
    assert.deepEqual(replay.policyAssessment.composites, live.policyAssessment.composites);
    assert.deepEqual(replay.policyAssessment.normalizations, live.policyAssessment.normalizations);
    assert.ok(!replay.policyAssessment.refusal.reasonCodes?.includes("inputs-missing"));
    assert.ok(live.policyAssessment.refusal.reasonCodes?.includes("inputs-missing"));
    // The machine and its scores do not read the policy layer.
    assert.equal(replay.regime, live.regime);
    assert.deepEqual(replay.scores, live.scores);
  });

  it("decides what is not on record from what the step carries, not from a fixed list", () => {
    const treasury = snapshotFor("2022-06-30");
    const bare = buildReplayContext({ treasury, macroSeries: [], baseRateHistory: null });
    assert.deepEqual(bare.inputsNotOnRecord, [...MACRO_POLICY_IDS]);

    const withCredit = buildReplayContext({
      treasury,
      macroSeries: [reading("BBB_CREDIT_SPREAD", 1.6, treasury.record_date)],
      baseRateHistory: null,
    });
    assert.deepEqual(withCredit.inputsNotOnRecord, ["CPI_YOY", "UNEMPLOYMENT_RATE"], "a series on record is judged");

    const noYields = buildReplayContext({
      treasury: { ...treasury, yields: { oneMonth: null, threeMonth: null, twoYear: null, tenYear: null } },
      macroSeries: [],
      baseRateHistory: null,
    });
    assert.deepEqual(noYields.inputsNotOnRecord, ["BASE_RATE", "CURVE_SLOPE", ...MACRO_POLICY_IDS]);

    // The walk applies it: a bare step is not held for missing inputs.
    const [step] = replayRegimeWalk([{ treasury, macroSeries: [], baseRateHistory: null }]);
    assert.ok(!step?.assessment.policyAssessment.refusal.reasonCodes?.includes("inputs-missing"));
  });

  it("prints a replayed month's conditions guidance, as /history's strip does, where it used to print the hold", async () => {
    const { reportData, degraded, snapshot } = await loadWeeklyBriefSnapshot({ year: "2022", month: "6" });
    const { weeklyCall } = snapshot;
    assert.equal(degraded, false);
    assert.ok(reportData.historicalSelection, "a replayed month");
    const strip = getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER).find((entry) => entry.recordDate === "2022-06-30");
    assert.equal(reportData.assessment.regime, strip?.regime, "the page's conditions are the strip's");

    assert.equal(weeklyCall.policyOverrideActive, false);
    const holds = [...Object.values(POLICY_OVERRIDE_CALL), POLICY_OVERRIDE_CALL_UNNAMED];
    assert.ok(!holds.some((hold) => hold.currentCall === weeklyCall.currentCall), weeklyCall.currentCall);
    assert.doesNotMatch(weeklyCall.currentCall, /not changing|missing/);
  });
});

/* A refusal set on a real assessment, so every builder below runs on the
   engine's own shape. */
const baseAssessment = evaluateRegime(snapshotFor("2022-06-30"));
const heldFor = (reasonCodes: PolicyRefusalCode[], reasons = reasonCodes.map((code) => `stored reason: ${code}`)): RegimeAssessment => ({
  ...baseAssessment,
  policyAssessment: {
    ...baseAssessment.policyAssessment,
    refusal: { refused: true, reasons, reasonCodes, fallbackMessage: "PROCEED_WITH_CAUTION", executionMode: "REVERSIBLE_BETS_ONLY" },
  },
});

const homeBriefModelFor = (assessment: RegimeAssessment) =>
  buildHomeBriefModel({
    assessment,
    treasury: snapshotFor("2022-06-30"),
    sensors: [],
    macroSeries: [],
    reportDynamics: { directionLabel: "unavailable", changedSignals: [] },
    startItems: [],
    stopItems: [],
    regimeAlert: null,
  });

/** Every sentence a held week prints about the hold, across the surfaces that print one. */
const heldText = (assessment: RegimeAssessment): string[] => {
  const homeBriefModel = homeBriefModelFor(assessment);
  const contract = buildWeeklyCallContract({ assessment, homeBriefModel });
  const cadence = buildCadenceCallModel({
    horizon: "monthly",
    assessment,
    recordDate: "2022-06-30",
    regimeHistory: [],
  });
  const policyHold = describePolicyHold(assessment.policyAssessment.refusal);
  const trust = buildTrustStatus({
    historicalSelection: false,
    isFallback: false,
    historicalAction: "",
    fallbackAction: "",
    stableAction: "",
    policyHold,
  });
  const readiness = buildDecisionReadinessState({
    confidenceLabel: "HIGH",
    freshnessState: { updatedAtLabel: "now", freshnessStatus: "fresh", mode: "live", timestamp: null, ageHours: 0 },
    isFallbackSnapshot: false,
    policyHold,
  });
  return [
    contract.currentCall,
    contract.actionNow,
    contract.pauseIf,
    contract.callChangesIf,
    contract.whyCouldBeWrong,
    ...contract.flipConditionLabels,
    ...contract.doNowBullets,
    homeBriefModel.operatingStanceLine ?? "",
    homeBriefModel.actionNowShort ?? "",
    cadence.headline,
    cadence.boundedRule.action,
    cadence.boundedRule.threshold,
    cadence.boundedRule.reversal,
    trust.trustStatusLabel,
    trust.trustStatusDetail,
    trust.trustStatusAction,
    trust.decisionImpactWindow,
    readiness.detail,
  ];
};

const DISAGREEMENT = /two scores (point in different directions|disagree)|until the scores agree/;

describe("a held week states the reason it is held for", () => {
  for (const code of ["signals-disagree", "signals-dispersed", "inputs-missing"] as const) {
    it(`says ${code} on every surface, and nothing about disagreement unless that is the reason`, () => {
      const assessment = heldFor([code]);
      const text = heldText(assessment);
      const hold = POLICY_OVERRIDE_CALL[code];

      assert.ok(text.includes(hold.currentCall), "the lead sentence is this reason's");
      assert.ok(text.includes(hold.callChangesIf), "and so is what ends the hold");
      assert.ok(text.some((line) => line.includes(`until ${hold.holdsUntil}`)), "the hold lasts until this reason clears");
      if (code === "signals-disagree") {
        assert.ok(text.some((line) => DISAGREEMENT.test(line)));
      } else {
        for (const line of text) assert.doesNotMatch(line, DISAGREEMENT, `${code}: "${line}"`);
      }
    });
  }

  it("gives each reason its own sentences, with the pause line a condition every one shares", () => {
    const entries = Object.values(POLICY_OVERRIDE_CALL);
    for (const slot of ["currentCall", "actionNow", "callChangesIf", "holdsUntil", "whyCouldBeWrong"] as const) {
      assert.equal(new Set(entries.map((entry) => entry[slot])).size, entries.length, `${slot} is reason-specific`);
    }
    assert.equal(new Set(entries.map((entry) => entry.pauseIf)).size, 1);
    assert.match(POLICY_OVERRIDE_CALL["signals-dispersed"].currentCall, /spread too far apart/);
    assert.doesNotMatch(POLICY_OVERRIDE_CALL["signals-dispersed"].currentCall, /30 days|swung/, "the spread has no window");
    assert.match(POLICY_OVERRIDE_CALL["inputs-missing"].currentCall, /^Too many inputs are missing/);
  });

  it("leads with the first reason when several apply", () => {
    const text = heldText(heldFor(["signals-dispersed", "inputs-missing"]));
    assert.ok(text.includes(POLICY_OVERRIDE_CALL["signals-dispersed"].currentCall));
    assert.ok(!text.includes(POLICY_OVERRIDE_CALL["inputs-missing"].currentCall));
  });

  it("reads the reason from the engine's own refusal: a live read with no macro series is held for missing inputs", () => {
    const live = evaluateRegime({ ...snapshotFor("2022-06-30"), isLive: true }, undefined, []);
    assert.deepEqual(live.policyAssessment.refusal.reasonCodes, ["inputs-missing"]);
    const contract = buildWeeklyCallContract({ assessment: live, homeBriefModel: homeBriefModelFor(live) });
    assert.equal(contract.currentCall, POLICY_OVERRIDE_CALL["inputs-missing"].currentCall);
    assert.doesNotMatch(contract.whyCouldBeWrong, DISAGREEMENT);
  });

  it("reads a record stored before the codes were kept by its sentence, and names no reason it cannot read", () => {
    const [missingSentence] = evaluateRegime(snapshotFor("2022-06-30")).policyAssessment.refusal.reasons;
    assert.ok(missingSentence);
    assert.equal(
      describePolicyHold({ reasons: [missingSentence] }),
      POLICY_OVERRIDE_CALL["inputs-missing"],
      "the stored sentence maps back to its reason",
    );

    const unreadable = describePolicyHold({ reasons: ["Composite disagreement exceeded threshold."] });
    assert.equal(unreadable, POLICY_OVERRIDE_CALL_UNNAMED);
    for (const line of heldText(heldFor([], ["Composite disagreement exceeded threshold."]))) {
      assert.doesNotMatch(line, DISAGREEMENT, `a guessed reason: "${line}"`);
    }
  });
});
