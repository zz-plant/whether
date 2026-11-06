import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildCliStatusContract, buildCliStatusExpandedContract } from "../lib/cli/contracts";
import { NextRequest } from "next/server";
import { CLI_QUERIES, parseCliQuery } from "../lib/cli/queryContracts";
import { buildCliPostureStateFixture, buildCliReportDataFixture } from "./fixtures/cliContractFixtures";

const reportData = buildCliReportDataFixture();
const postureState = await buildCliPostureStateFixture(reportData, {
  flipTrigger: "Funding pressure falls 20 pts from 90 to 70 or below.",
});

describe("cli fallback contract", () => {
  it("keeps /api/cli/status fields used by curl fallback docs", () => {
    const status = buildCliStatusContract({ reportData, postureState, degraded: false });

    assert.equal(status.version, "v1");
    assert.equal(status.regime, "Guarded Expansion");
    assert.equal(status.trend, "Deteriorating");
    assert.equal(typeof status.generatedAt, "string");
    assert.equal(typeof status.updatedAt, "string");
    assert.equal(typeof status.call.summary, "string");
    assert.ok(Array.isArray(status.call.flipConditions));
    assert.equal(status.degraded, false);
  });

  it("keeps expanded view fields used by curl fallback docs", () => {
    const expanded = buildCliStatusExpandedContract({ reportData, postureState, degraded: false });

    assert.equal(expanded.view, "expanded");
    assert.equal(typeof expanded.boundedDecision.guardrailThreshold, "string");
    assert.equal(typeof expanded.boundedDecision.reversalTrigger, "string");
    assert.ok(Array.isArray(expanded.boundedDecision.flipConditionsCompact));
  });

  it("accepts historical asOf query format used by fallback docs", () => {
    assert.deepEqual(parseCliQuery(new NextRequest("http://localhost:3000/api/cli/status?asOf=2024-07"), CLI_QUERIES.status), {
      asOf: { month: "7", year: "2024" },
    });
  });
});
