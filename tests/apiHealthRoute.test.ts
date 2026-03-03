import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GET as getHealthRoute } from "../app/api/health/route";

describe("/api/health", () => {
  it("returns a monitor-friendly payload", async () => {
    const response = await getHealthRoute();
    assert.ok([200, 503].includes(response.status), "health should return 200 or 503");

    const body = (await response.json()) as Record<string, unknown>;
    assert.ok(typeof body.status === "string");
    assert.equal(body.service, "whether");
    assert.equal(body.version, "v1");

    const checks = body.checks as { treasuryData?: Record<string, unknown> };
    assert.ok(checks && checks.treasuryData, "checks.treasuryData should be present");
    assert.ok(typeof checks.treasuryData?.status === "string");
  });
});
