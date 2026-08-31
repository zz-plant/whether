import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import { buildDecisionMemoryEntry } from "../lib/decisionMemory";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import { KvOperatingSnapshotStore } from "../lib/operatingState/snapshotStore";
import { macroSeries } from "../lib/macroSnapshot";
import { DEFAULT_THRESHOLDS } from "../lib/regimeEngine";
import { getRuntimeBoundary, resetRuntimeBoundary } from "../lib/runtime/boundary";
import type { KvNamespace } from "../lib/runtime/kv";
import { snapshotData } from "../lib/snapshot";
import { KvDecisionMemoryRepository } from "../lib/storage/decisionMemoryRepository";
import {
  buildPostureTransitionEvent,
  KvPostureTransitionEventRepository,
} from "../lib/storage/postureTransitionEventRepository";

class FakeKv implements KvNamespace {
  readonly data = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async put(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  async list(options?: { prefix?: string }): Promise<{ keys: Array<{ name: string }>; list_complete: boolean }> {
    const prefix = options?.prefix ?? "";
    return {
      keys: [...this.data.keys()].filter((key) => key.startsWith(prefix)).map((name) => ({ name })),
      list_complete: true,
    };
  }
}

const originalCronSecret = process.env.WHETHER_CRON_SECRET;
const originalSiteUrl = process.env.SITE_URL;

const restoreEnvironmentValue = (key: "WHETHER_CRON_SECRET" | "SITE_URL", value: string | undefined) => {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
};

describe("durable runtime validation", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "WHETHER_CRON_SECRET");
    Reflect.deleteProperty(globalThis, "SITE_URL");
    restoreEnvironmentValue("WHETHER_CRON_SECRET", originalCronSecret);
    restoreEnvironmentValue("SITE_URL", originalSiteUrl);
    resetRuntimeBoundary();
  });

  it("round-trips a valid operating snapshot", async () => {
    const kv = new FakeKv();
    const store = new KvOperatingSnapshotStore(kv);
    const snapshot = buildOperatingSnapshot({
      treasury: snapshotData,
      macroSeries,
      now: new Date("2026-08-14T00:00:00.000Z"),
    });

    await store.write(snapshot);

    assert.deepEqual(await store.readLatest(), snapshot);
  });

  it("rejects a syntactically valid but malformed operating snapshot", async () => {
    const kv = new FakeKv();
    kv.data.set("snapshot:latest", JSON.stringify({ id: "not-an-operating-snapshot" }));

    const snapshot = await new KvOperatingSnapshotStore(kv).readLatest();

    assert.equal(snapshot, null);
  });

  it("skips malformed decision-memory entries instead of trusting stored JSON", async () => {
    const kv = new FakeKv();
    kv.data.set("dm:client-a:1_broken", JSON.stringify({ id: "not-a-memory-entry" }));

    const result = await new KvDecisionMemoryRepository(kv).list({ clientId: "client-a" });

    assert.deepEqual(result.entries, []);
  });

  it("round-trips a valid decision-memory entry", async () => {
    const kv = new FakeKv();
    const repository = new KvDecisionMemoryRepository(kv);
    const entry = buildDecisionMemoryEntry({
      clientId: "client-a",
      recordDate: "2026-08-14",
      decision: { lifecycle: "GROWTH", category: "HIRING", action: "HIRE" },
      outcome: {
        verdict: "SAFE",
        summary: "Proceed with the bounded hire.",
        guardrail: "Pause above the funding-pressure line.",
        reversalTrigger: "Revisit after the pressure line clears.",
      },
      assessment: {
        regime: "DEFENSIVE",
        scores: { tightness: 60, riskAppetite: 55, baseRate: 4.8, curveSlope: 0.2, baseRateUsed: "1M" },
        thresholds: DEFAULT_THRESHOLDS,
        inputs: [],
      },
    });

    await repository.append(entry);

    const serializedEntry: unknown = JSON.parse(JSON.stringify(entry));
    assert.deepEqual((await repository.list({ clientId: "client-a" })).entries, [serializedEntry]);
  });

  it("skips malformed posture-transition events instead of trusting stored JSON", async () => {
    const kv = new FakeKv();
    kv.data.set("posture-event:entry:1_broken", JSON.stringify({ id: "not-a-transition-event" }));

    const result = await new KvPostureTransitionEventRepository(kv).list();

    assert.deepEqual(result.events, []);
  });

  it("round-trips a valid posture-transition event", async () => {
    const kv = new FakeKv();
    const repository = new KvPostureTransitionEventRepository(kv);
    const event = buildPostureTransitionEvent({
      effectiveRecordDate: "2026-08-14",
      fromState: "EXPANSION",
      toState: "DEFENSIVE",
      reason: "Funding pressure crossed the weekly line.",
    });

    await repository.append(event);

    const serializedEvent: unknown = JSON.parse(JSON.stringify(event));
    assert.deepEqual((await repository.list()).events, [serializedEvent]);
  });

  it("ignores non-string global config values", () => {
    process.env.WHETHER_CRON_SECRET = "env-cron-secret";
    process.env.SITE_URL = "https://env.whether.test";
    Reflect.set(globalThis, "WHETHER_CRON_SECRET", 42);
    Reflect.set(globalThis, "SITE_URL", false);
    resetRuntimeBoundary();

    const config = getRuntimeBoundary().config;

    assert.equal(config.cronSecret, "env-cron-secret");
    assert.equal(config.siteUrl, "https://env.whether.test");
  });
});
