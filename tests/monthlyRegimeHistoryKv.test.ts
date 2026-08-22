import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "bun:test";
import {
  getBundledMonthlyRegimeHistory,
  getMonthlyRegimeHistory,
  mergeMonthlyRegimeHistory,
  MONTHLY_REGIME_HISTORY_KV_KEY,
  parseMonthlyRegimeHistory,
  primeMonthlyRegimeHistory,
  resetPrimedMonthlyRegimeHistory,
  type MonthlyRegimeHistoryEntry,
} from "../lib/summary/monthlyRegimeHistory";
import { refreshMonthlyRegimeHistory } from "../lib/summary/refreshMonthlyRegimeHistory";
import type { KvNamespace } from "../lib/runtime/kv";

class FakeKv implements KvNamespace {
  readonly entries = new Map<string, string>();
  failReads = false;

  async get(key: string) {
    if (this.failReads) throw new Error("kv unavailable");
    return this.entries.get(key) ?? null;
  }

  async put(key: string, value: string) {
    this.entries.set(key, value);
  }

  async list(options?: { prefix?: string }) {
    const prefix = options?.prefix ?? "";
    return {
      keys: [...this.entries.keys()].filter((n) => n.startsWith(prefix)).map((name) => ({ name })),
      list_complete: true,
    };
  }
}

const entry = (
  record_date: string,
  regime: MonthlyRegimeHistoryEntry["regime"],
  tightness = 50,
): MonthlyRegimeHistoryEntry => ({ record_date, regime, tightness, riskAppetite: 50 });

const liveReport = (record_date: string, regime: MonthlyRegimeHistoryEntry["regime"]) => async () => ({
  assessment: { regime, scores: { tightness: 61, riskAppetite: 42 } },
  treasury: { record_date, isLive: true },
});

let kv: FakeKv;

/** Read back through the module's own parser rather than asserting a shape onto JSON. */
const storedEntries = (): MonthlyRegimeHistoryEntry[] => {
  const raw = kv.entries.get(MONTHLY_REGIME_HISTORY_KV_KEY);
  assert.ok(raw, "the refresh wrote an entry");
  return parseMonthlyRegimeHistory(JSON.parse(raw));
};

beforeEach(() => {
  kv = new FakeKv();
  Object.assign(globalThis, { WHETHER_DURABLE_KV: kv });
  resetPrimedMonthlyRegimeHistory();
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
  resetPrimedMonthlyRegimeHistory();
});

describe("mergeMonthlyRegimeHistory", () => {
  it("keys on the month so a rewritten month replaces rather than doubles", () => {
    const merged = mergeMonthlyRegimeHistory(
      [entry("2026-07-31", "EXPANSION"), entry("2026-08-14", "VOLATILE")],
      [entry("2026-08-21", "DEFENSIVE")],
    );

    assert.equal(merged.length, 2);
    assert.deepEqual(
      merged.map((item) => item.record_date),
      ["2026-07-31", "2026-08-21"],
    );
    assert.equal(merged[1].regime, "DEFENSIVE");
  });

  it("returns entries oldest first regardless of input order", () => {
    const merged = mergeMonthlyRegimeHistory([entry("2026-09-30", "SCARCITY")], [entry("2026-01-30", "EXPANSION")]);

    assert.deepEqual(
      merged.map((item) => item.record_date),
      ["2026-01-30", "2026-09-30"],
    );
  });
});

describe("monthly regime history read path", () => {
  // The bundled snapshot is the floor. Every failure mode below has to leave it standing,
  // because the alternative is a home brief whose forecast history silently empties out.
  it("serves the bundled snapshot before anything primes it", () => {
    assert.deepEqual(getMonthlyRegimeHistory(), getBundledMonthlyRegimeHistory());
  });

  it("stays synchronous, because the brief builder reads it inside a sync chain", () => {
    const history = getMonthlyRegimeHistory();

    assert.ok(Array.isArray(history), "returns an array, not a promise");
    assert.ok(!(history instanceof Promise));
  });

  it("merges the cron's months over the bundled floor once primed", async () => {
    const future = entry("2099-01-29", "SCARCITY");
    await kv.put(MONTHLY_REGIME_HISTORY_KV_KEY, JSON.stringify([future]));

    assert.equal(await primeMonthlyRegimeHistory(), "kv");

    const history = getMonthlyRegimeHistory();
    assert.equal(history.length, getBundledMonthlyRegimeHistory().length + 1);
    assert.deepEqual(history.at(-1), future);
    for (const bundled of getBundledMonthlyRegimeHistory()) {
      assert.ok(
        history.some((item) => item.record_date === bundled.record_date),
        `kept bundled entry ${bundled.record_date}`,
      );
    }
  });

  it("keeps the floor when KV is empty, unparseable, or unreachable", async () => {
    assert.equal(await primeMonthlyRegimeHistory(), "bundled");

    await kv.put(MONTHLY_REGIME_HISTORY_KV_KEY, "not json");
    assert.equal(await primeMonthlyRegimeHistory(), "bundled");

    await kv.put(MONTHLY_REGIME_HISTORY_KV_KEY, JSON.stringify([{ record_date: 5 }]));
    assert.equal(await primeMonthlyRegimeHistory(), "bundled");

    kv.failReads = true;
    assert.equal(await primeMonthlyRegimeHistory(), "bundled");

    assert.deepEqual(getMonthlyRegimeHistory(), getBundledMonthlyRegimeHistory());
  });

  it("keeps the floor when there is no KV binding at all", async () => {
    Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");

    assert.equal(await primeMonthlyRegimeHistory(), "bundled");
    assert.deepEqual(getMonthlyRegimeHistory(), getBundledMonthlyRegimeHistory());
  });
});

describe("refreshMonthlyRegimeHistory", () => {
  it("records the month in progress", async () => {
    const result = await refreshMonthlyRegimeHistory({ loadReport: liveReport("2099-02-26", "VOLATILE") });

    assert.deepEqual(result, { ok: true, wrote: true, month: "2099-02" });
    const stored = storedEntries();
    assert.deepEqual(stored, [
      { record_date: "2099-02-26", regime: "VOLATILE", tightness: 61, riskAppetite: 42 },
    ]);
  });

  it("rewrites the same month instead of appending a second entry for it", async () => {
    await refreshMonthlyRegimeHistory({ loadReport: liveReport("2099-02-05", "EXPANSION") });
    await refreshMonthlyRegimeHistory({ loadReport: liveReport("2099-02-26", "VOLATILE") });

    const stored = storedEntries();
    assert.equal(stored.length, 1);
    assert.equal(stored[0].record_date, "2099-02-26");
    assert.equal(stored[0].regime, "VOLATILE");
  });

  // A regime derived from a stale fallback is not a month's history. The freeze script
  // refuses the same way, and this is the permanent series, so it refuses too.
  it("refuses to record a degraded read, and does not call it a failure", async () => {
    const result = await refreshMonthlyRegimeHistory({
      loadReport: async () => ({
        assessment: { regime: "DEFENSIVE" as const, scores: { tightness: 70, riskAppetite: 30 } },
        treasury: { record_date: "2099-03-31", isLive: false },
      }),
    });

    assert.equal(result.ok, true);
    assert.equal(result.wrote, false);
    assert.equal(result.error, "degraded read");
    assert.equal(kv.entries.has(MONTHLY_REGIME_HISTORY_KV_KEY), false);
  });

  it("reports a failure when there is no record date to file the month under", async () => {
    const result = await refreshMonthlyRegimeHistory({
      loadReport: async () => ({
        assessment: { regime: "EXPANSION" as const, scores: { tightness: 40, riskAppetite: 60 } },
        treasury: { isLive: true },
      }),
    });

    assert.equal(result.ok, false);
    assert.equal(result.wrote, false);
  });
});
