import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import { briefArtifactOf, briefSourceFromSnapshot, buildBriefDocument } from "../lib/report/briefDocument";
import { parseBriefArtifact } from "../lib/report/briefArtifact";
import { resolvePublishedConfidence, type ConfidenceInputs } from "../lib/report/confidence";
import { POLICY_OVERRIDE_CALL } from "../lib/report/reportCopy";
import { macroSeries } from "../lib/macroSnapshot";
import { snapshotData } from "../lib/snapshot";
import { macros, treasury as exportTreasury } from "./factories/exportFixtures";

const NOW = new Date("2026-08-31T12:00:00.000Z");

const ordinary = () =>
  buildOperatingSnapshot({
    treasury: { ...snapshotData, isLive: true, record_date: "2026-08-28", fetched_at: "2026-08-28T12:00:00.000Z" },
    macroSeries,
    now: NOW,
  });

const savedCopy = () =>
  buildOperatingSnapshot({
    treasury: { ...snapshotData, fallback_at: "2026-08-31T06:00:00.000Z", fallback_reason: "FRED unreachable." },
    macroSeries,
    now: NOW,
  });

describe("the brief document", () => {
  it("takes every call slot from the weekly call contract", () => {
    const snapshot = ordinary();
    const document = buildBriefDocument(briefSourceFromSnapshot(snapshot), snapshot.weeklyCall);

    assert.equal(document.slots.currentCall, snapshot.weeklyCall.currentCall);
    assert.equal(document.slots.actionNow, snapshot.weeklyCall.actionNow);
    assert.equal(document.slots.callChangesIf, snapshot.weeklyCall.callChangesIf);
    assert.deepEqual(document.slots.flipConditionLabels, snapshot.weeklyCall.flipConditionLabels);
    assert.equal(document.slots.resumeWhen, undefined, "no stage, no resume line");
    assert.equal(document.conditions.label, snapshot.weeklyCall.regimeStage);
    assert.match(document.conditions.line, new RegExp(`^${snapshot.weeklyCall.regimeStage} \\(`));
  });

  it("holds the pause line as its condition, whatever verb the rule carried", () => {
    const snapshot = ordinary();
    const document = buildBriefDocument(briefSourceFromSnapshot(snapshot), {
      ...snapshot.weeklyCall,
      pauseIf: "Pause net-new hiring if funding pressure rises above 76",
    });

    assert.equal(document.slots.pauseIf, "Funding pressure rises above 76");
    assert.equal(document.guardrail, "Funding pressure rises above 76", "the share formats print the same line");
  });

  it("keeps a held call held, with or without a stage", () => {
    const snapshot = buildOperatingSnapshot({ treasury: exportTreasury, macroSeries: macros, now: new Date("2026-03-05T12:00:00.000Z") });
    assert.equal(snapshot.weeklyCall.policyOverrideActive, true);

    for (const stage of [null, "seed"] as const) {
      const document = buildBriefDocument(briefSourceFromSnapshot(snapshot), snapshot.weeklyCall, { stage });
      assert.equal(document.slots.policyOverrideActive, true);
      assert.equal(document.slots.actionNow, POLICY_OVERRIDE_CALL.actionNow);
      assert.equal(document.slots.pauseIf, POLICY_OVERRIDE_CALL.pauseIf);
      assert.equal(document.slots.resumeWhen, undefined);
    }
  });

  it("lays a stage over an ordinary call and names it", () => {
    const snapshot = ordinary();
    const document = buildBriefDocument(briefSourceFromSnapshot(snapshot), snapshot.weeklyCall, { stage: "seed" });
    const seed = snapshot.weeklyCall.stageScopedAdjustments?.seed;

    assert.equal(document.stageLabel, "Seed");
    assert.equal(document.slots.actionNow, seed?.actionNow);
    assert.equal(document.slots.resumeWhen, seed?.resumeWhen);
    assert.equal(document.slots.callChangesIf, snapshot.weeklyCall.callChangesIf, "a stage never replaces the change line");
  });

  it("resolves the published confidence once, and says when the numbers are a saved copy", () => {
    const reading = ordinary();
    const live = buildBriefDocument(briefSourceFromSnapshot(reading), reading.weeklyCall);
    /* The band the page publishes, from the inputs confidence is resolved from, once for every format. */
    const inputs: ConfidenceInputs = reading.assessment;
    assert.equal(live.confidence, resolvePublishedConfidence({ assessment: inputs, record: reading.treasury }).label);
    assert.equal(live.provenance.isFallback, false);
    assert.equal(live.confidenceLabel, live.confidence);

    const saved = savedCopy();
    const document = buildBriefDocument(briefSourceFromSnapshot(saved), saved.weeklyCall);
    assert.equal(document.provenance.isFallback, true);
    assert.equal(document.isFallback, true);
    /* The snapshot names its own pipeline ("Canonical snapshot (FRED)"); the document names the publisher. */
    assert.equal(saved.provenance.sourceLabel, "Canonical snapshot (FRED)");
    assert.equal(document.provenance.sourceLabel, "Federal Reserve Economic Data (FRED)");
    assert.doesNotMatch(JSON.stringify(document), /Canonical/);
  });

  it("derives the area rows as the page does, each line with its distance", () => {
    const snapshot = ordinary();
    const document = buildBriefDocument(briefSourceFromSnapshot(snapshot), snapshot.weeklyCall);

    assert.equal(document.areaRows.length, 5);
    assert.ok(document.areaRows.every((row) => row.nearestPause || row.bindingResume), "every row knows how far its lines are");
  });

  it("publishes the artifact half to the island, and the island parses back to it", () => {
    const snapshot = ordinary();
    const document = buildBriefDocument(briefSourceFromSnapshot(snapshot), snapshot.weeklyCall);
    const island = briefArtifactOf(document);

    assert.ok(!("slots" in island) && !("areaRows" in island), "the island carries the artifact, not the document");
    assert.deepEqual(JSON.parse(JSON.stringify(parseBriefArtifact(JSON.stringify(island)))), JSON.parse(JSON.stringify(island)));
  });
});
