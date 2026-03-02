import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GET as getWeeklyRoute } from "../app/api/weekly/route";
import { GET as getMonthlyRoute } from "../app/api/monthly/route";

const assertIsoTimestamp = (value: unknown, label: string) => {
  assert.equal(typeof value, "string", `${label} should be a string`);
  assert.ok(!Number.isNaN(Date.parse(value)), `${label} should be a valid ISO timestamp`);
};

const assertSummaryContract = (body: Record<string, unknown>) => {
  assert.equal(body.version, "v1");
  assert.ok(body.summary && typeof body.summary === "object", "summary should be an object");
  assert.equal(body.copy, (body.summary as { copy?: unknown }).copy);
  assert.deepEqual(body.structured, (body.summary as { structured?: unknown }).structured);
  assert.deepEqual(body.provenance, (body.summary as { provenance?: unknown }).provenance);
  assert.equal(
    body.recordDateLabel,
    (body.summary as { recordDateLabel?: unknown }).recordDateLabel,
  );

  assert.ok(body.agentHandoff && typeof body.agentHandoff === "object", "agentHandoff should be present");
  assert.ok((body.agentHandoff as { payload?: unknown }).payload, "agentHandoff.payload should be present");
  assert.equal(
    typeof (body.agentHandoff as { prompt?: unknown }).prompt,
    "string",
    "agentHandoff.prompt should be a string",
  );

  assert.equal(typeof body.summaryHash, "string", "summaryHash should be a string");
  assert.ok((body.summaryHash as string).length > 0, "summaryHash should not be empty");
  assertIsoTimestamp(body.generatedAt, "generatedAt");
};

describe("summary route contracts", () => {
  it("keeps /api/weekly response contract stable", async () => {
    const response = await getWeeklyRoute();
    assert.equal(response.status, 200);

    const body = (await response.json()) as Record<string, unknown>;
    assertSummaryContract(body);
  });

  it("keeps /api/monthly response contract stable", async () => {
    const response = await getMonthlyRoute();
    assert.equal(response.status, 200);

    const body = (await response.json()) as Record<string, unknown>;
    assertSummaryContract(body);
  });
});
