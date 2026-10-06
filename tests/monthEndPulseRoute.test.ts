import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import { POST as postMonthEndPulse } from "../app/api/month-end-pulse/route";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import { getOperatingSnapshotStore, resetOperatingSnapshotStore } from "../lib/operatingState/snapshotStore";

const cronRequest = () =>
  new Request("https://whether.test/api/month-end-pulse", {
    method: "POST",
    headers: { authorization: "Bearer test-cron-secret" },
  });

afterEach(() => {
  Reflect.deleteProperty(globalThis, "WHETHER_CRON_SECRET");
  resetOperatingSnapshotStore();
});

describe("POST /api/month-end-pulse", () => {
  /* The route compared the pulse's error to "KV not available" while the pulse said
     "KV not available; month-end state cannot be recorded.", so a missing binding
     answered 500 like a fault in the run. */
  it("answers 503 when there is no KV binding to record the month in", async () => {
    Object.assign(globalThis, { WHETHER_CRON_SECRET: "test-cron-secret" });
    const store = resetOperatingSnapshotStore();
    await store.write(
      buildOperatingSnapshot({
        treasury: {
          record_date: "2026-09-30",
          fetched_at: "2026-09-30T09:00:00Z",
          source: "US Treasury",
          isLive: true,
          yields: { oneMonth: 4.3, threeMonth: 4.3, twoYear: 4.0, tenYear: 4.1 },
        },
        macroSeries: [],
      }),
    );
    assert.ok(await getOperatingSnapshotStore().readLatest(), "a snapshot to compare is stored");

    const response = await postMonthEndPulse(cronRequest());

    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.ok, false);
    assert.match(body.error, /^KV not available/);
  });
});
