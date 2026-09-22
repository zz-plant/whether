import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "bun:test";
import { buildWeeklyOperatorBriefPayload } from "../lib/export/weeklyOperatorBrief";
import { GET as getWeeklyRoute } from "../app/api/weekly/route";
import { checkRegimeChange } from "../lib/alert/checkRegimeChange";
import { macroSeries } from "../lib/macroSnapshot";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import { resetOperatingSnapshotStore } from "../lib/operatingState/snapshotStore";
import { loadReportData } from "../lib/report/reportData";
import { loadWeeklyBriefSnapshot } from "../lib/report/weeklyBriefSnapshot";
import { snapshotData } from "../lib/snapshot";
import type { KvNamespace } from "../lib/runtime/kv";

const originalFetch = globalThis.fetch;

class FakeKv implements KvNamespace {
  private readonly entries = new Map<string, string>();

  async get(key: string) {
    return this.entries.get(key) ?? null;
  }

  async put(key: string, value: string) {
    this.entries.set(key, value);
  }

  async delete(key: string) {
    this.entries.delete(key);
  }

  async list(_options?: { prefix?: string; cursor?: string; limit?: number }) {
    return { keys: [], list_complete: true };
  }
}

const buildPersistedSnapshot = () => {
  const snapshot = buildOperatingSnapshot({
    treasury: {
      ...snapshotData,
      record_date: "2099-12-31",
      fetched_at: "2099-12-31T12:00:00.000Z",
    },
    macroSeries,
    now: new Date("2099-12-31T13:00:00.000Z"),
  });

  snapshot.weeklyCall = {
    ...snapshot.weeklyCall,
    currentCall: "Project the persisted operating call.",
    actionNow: "Use one committed snapshot across every current surface.",
    pauseIf: "Pause if a reader cannot resolve the committed snapshot.",
    callChangesIf: "Recompute only for an explicit historical selection.",
  };
  snapshot.assessment = {
    ...snapshot.assessment,
    regime: "SCARCITY",
    description: "Persisted snapshot assessment.",
  };

  return snapshot;
};

describe("OperatingSnapshot read consistency", () => {
  beforeEach(() => {
    globalThis.fetch = async () => {
      throw new Error("Current snapshot projections must not fetch upstream data.");
    };
    resetOperatingSnapshotStore();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
    resetOperatingSnapshotStore();
  });

  it("projects the persisted assessment and weekly call into current brief and export reads", async () => {
    const persisted = buildPersistedSnapshot();
    await resetOperatingSnapshotStore().write(persisted);

    const reportData = await loadReportData({ consistencyCase: "persisted-current" });
    const brief = await loadWeeklyBriefSnapshot({ consistencyCase: "persisted-brief" });
    const exported = buildWeeklyOperatorBriefPayload({
      assessment: brief.reportData.assessment,
      treasury: brief.reportData.treasury,
      weeklyCall: brief.snapshot.weeklyCall,
    });

    assert.deepEqual(reportData.assessment, persisted.assessment);
    assert.deepEqual(reportData.treasury, persisted.treasury);
    assert.deepEqual(reportData.macroSeries, persisted.macroSeries);
    assert.deepEqual(brief.snapshot.weeklyCall, persisted.weeklyCall);
    assert.equal(exported.currentCall, persisted.weeklyCall.currentCall);
    assert.equal(exported.actionNow, persisted.weeklyCall.actionNow);
    assert.equal(exported.pauseIf, persisted.weeklyCall.pauseIf);
    assert.equal(exported.callChangesIf, persisted.weeklyCall.callChangesIf);
  });

  it("keeps explicit historical reads on the as-of reconstruction path", async () => {
    const persisted = buildPersistedSnapshot();
    await resetOperatingSnapshotStore().write(persisted);

    const historical = await loadReportData({ month: "3", year: "2020" });

    assert.ok(historical.historicalSelection);
    assert.notEqual(historical.treasury.record_date, persisted.recordDate);
    assert.notDeepEqual(historical.assessment, persisted.assessment);
  });

  it("projects the same persisted record into the weekly API and delivery read", async () => {
    const persisted = buildPersistedSnapshot();
    await resetOperatingSnapshotStore().write(persisted);
    const kv = new FakeKv();
    await kv.put("regime:last-known", persisted.assessment.regime);
    Object.assign(globalThis, { WHETHER_DURABLE_KV: kv });

    const response = await getWeeklyRoute();
    const body = await response.json();
    const deliveryRead = await checkRegimeChange();

    assert.equal(response.status, 200);
    assert.equal(body.summary.regime, persisted.assessment.regime);
    assert.equal(body.summary.inputs[0]?.recordDate, persisted.recordDate);
    assert.equal(deliveryRead.currentRegime, persisted.assessment.regime);
  });
});
