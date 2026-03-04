import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { GET as getWeeklyRoute } from "../app/api/weekly/route";
import { GET as getMonthlyRoute } from "../app/api/monthly/route";
import { GET as getCadenceRoute } from "../app/api/cadence/route";
import { GET as getSummaryDeltaRoute } from "../app/api/summary-delta/route";

const originalFetch = globalThis.fetch;

before(() => {
  globalThis.fetch = (async () => {
    throw new Error("Network disabled for summary route contract tests");
  }) as typeof fetch;
});

after(() => {
  globalThis.fetch = originalFetch;
});

const assertIsoTimestamp = (value: unknown, label: string) => {
  assert.equal(typeof value, "string", `${label} should be a string`);
  const timestamp = value as string;
  assert.ok(!Number.isNaN(Date.parse(timestamp)), `${label} should be a valid ISO timestamp`);
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

const assertCadenceContract = (body: Record<string, unknown>) => {
  assert.equal(body.version, "v1");
  assertIsoTimestamp(body.generatedAt, "generatedAt");

  assert.ok(
    body.weeklySummary && typeof body.weeklySummary === "object",
    "weeklySummary should be an object",
  );
  assert.ok(
    body.monthlySummary && typeof body.monthlySummary === "object",
    "monthlySummary should be an object",
  );

  assert.equal(typeof body.alignmentStatus, "string", "alignmentStatus should be a string");
  assert.ok(
    ["aligned", "watch", "mismatch"].includes(body.alignmentStatus as string),
    "alignmentStatus should be one of aligned|watch|mismatch",
  );

  assert.ok(
    Array.isArray(body.mismatchedConstraints),
    "mismatchedConstraints should be an array",
  );
};

const assertSummaryDeltaContract = (body: Record<string, unknown>) => {
  assert.equal(body.version, "v1");
  assertIsoTimestamp(body.generatedAt, "generatedAt");

  assert.ok(body.delta && typeof body.delta === "object", "delta should be an object");
  const delta = body.delta as Record<string, unknown>;

  assert.ok(delta.regime && typeof delta.regime === "object", "delta.regime should be an object");
  assert.ok(
    delta.constraints && typeof delta.constraints === "object",
    "delta.constraints should be an object",
  );
  assert.ok(
    delta.provenance && typeof delta.provenance === "object",
    "delta.provenance should be an object",
  );
  assert.ok(Array.isArray(delta.bullets), "delta.bullets should be an array");

  const constraints = delta.constraints as Record<string, unknown>;
  assert.ok(Array.isArray(constraints.added), "delta.constraints.added should be an array");
  assert.ok(Array.isArray(constraints.removed), "delta.constraints.removed should be an array");
  assert.ok(Array.isArray(constraints.unchanged), "delta.constraints.unchanged should be an array");

  assert.ok(body.summaries && typeof body.summaries === "object", "summaries should be an object");
  const summaries = body.summaries as Record<string, unknown>;
  assert.ok(summaries.weekly && typeof summaries.weekly === "object", "summaries.weekly should be an object");
  assert.ok(
    summaries.monthly && typeof summaries.monthly === "object",
    "summaries.monthly should be an object",
  );
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

  it("keeps /api/cadence response contract stable", async () => {
    const response = await getCadenceRoute();
    assert.equal(response.status, 200);

    const body = (await response.json()) as Record<string, unknown>;
    assertCadenceContract(body);
  });

  it("keeps /api/summary-delta response contract stable", async () => {
    const response = await getSummaryDeltaRoute();
    assert.equal(response.status, 200);

    const body = (await response.json()) as Record<string, unknown>;
    assertSummaryDeltaContract(body);
  });
});
