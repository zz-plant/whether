import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GET as getWeeklyRoute, runtime as weeklyRuntime } from "../app/api/weekly/route";
import { runtime as homeRuntime } from "../app/page";

describe("edge runtime contracts", () => {
  it("keeps critical routes/pages on edge runtime", () => {
    assert.equal(homeRuntime, "edge");
    assert.equal(weeklyRuntime, "edge");
  });

  it("returns JSON headers and required weekly schema fields", async () => {
    const response = await getWeeklyRoute();
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /application\/json/);
    assert.equal(typeof body.generatedAt, "string");
    assert.equal(typeof body.summaryHash, "string");
    assert.equal(typeof body.summary?.copy, "string");
    assert.ok(Array.isArray(body.summary?.constraints));
  });
});
