import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  EMPTY_OPERATOR_PROFILE,
  formatOperatorProfileValue,
  netMonthlyBurnUsd,
  parseOperatorProfile,
  parsePlainNumberInput,
  resolveProfileRunway,
  resolveProfileRunwayMonths,
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
      grossMarginPct: 75,
      sector: "fintech",
      updatedAt: "2026-09-04T00:00:00.000Z",
    });
    assert.deepEqual(profile, {
      version: 1,
      runwayMonths: 14,
      monthlyGrowthPct: 6,
      grossMarginPct: 75,
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

describe("operator profile: runway from cash, burn net of revenue", () => {
  it("holds cash or a typed runway, never both: entering one clears the other", () => {
    const typed = setOperatorProfileField({}, "runwayMonths", 14);
    const withCash = setOperatorProfileField(typed, "cashUsd", 2_000_000);
    assert.equal(withCash.cashUsd, 2_000_000);
    assert.equal("runwayMonths" in withCash, false);
    const backToTyped = setOperatorProfileField(withCash, "runwayMonths", 9);
    assert.equal(backToTyped.runwayMonths, 9);
    assert.equal("cashUsd" in backToTyped, false);
    // Clearing one leaves the other alone.
    const cleared = setOperatorProfileField(setOperatorProfileField({}, "cashUsd", 1), "runwayMonths", undefined);
    assert.equal(cleared.cashUsd, 1);
  });

  it("reads net burn as spend less revenue, with blank revenue as none", () => {
    assert.equal(netMonthlyBurnUsd({ version: 1, monthlyBurnUsd: 200_000, monthlyRevenueUsd: 150_000 }), 50_000);
    assert.equal(netMonthlyBurnUsd({ version: 1, monthlyBurnUsd: 200_000 }), 200_000);
    assert.equal(netMonthlyBurnUsd({ version: 1, monthlyBurnUsd: 80_000, monthlyRevenueUsd: 95_000 }), -15_000);
    assert.equal(netMonthlyBurnUsd({ version: 1, monthlyRevenueUsd: 95_000 }), undefined);
  });

  it("resolves runway from cash first, then a typed figure, and never from cash alone", () => {
    assert.deepEqual(resolveProfileRunway({ version: 1, cashUsd: 2_100_000, monthlyBurnUsd: 200_000, monthlyRevenueUsd: 50_000 }), {
      basis: "cash",
      months: 14,
      cashUsd: 2_100_000,
      netBurnUsd: 150_000,
    });
    assert.deepEqual(resolveProfileRunway({ version: 1, runwayMonths: 9, monthlyBurnUsd: 200_000 }), { basis: "entered", months: 9 });
    assert.equal(resolveProfileRunway({ version: 1, cashUsd: 2_100_000 }), null);
    assert.equal(resolveProfileRunwayMonths({ version: 1, cashUsd: 2_100_000 }), undefined);
    assert.equal(resolveProfileRunway(EMPTY_OPERATOR_PROFILE), null);
  });

  it("counts no runway when revenue covers spending", () => {
    const profile = { version: 1 as const, cashUsd: 300_000, monthlyBurnUsd: 80_000, monthlyRevenueUsd: 80_000 };
    assert.deepEqual(resolveProfileRunway(profile), { basis: "cash-flow-positive", cashUsd: 300_000, surplusUsd: 0 });
    assert.equal(resolveProfileRunwayMonths(profile), undefined);
  });

  it("counts no runway when revenue covers spending beside a typed runway too", () => {
    // Typed 14 months used to size a full plan here, while the same company with its cash entered was told
    // there was no runway to plan against.
    const typed = { version: 1 as const, runwayMonths: 14, monthlyBurnUsd: 100_000, monthlyRevenueUsd: 120_000 };
    assert.deepEqual(resolveProfileRunway(typed), { basis: "cash-flow-positive", surplusUsd: 20_000 });
    assert.equal(resolveProfileRunwayMonths(typed), undefined);
    // Spend and revenue alone say nothing about cash yet, and are no runway either way.
    assert.equal(resolveProfileRunway({ version: 1, monthlyBurnUsd: 100_000, monthlyRevenueUsd: 120_000 }), null);
  });

  it("keeps a stored cash figure through a parse and formats it as money", () => {
    assert.equal(parseOperatorProfile({ cashUsd: 2_100_000 }).cashUsd, 2_100_000);
    assert.equal(parseOperatorProfile({ cashUsd: -1 }).cashUsd, undefined);
    assert.equal(formatOperatorProfileValue("cashUsd", 2_100_000), "2,100,000");
  });
});

describe("runway planner inputs: missing means missing", () => {
  it("names what is missing instead of sizing a fictional company", () => {
    const resolution = resolveRunwayPlannerRequest({ version: 1, runwayMonths: 14 }, null);
    assert.equal(resolution.ready, false);
    if (resolution.ready) return;
    assert.deepEqual(resolution.missing, ["monthlyBurnUsd", "monthlyRevenueUsd"]);
    assert.equal(describeMissingRunwayInputs(resolution.missing), "Enter monthly spend and monthly revenue to size the plan.");
    assert.equal(
      describeMissingRunwayInputs(["runwayMonths", "monthlyBurnUsd", "monthlyRevenueUsd"]),
      "Enter cash in the bank (or runway), monthly spend, and monthly revenue to size the plan.",
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

  it("works the runway out from cash, so a founder never has to", () => {
    const resolution = resolveRunwayPlannerRequest(
      { version: 1, cashUsd: 1_800_000, monthlyBurnUsd: 250_000, monthlyRevenueUsd: 100_000 },
      "seed",
    );
    assert.equal(resolution.ready, true);
    if (!resolution.ready) return;
    assert.equal(resolution.request.runway, 12);
    assert.equal(resolution.request.burn, 250_000);
  });

  it("counts cash without spend as runway still missing", () => {
    const resolution = resolveRunwayPlannerRequest({ version: 1, cashUsd: 1_800_000, monthlyRevenueUsd: 0 }, null);
    assert.equal(resolution.ready, false);
    if (resolution.ready) return;
    assert.deepEqual(resolution.missing, ["runwayMonths", "monthlyBurnUsd"]);
  });

  it("says there is no runway to plan when revenue covers spending, rather than asking for one", () => {
    const resolution = resolveRunwayPlannerRequest(
      { version: 1, cashUsd: 500_000, monthlyBurnUsd: 90_000, monthlyRevenueUsd: 120_000 },
      "bootstrapped",
    );
    assert.equal(resolution.ready, false);
    if (resolution.ready) return;
    assert.equal(resolution.cashFlowPositive, true);
    assert.deepEqual(resolution.missing, []);
  });

  it("gives a typed runway the same answer as cash when revenue covers spending", () => {
    for (const runwayGiven of [{ runwayMonths: 14 }, { cashUsd: 1_400_000 }]) {
      const resolution = resolveRunwayPlannerRequest(
        { version: 1, ...runwayGiven, monthlyBurnUsd: 100_000, monthlyRevenueUsd: 120_000 },
        null,
      );
      assert.equal(resolution.ready, false, JSON.stringify(runwayGiven));
      if (resolution.ready) return;
      assert.equal(resolution.cashFlowPositive, true);
    }
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
