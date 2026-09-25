import assert from "node:assert/strict";
import { beforeEach, describe, it } from "bun:test";

import {
  ACTIVATION_FUNNEL_KV_KEY,
  parseStoredActivationFunnel,
  readStoredActivationFunnel,
  recordActivationFunnel,
} from "../lib/telemetry/recordActivationFunnel";
import type { ActivationFunnelReport } from "../lib/telemetry/activationFunnelReport";

/*
 * The reader in `tests/activationFunnelReport.test.ts` can see the funnel; this is the half
 * that remembers it, and the property that matters is a negative one — a run that could not
 * read must leave the previous week standing. A stored zero reads as "nobody came back",
 * which is the exact sentence this whole path must never be the reason for believing.
 */

type FakeKv = {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string) => Promise<void>;
  /** `isKvNamespace` in lib/runtime/kv.ts requires get, put and list, so the double has all three. */
  list: (options?: { prefix?: string }) => Promise<{ keys: Array<{ name: string }>; list_complete: boolean }>;
  puts: string[];
};

const installKv = (initial: Record<string, string> = {}): FakeKv => {
  const store = new Map(Object.entries(initial));
  const kv: FakeKv = {
    puts: [],
    get: async (key) => store.get(key) ?? null,
    put: async (key, value) => {
      kv.puts.push(key);
      store.set(key, value);
    },
    list: async (options) => ({
      keys: [...store.keys()].filter((key) => !options?.prefix || key.startsWith(options.prefix)).map((name) => ({ name })),
      list_complete: true,
    }),
  };
  Object.assign(globalThis, { WHETHER_DURABLE_KV: kv });
  return kv;
};

const clearKv = () => {
  Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
};

const ok = (returned: number, visited = returned * 10): ActivationFunnelReport => ({
  status: "ok",
  generatedAt: "2026-09-25T09:00:00.000Z",
  weeks: [
    { week: "2026-w38", counts: { visited, oriented: 4, committed: 2, returned: 1 }, commitments: { copied_slack: 2 } },
    { week: "2026-w39", counts: { visited, oriented: 5, committed: 3, returned }, commitments: { copied_slack: 2, subscribed: 1 } },
  ],
});

describe("activation funnel record", () => {
  beforeEach(() => {
    clearKv();
  });

  it("writes the week's counts to KV", async () => {
    const kv = installKv();

    const result = await recordActivationFunnel({ read: async () => ok(5) });

    assert.equal(result.ok, true);
    assert.equal(result.wrote, true);
    assert.deepEqual(kv.puts, [ACTIVATION_FUNNEL_KV_KEY]);

    const stored = await readStoredActivationFunnel();
    assert.equal(stored?.weeks.at(-1)?.week, "2026-w39");
    assert.equal(stored?.weeks.at(-1)?.counts.returned, 5);
    assert.deepEqual(stored?.weeks.at(-1)?.commitments, { copied_slack: 2, subscribed: 1 });
  });

  it("leaves the previous week standing when the read is unconfigured", async () => {
    const kv = installKv();
    await recordActivationFunnel({ read: async () => ok(5) });
    const afterFirst = await readStoredActivationFunnel();

    const result = await recordActivationFunnel({ read: async () => ({ status: "unconfigured" }) });

    assert.equal(result.wrote, false);
    assert.match(result.error ?? "", /credentials/);
    assert.equal(kv.puts.length, 1, "an unread run writes nothing at all");

    const afterFailure = await readStoredActivationFunnel();
    assert.deepEqual(afterFailure, afterFirst, "last week's counts survive a run that could not read");
    assert.equal(afterFailure?.weeks.at(-1)?.counts.returned, 5);
  });

  it("leaves the previous week standing when the read failed", async () => {
    installKv();
    await recordActivationFunnel({ read: async () => ok(5) });

    const result = await recordActivationFunnel({ read: async () => ({ status: "unavailable", reason: "HTTP 403" }) });

    assert.equal(result.wrote, false);
    assert.match(result.error ?? "", /403/);
    assert.equal((await readStoredActivationFunnel())?.weeks.at(-1)?.counts.returned, 5);
  });

  it("replaces a week rather than appending a second copy of it", async () => {
    installKv();
    await recordActivationFunnel({ read: async () => ok(5) });
    // Same ISO week, later run: the week is still filling in.
    await recordActivationFunnel({ read: async () => ok(9) });

    const stored = await readStoredActivationFunnel();
    assert.equal(stored?.weeks.length, 2);
    assert.equal(stored?.weeks.at(-1)?.counts.returned, 9);
    assert.equal(stored?.weeks.filter((week) => week.week === "2026-w39").length, 1);
  });

  it("keeps weeks in order and stops growing", async () => {
    const kv = installKv();
    for (let week = 1; week <= 20; week += 1) {
      const slug = `2026-w${String(week).padStart(2, "0")}`;
      await recordActivationFunnel({
        read: async () => ({
          status: "ok",
          generatedAt: "2026-09-25T09:00:00.000Z",
          weeks: [{ week: slug, counts: { visited: 1, oriented: 1, committed: 1, returned: 1 }, commitments: {} }],
        }),
      });
    }

    const stored = parseStoredActivationFunnel(await kv.get(ACTIVATION_FUNNEL_KV_KEY));
    assert.ok(stored);
    assert.equal(stored.weeks.length, 12);
    assert.equal(stored.weeks[0]?.week, "2026-w09");
    assert.equal(stored.weeks.at(-1)?.week, "2026-w20");
    assert.deepEqual(
      stored.weeks.map((week) => week.week),
      [...stored.weeks].map((week) => week.week).sort(),
      "weeks read oldest first",
    );
  });

  it("refuses to render a stored value that is not shaped like one", () => {
    assert.equal(parseStoredActivationFunnel(null), null);
    assert.equal(parseStoredActivationFunnel("not json"), null);
    assert.equal(parseStoredActivationFunnel(JSON.stringify({ generatedAt: "x", weeks: [] })), null);
    assert.equal(parseStoredActivationFunnel(JSON.stringify({ weeks: [{ week: "2026-w39" }] })), null);
    assert.equal(
      parseStoredActivationFunnel(
        JSON.stringify({ generatedAt: "x", weeks: [{ week: "2026-w39", counts: { visited: 1 }, commitments: {} }] }),
      ),
      null,
      "a week missing a step count is not a week",
    );
  });

  it("reports no KV rather than throwing", async () => {
    clearKv();
    const result = await recordActivationFunnel({ read: async () => ok(5) });

    assert.equal(result.ok, false);
    assert.equal(result.wrote, false);
    assert.match(result.error ?? "", /no KV binding/);
  });
});
