import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import { readFailingRuns, recordRunOutcome } from "../lib/delivery/runOutcomes";
import { FakeKv } from "./fixtures/fakeKv";

const now = new Date("2026-11-25T02:00:00Z");

describe("run outcomes", () => {
  it("reports a run whose last outcome had a failed step, by step name only", async () => {
    const kv = new FakeKv();
    await recordRunOutcome("regime-history", [{ step: "regime-history", error: "GITHUB_TOKEN is not configured" }], { kv, now });
    assert.deepEqual(await readFailingRuns({ kv }), [
      { run: "regime-history", at: now.toISOString(), failedSteps: ["regime-history"] },
    ]);
    assert.doesNotMatch([...kv.entries.values()].join(""), /GITHUB_TOKEN/, "the error stays out of the public record");
  });

  it("forgets a failure once the same run ends clean", async () => {
    const kv = new FakeKv();
    await recordRunOutcome("daily", [{ step: "summary-history" }], { kv, now });
    await recordRunOutcome("daily", [], { kv, now });
    assert.deepEqual(await readFailingRuns({ kv }), []);
  });

  it("keeps each run's record apart, so a clean cron does not clear its Workflow's failure", async () => {
    const kv = new FakeKv();
    await recordRunOutcome("brief-freeze", [{ step: "brief-freeze" }], { kv, now });
    await recordRunOutcome("weekly", [], { kv, now });
    assert.deepEqual((await readFailingRuns({ kv })).map(({ run }) => run), ["brief-freeze"]);
  });

  it("lets KV drop a record after two weeks, so a lane switched off stops being reported", async () => {
    const options: unknown[] = [];
    await recordRunOutcome("daily", [], { kv: { put: async (_key, _value, option) => void options.push(option) }, now });
    assert.deepEqual(options, [{ expirationTtl: 14 * 24 * 60 * 60 }]);
  });

  it("does nothing without a binding, and never throws on a failed write", async () => {
    await recordRunOutcome("daily", [{ step: "x" }], { kv: null, now });
    assert.deepEqual(await readFailingRuns({ kv: null }), []);
    await recordRunOutcome("daily", [{ step: "x" }], {
      kv: {
        put: async () => {
          throw new Error("kv down");
        },
      },
      now,
    });
  });

  it("reads a record in another shape as no record", async () => {
    const kv = new FakeKv();
    kv.entries.set("ops:last-run:daily", JSON.stringify({ failed: true }));
    assert.deepEqual(await readFailingRuns({ kv }), []);
  });
});
