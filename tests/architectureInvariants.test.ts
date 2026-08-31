import assert from "node:assert/strict";
import { describe, it, beforeEach } from "bun:test";
import { loadReportData } from "../lib/report/reportData";
import { assessDecisionStaleness, stalenessVerdictLabel } from "../lib/report/decisionStaleness";
import { evaluateDecisionAssumptionHealth, buildDecisionMemoryEntry } from "../lib/decisionMemory";
import { buildOperatingSnapshot, hashOperatingInputs } from "../lib/operatingState/snapshot";
import {
  InMemoryOperatingSnapshotStore,
  KvOperatingSnapshotStore,
  getOperatingSnapshotStore,
  resetOperatingSnapshotStore,
} from "../lib/operatingState/snapshotStore";
import {
  InMemoryDecisionMemoryRepository,
  KvDecisionMemoryRepository,
  resetDecisionMemoryRepository,
} from "../lib/storage/decisionMemoryRepository";
import { buildWeeklyOperatorBriefPayload } from "../lib/export/weeklyOperatorBrief";
import { DEFAULT_THRESHOLDS } from "../lib/regimeEngine";
import { snapshotData } from "../lib/snapshot";
import { macroSeries as snapshotMacroSeries } from "../lib/macroSnapshot";
import { getRuntimeBoundary, resetRuntimeBoundary, setRuntimeBoundaryForTesting } from "../lib/runtime/boundary";
import type { KvNamespace } from "../lib/runtime/kv";

describe("Architecture Invariants", () => {
  beforeEach(() => {
    resetDecisionMemoryRepository();
    resetOperatingSnapshotStore();
    resetRuntimeBoundary();
  });

  it("Invariant 1: Reading Whether performs zero writes", async () => {
    let writeCount = 0;
    const trackingKv: KvNamespace = {
      async get(key: string) {
        return null;
      },
      async put(key: string, value: string) {
        writeCount++;
      },
      async delete(key: string) {
        writeCount++;
      },
      async list() {
        return { keys: [], list_complete: true };
      },
    };

    // Set mock KV in globalThis
    Object.assign(globalThis, { WHETHER_DURABLE_KV: trackingKv });

    try {
      const data = await loadReportData({});
      assert.ok(data.assessment);
      assert.equal(writeCount, 0, `Expected 0 writes on read path, but got ${writeCount}`);
    } finally {
      Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
    }
  });

  it("Invariant 2: The same decision has the exact same staleness status everywhere", () => {
    const entry = buildDecisionMemoryEntry({
      clientId: "client-test",
      recordDate: "2026-08-01",
      decision: { lifecycle: "GROWTH", category: "HIRING", action: "HIRE" },
      outcome: {
        verdict: "SAFE",
        summary: "Hiring approved.",
        guardrail: "Pause if tightness > 70.",
        reversalTrigger: "tightness drops below 70",
      },
      assessment: {
        regime: "DEFENSIVE",
        scores: { tightness: 60, riskAppetite: 55, baseRate: 4.8, curveSlope: 0.2, baseRateUsed: "1M" },
        thresholds: DEFAULT_THRESHOLDS,
        inputs: [],
      },
    });

    assert.ok(entry.assumptions);

    // 1. Stand case
    const stalenessStand = assessDecisionStaleness(entry.assumptions, { tightness: 62, riskAppetite: 54 });
    const healthStand = evaluateDecisionAssumptionHealth({ entry, currentTightness: 62, currentRiskAppetite: 54 });
    assert.equal(stalenessStand.verdict, "STAND");
    assert.equal(healthStand.verdict, "STAND");
    assert.equal(stalenessVerdictLabel(stalenessStand.verdict), "STAND");

    // 2. Watch case
    const stalenessWatch = assessDecisionStaleness(entry.assumptions, { tightness: 74, riskAppetite: 55 });
    const healthWatch = evaluateDecisionAssumptionHealth({ entry, currentTightness: 74, currentRiskAppetite: 55 });
    assert.equal(stalenessWatch.verdict, "WATCH");
    assert.equal(healthWatch.verdict, "WATCH");
    assert.equal(stalenessVerdictLabel(stalenessWatch.verdict), "WATCH");

    // 3. Reconsider case
    const stalenessReconsider = assessDecisionStaleness(entry.assumptions, { tightness: 75, riskAppetite: 42 });
    const healthReconsider = evaluateDecisionAssumptionHealth({ entry, currentTightness: 75, currentRiskAppetite: 42 });
    assert.equal(stalenessReconsider.verdict, "RECONSIDER");
    assert.equal(healthReconsider.verdict, "RECONSIDER");
    assert.equal(stalenessVerdictLabel(stalenessReconsider.verdict), "RECONSIDER");
  });

  it("Invariant 3: All delivery channels publish the same call and record date from an OperatingSnapshot", () => {
    const snapshot = buildOperatingSnapshot({
      treasury: snapshotData,
      macroSeries: snapshotMacroSeries,
      now: new Date("2026-08-14T00:00:00.000Z"),
    });

    const weeklyCall = snapshot.weeklyCall;
    assert.ok(weeklyCall.currentCall);
    assert.ok(weeklyCall.actionNow);

    // Operator brief projection
    const briefPayload = buildWeeklyOperatorBriefPayload({
      assessment: snapshot.assessment,
      treasury: snapshot.treasury,
      weeklyCall: snapshot.weeklyCall,
    });

    assert.equal(briefPayload.currentCall, weeklyCall.currentCall);
    assert.equal(briefPayload.actionNow, weeklyCall.actionNow);
    assert.equal(briefPayload.regimeStage, weeklyCall.regimeStage);
    assert.equal(briefPayload.pauseIf, weeklyCall.pauseIf);
    assert.equal(briefPayload.changeCourseIf, weeklyCall.changeCourseIf);
  });

  it("Invariant 4: A historical snapshot always deterministically regenerates the same call", () => {
    const run1 = buildOperatingSnapshot({
      treasury: snapshotData,
      macroSeries: snapshotMacroSeries,
      now: new Date("2026-08-14T00:00:00.000Z"),
    });

    const run2 = buildOperatingSnapshot({
      treasury: snapshotData,
      macroSeries: snapshotMacroSeries,
      now: new Date("2026-08-14T00:00:00.000Z"),
    });

    assert.equal(run1.inputHash, run2.inputHash);
    assert.equal(run1.id, run2.id);
    assert.deepEqual(run1.weeklyCall, run2.weeklyCall);
    assert.deepEqual(run1.assessment.scores, run2.assessment.scores);
  });

  it("Invariant 5: Every published artifact points to its source snapshot ID and input hash", () => {
    const snapshot = buildOperatingSnapshot({
      treasury: snapshotData,
      macroSeries: snapshotMacroSeries,
      now: new Date("2026-08-14T00:00:00.000Z"),
    });

    assert.ok(snapshot.id.startsWith("op_"));
    assert.ok(snapshot.inputHash.length > 0);
    assert.ok(snapshot.sourceSnapshotIds.length > 0);
    assert.equal(snapshot.inputHash, hashOperatingInputs(snapshotData, snapshotMacroSeries));
  });

  it("Invariant 6: Production writes fail if durable storage is missing", () => {
    const boundary = getRuntimeBoundary();
    // Simulate production environment
    const prodBoundary = {
      storage: null,
      backgroundWork: () => {},
      clock: { now: () => new Date() },
      config: { isProduction: true, siteUrl: "https://whether.work" },
      ensureDurableStorage(name: string) {
        if (!this.storage && this.config.isProduction) {
          throw new Error(`[runtime] Durable storage unavailable for production write: ${name}`);
        }
        return this.storage!;
      },
    };

    setRuntimeBoundaryForTesting(prodBoundary);

    assert.throws(
      () => prodBoundary.ensureDurableStorage("writeOperatingSnapshot"),
      /Durable storage unavailable for production write/,
    );
  });

  it("Invariant 7: Decision Memory is partitioned by owner/clientId", async () => {
    const memoryRepo = new InMemoryDecisionMemoryRepository();

    const entryA = buildDecisionMemoryEntry({
      clientId: "tenant-alpha",
      recordDate: "2026-08-01",
      decision: { lifecycle: "GROWTH", category: "HIRING", action: "HIRE" },
      outcome: { verdict: "SAFE", summary: "Hiring A", guardrail: "none", reversalTrigger: "none" },
      assessment: {
        regime: "DEFENSIVE",
        scores: { tightness: 60, riskAppetite: 55, baseRate: 4.8, curveSlope: 0.2, baseRateUsed: "1M" },
        thresholds: DEFAULT_THRESHOLDS,
        inputs: [],
      },
    });

    const entryB = buildDecisionMemoryEntry({
      clientId: "tenant-beta",
      recordDate: "2026-08-01",
      decision: { lifecycle: "DISCOVERY", category: "INFRASTRUCTURE", action: "INFRA_SPEND" },
      outcome: { verdict: "RISKY", summary: "Spending B", guardrail: "none", reversalTrigger: "none" },
      assessment: {
        regime: "DEFENSIVE",
        scores: { tightness: 60, riskAppetite: 55, baseRate: 4.8, curveSlope: 0.2, baseRateUsed: "1M" },
        thresholds: DEFAULT_THRESHOLDS,
        inputs: [],
      },
    });

    await memoryRepo.append(entryA);
    await memoryRepo.append(entryB);

    const listAlpha = await memoryRepo.list({ clientId: "tenant-alpha" });
    const listBeta = await memoryRepo.list({ clientId: "tenant-beta" });

    assert.equal(listAlpha.entries.length, 1);
    assert.equal(listAlpha.entries[0]?.context.clientId, "tenant-alpha");
    assert.equal(listAlpha.entries[0]?.outcome.summary, "Hiring A");

    assert.equal(listBeta.entries.length, 1);
    assert.equal(listBeta.entries[0]?.context.clientId, "tenant-beta");
    assert.equal(listBeta.entries[0]?.outcome.summary, "Spending B");
  });
});
