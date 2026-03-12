import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GET as getHealthRoute } from "../app/api/health/route";

describe("/api/health", () => {
  it("returns a monitor-friendly payload with normalized source health rows", async () => {
    const response = await getHealthRoute();
    assert.ok([200, 503].includes(response.status), "health should return 200 or 503");

    const body = (await response.json()) as Record<string, unknown>;
    assert.ok(typeof body.status === "string");
    assert.equal(body.service, "whether");
    assert.equal(body.version, "v1");

    const checks = body.checks as { treasuryData?: Record<string, unknown> };
    assert.ok(checks && checks.treasuryData, "checks.treasuryData should be present");
    assert.ok(typeof checks.treasuryData?.status === "string");

    const sources = body.sources as Array<Record<string, unknown>>;
    assert.ok(Array.isArray(sources), "sources should be an array");
    assert.ok(sources.length >= 2, "sources should include treasury + macro rows");

    const treasurySource = sources.find((row) => row.sourceName === "Treasury");
    const macroSource = sources.find((row) => row.sourceName === "Macro");
    assert.ok(treasurySource, "treasury source row should be present");
    assert.ok(macroSource, "macro source row should be present");

    for (const source of sources) {
      assert.ok(typeof source.sourceName === "string");
      assert.ok(["fresh", "stale", "unknown"].includes(String(source.freshnessStatus)));
      assert.ok(typeof source.freshnessSlaHours === "number");
      assert.ok(
        source.lastSuccessfulFetchAt === null || typeof source.lastSuccessfulFetchAt === "string",
      );
      assert.ok(
        source.activeFallbackReason === null || typeof source.activeFallbackReason === "string",
      );
      assert.ok(["live", "fallback"].includes(String(source.mode)));
      assert.ok(["ok", "degraded", "unknown"].includes(String(source.status)));
    }
  });
});
