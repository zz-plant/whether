import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  EMPTY_OPERATOR_PROFILE,
  formatOperatorProfileValue,
  parseOperatorProfile,
  parsePlainNumberInput,
  setOperatorProfileField,
} from "../lib/operatorProfile";
import {
  describeMissingRunwayInputs,
  resolveRunwayPlannerRequest,
} from "../lib/report/runwayPlannerInputs";

describe("operator profile: the figures the reader gave, and nothing else", () => {
  it("keeps valid fields and drops the rest one at a time", () => {
    const profile = parseOperatorProfile({
      version: 1,
      runwayMonths: 14,
      monthlyBurnUsd: "450000",
      monthlyRevenueUsd: -5,
      monthlyGrowthPct: 6,
      sector: "fintech",
      updatedAt: "2026-09-04T00:00:00.000Z",
    });
    assert.deepEqual(profile, {
      version: 1,
      runwayMonths: 14,
      monthlyGrowthPct: 6,
      updatedAt: "2026-09-04T00:00:00.000Z",
    });
  });

  it("reads garbage as an empty profile", () => {
    assert.deepEqual(parseOperatorProfile(null), EMPTY_OPERATOR_PROFILE);
    assert.deepEqual(parseOperatorProfile("[]"), EMPTY_OPERATOR_PROFILE);
    assert.deepEqual(parseOperatorProfile({ runwayMonths: Number.NaN }), { version: 1 });
  });

  it("clears a field with undefined rather than writing zero", () => {
    const withBurn = setOperatorProfileField({}, "monthlyBurnUsd", 150_000, new Date("2026-09-04T00:00:00Z"));
    assert.equal(withBurn.monthlyBurnUsd, 150_000);
    const cleared = setOperatorProfileField(withBurn, "monthlyBurnUsd", undefined, new Date("2026-09-05T00:00:00Z"));
    assert.equal("monthlyBurnUsd" in cleared, false);
    assert.equal(cleared.updatedAt, "2026-09-05T00:00:00.000Z");
  });

  it("reads plain numbers with the unit typed again, and nothing without a number", () => {
    assert.equal(parsePlainNumberInput("14"), 14);
    assert.equal(parsePlainNumberInput(" 14 months "), 14);
    assert.equal(parsePlainNumberInput("12%"), 12);
    assert.equal(parsePlainNumberInput("-8"), -8);
    assert.equal(parsePlainNumberInput("1,200"), 1200);
    assert.equal(parsePlainNumberInput("flat"), null);
    assert.equal(parsePlainNumberInput(""), null);
  });

  it("formats money with grouped digits and everything else as typed", () => {
    assert.equal(formatOperatorProfileValue("monthlyBurnUsd", 450_000), "450,000");
    assert.equal(formatOperatorProfileValue("runwayMonths", 14.5), "14.5");
    assert.equal(formatOperatorProfileValue("runwayMonths", undefined), "");
  });
});

describe("runway planner inputs: missing means missing", () => {
  it("names what is missing instead of sizing a fictional company", () => {
    const resolution = resolveRunwayPlannerRequest({ version: 1, runwayMonths: 14 }, null);
    assert.equal(resolution.ready, false);
    if (resolution.ready) return;
    assert.deepEqual(resolution.missing, ["monthlyBurnUsd", "monthlyRevenueUsd"]);
    assert.equal(describeMissingRunwayInputs(resolution.missing), "Enter monthly burn and monthly revenue to size the plan.");
    assert.equal(
      describeMissingRunwayInputs(["runwayMonths", "monthlyBurnUsd", "monthlyRevenueUsd"]),
      "Enter runway, monthly burn, and monthly revenue to size the plan.",
    );
  });

  it("accepts zero revenue as an answer and blank growth as flat", () => {
    const resolution = resolveRunwayPlannerRequest(
      { version: 1, runwayMonths: 9, monthlyBurnUsd: 120_000, monthlyRevenueUsd: 0 },
      "seed",
    );
    assert.equal(resolution.ready, true);
    if (!resolution.ready) return;
    assert.equal(resolution.growthAssumedFlat, true);
    assert.deepEqual(resolution.request, {
      runway: 9,
      burn: 120_000,
      revenue: 0,
      growthRate: 0,
      sector: "b2b-saas",
      stage: "seed",
    });
  });

  it("maps the shared stage into the planner's own stage names", () => {
    const resolution = resolveRunwayPlannerRequest(
      { version: 1, runwayMonths: 20, monthlyBurnUsd: 900_000, monthlyRevenueUsd: 700_000, monthlyGrowthPct: 4, sector: "infrastructure" },
      "bootstrapped",
    );
    assert.equal(resolution.ready, true);
    if (!resolution.ready) return;
    assert.equal(resolution.request.stage, "growth");
    assert.equal(resolution.request.sector, "infrastructure");
    assert.equal(resolution.growthAssumedFlat, false);
  });
});
