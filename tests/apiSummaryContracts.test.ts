import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "bun:test";
import { GET as getWeeklyRoute } from "../app/api/weekly/route";
import { GET as getMonthlyRoute } from "../app/api/monthly/route";
import { GET as getQuarterlyRoute } from "../app/api/quarterly/route";
import { GET as getYearlyRoute } from "../app/api/yearly/route";


const CANONICAL_REGIMES = ["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"] as const;

const assertIsoTimestamp = (value: unknown, label: string) => {
  if (typeof value !== "string") {
    assert.fail(`${label} should be a string`);
  }
  assert.ok(!Number.isNaN(Date.parse(value)), `${label} should be a valid ISO timestamp`);
};

const assertBaseSummaryContract = (body: Record<string, unknown>) => {
  assert.equal(body.version, "v1");
  assert.equal(typeof body.degraded, "boolean");
  assert.ok(body.summary && typeof body.summary === "object", "summary should be an object");
  assert.equal(body.copy, (body.summary as { copy?: unknown }).copy);
  assert.deepEqual(body.provenance, (body.summary as { provenance?: unknown }).provenance);
  assert.equal(
    body.recordDateLabel,
    (body.summary as { recordDateLabel?: unknown }).recordDateLabel,
  );
  assertIsoTimestamp(body.generatedAt, "generatedAt");

  const summaryRegime = (body.summary as { regime?: unknown }).regime;
  assert.ok(CANONICAL_REGIMES.includes(summaryRegime as (typeof CANONICAL_REGIMES)[number]));
};

const assertWeeklyMonthlyExtras = (body: Record<string, unknown>) => {
  assert.deepEqual(body.structured, (body.summary as { structured?: unknown }).structured);

  assert.ok(body.agentHandoff && typeof body.agentHandoff === "object", "agentHandoff should be present");
  assert.ok((body.agentHandoff as { payload?: unknown }).payload, "agentHandoff.payload should be present");
  assert.equal(
    typeof (body.agentHandoff as { prompt?: unknown }).prompt,
    "string",
    "agentHandoff.prompt should be a string",
  );

  assert.equal(typeof body.summaryHash, "string", "summaryHash should be a string");
  assert.ok((body.summaryHash as string).length > 0, "summaryHash should not be empty");
};


const originalFetch = globalThis.fetch;
const disabledFetch: typeof fetch = async () => {
  throw new Error("Test fetch disabled");
};

beforeEach(() => {
  globalThis.fetch = disabledFetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("summary route contracts", () => {
  it("keeps /api/weekly response contract stable", async () => {
    const response = await getWeeklyRoute();
    assert.equal(response.status, 200);

    const body = (await response.json()) as Record<string, unknown>;
    assertBaseSummaryContract(body);
    assertWeeklyMonthlyExtras(body);
  });

  it("keeps /api/monthly response contract stable", async () => {
    const response = await getMonthlyRoute();
    assert.equal(response.status, 200);

    const body = (await response.json()) as Record<string, unknown>;
    assertBaseSummaryContract(body);
    assertWeeklyMonthlyExtras(body);

    const structured = (body.summary as { structured?: { posture?: { label?: unknown; summary?: unknown[] }; boundedNextActions?: unknown[]; reversalConditions?: unknown[]; executionConstraints?: unknown[] } }).structured;
    assert.ok(structured, "monthly summary should include structured data");
    assert.equal(typeof structured?.posture?.label, "string");
    assert.ok(Array.isArray(structured?.posture?.summary), "monthly posture summary should be an array");
    assert.ok(Array.isArray(structured?.boundedNextActions), "monthly boundedNextActions should be an array");
    assert.ok(Array.isArray(structured?.reversalConditions), "monthly reversalConditions should be an array");
    assert.ok(Array.isArray(structured?.executionConstraints), "monthly executionConstraints should be an array");
  });

  it("keeps /api/quarterly response contract stable", async () => {
    const response = await getQuarterlyRoute();
    assert.equal(response.status, 200);

    const body = (await response.json()) as Record<string, unknown>;
    assertBaseSummaryContract(body);
    assert.equal("structured" in body, false, "quarterly route should not include structured");
    assert.equal("agentHandoff" in body, false, "quarterly route should not include agentHandoff");
    assert.equal("summaryHash" in body, false, "quarterly route should not include summaryHash");
  });

  it("keeps /api/yearly response contract stable", async () => {
    const response = await getYearlyRoute();
    assert.equal(response.status, 200);

    const body = (await response.json()) as Record<string, unknown>;
    assertBaseSummaryContract(body);
    assert.equal("structured" in body, false, "yearly route should not include structured");
    assert.equal("agentHandoff" in body, false, "yearly route should not include agentHandoff");
    assert.equal("summaryHash" in body, false, "yearly route should not include summaryHash");
  });
});
