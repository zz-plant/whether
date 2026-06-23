import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { GET as getHealthRoute } from "../app/api/health/route";

describe("/api/health", () => {
  it("returns a minimal status payload", async () => {
    const response = await getHealthRoute();
    assert.ok([200, 503].includes(response.status), "health should return 200 or 503");

    const body = (await response.json()) as Record<string, unknown>;
    assert.ok(typeof body.status === "string");
    assert.equal(body.service, "whether");
    assert.equal(body.version, "v1");
    assert.ok(typeof body.generatedAt === "string");
  });
});
