import { describe, it } from "bun:test";
import assert from "node:assert/strict";

import {
  computeRunwayShare,
  formatCommitmentUsd,
  parseMoneyInput,
  parsePlanCommitment,
} from "../lib/planCommitment";

describe("parsePlanCommitment — amounts", () => {
  it("reads the shapes an operator actually types", () => {
    assert.equal(parsePlanCommitment("a $180k contract").annualUsd, 180_000);
    assert.equal(parsePlanCommitment("a $1.2m raise").annualUsd, 1_200_000);
    assert.equal(parsePlanCommitment("a $50,000 commit").annualUsd, 50_000);
    assert.equal(parsePlanCommitment("budget of 180k").annualUsd, 180_000);
    assert.equal(parsePlanCommitment("spend $2.5M on the migration").annualUsd, 2_500_000);
  });

  it("never reads a bare integer as money, or 'hire 3 engineers' costs three dollars", () => {
    const parsed = parsePlanCommitment("hire 3 engineers");
    assert.equal(parsed.annualUsd, null);
    assert.equal(parsed.headcount, 3);
  });

  it("does not read a duration suffix as millions", () => {
    // "12 months" and "18 mo" both end in an m that the suffix branch must not claim.
    assert.equal(parsePlanCommitment("a 12 month commitment").annualUsd, null);
    assert.equal(parsePlanCommitment("locked in for 18 mo").annualUsd, null);
  });

  it("sizes on the largest figure in the sentence, not the first", () => {
    const parsed = parsePlanCommitment("a $50k cloud commit and a $400k office lease");
    assert.equal(parsed.unitAmountUsd, 400_000);
  });

  it("ignores an implausible figure rather than sizing a plan on a typo", () => {
    assert.equal(parsePlanCommitment("$99999999999999k of spend").annualUsd, null);
  });
});

describe("parsePlanCommitment — headcount and per-unit multiplication", () => {
  it("reads a count through intervening adjectives", () => {
    assert.equal(parsePlanCommitment("hire 3 senior backend engineers").headcount, 3);
    assert.equal(parsePlanCommitment("add 2 enterprise AEs").headcount, 2);
    assert.equal(parsePlanCommitment("open 4 roles").headcount, 4);
  });

  it("reads a count that follows the verb", () => {
    assert.equal(parsePlanCommitment("hire 5 for the platform team").headcount, 5);
  });

  it("multiplies only on an explicit per-unit marker", () => {
    // The placeholder the input box shows.
    const perUnit = parsePlanCommitment("Hiring 3 senior engineers @ $180k");
    assert.equal(perUnit.annualUsd, 540_000);
    assert.equal(perUnit.basis, "3 × $180k each → $540k in the first year");

    const alreadyTotalled = parsePlanCommitment("hire 3 senior engineers, $540k budgeted");
    assert.equal(alreadyTotalled.annualUsd, 540_000);
  });

  it("treats 'each' and 'apiece' the same way as '@'", () => {
    assert.equal(parsePlanCommitment("hire 40 senior engineers at $250k each").annualUsd, 10_000_000);
    assert.equal(parsePlanCommitment("2 contractors at $90k apiece").annualUsd, 180_000);
  });

  it("does not multiply a single hire", () => {
    assert.equal(parsePlanCommitment("hire 1 engineer @ $180k").annualUsd, 180_000);
  });
});

describe("parsePlanCommitment — cadence", () => {
  it("annualises a monthly commitment", () => {
    const parsed = parsePlanCommitment("a $12k/mo cloud spend");
    assert.equal(parsed.cadence, "MONTHLY");
    assert.equal(parsed.annualUsd, 144_000);
    assert.equal(parsed.basis, "$12k a month → $144k in the first year");
  });

  it("leaves an annual commitment alone", () => {
    const parsed = parsePlanCommitment("signing a $50k annual cloud commit");
    assert.equal(parsed.cadence, "ANNUAL");
    assert.equal(parsed.annualUsd, 50_000);
    assert.equal(parsed.basis, "$50k a year");
  });

  it("reads an unmarked amount as a first-year cost and says so", () => {
    const parsed = parsePlanCommitment("a $200k office build-out");
    assert.equal(parsed.cadence, "ONE_OFF");
    assert.equal(parsed.basis, "$200k, read as a first-year cost");
  });

  it("annualises per-unit monthly pay before multiplying out", () => {
    const parsed = parsePlanCommitment("3 contractors @ $10k per month each");
    assert.equal(parsed.annualUsd, 360_000);
  });
});

describe("parsePlanCommitment — no amount at all", () => {
  it("returns null rather than zero, so a caller cannot render the plan as free", () => {
    for (const text of ["", "expand into Europe", "asdf qwerty"]) {
      const parsed = parsePlanCommitment(text);
      assert.equal(parsed.annualUsd, null);
      assert.equal(parsed.basis, null);
    }
  });
});

describe("computeRunwayShare", () => {
  it("prefers an explicit cash balance", () => {
    const result = computeRunwayShare({ annualUsd: 500_000, cashBalanceUsd: 2_000_000 })!;
    assert.equal(result.share, 0.25);
    assert.equal(result.cashBasis, "$2M cash on hand");
  });

  it("derives cash from burn times runway when no balance is given", () => {
    const result = computeRunwayShare({ annualUsd: 600_000, monthlyBurnUsd: 100_000, runwayMonths: 12 })!;
    assert.equal(result.share, 0.5);
    assert.equal(result.cashUsd, 1_200_000);
    assert.equal(result.cashBasis, "$100k a month × 12 months of runway");
  });

  it("returns null rather than estimating burn the caller never supplied", () => {
    assert.equal(computeRunwayShare({ annualUsd: 500_000, runwayMonths: 18 }), null);
    assert.equal(computeRunwayShare({ annualUsd: 500_000 }), null);
    assert.equal(computeRunwayShare({ annualUsd: null, cashBalanceUsd: 2_000_000 }), null);
  });

  it("rejects a zero or negative balance instead of dividing by it", () => {
    assert.equal(computeRunwayShare({ annualUsd: 500_000, cashBalanceUsd: 0 }), null);
    assert.equal(computeRunwayShare({ annualUsd: 500_000, monthlyBurnUsd: 0, runwayMonths: 12 }), null);
  });
});

describe("formatCommitmentUsd", () => {
  it("stays compact without losing the reading", () => {
    assert.equal(formatCommitmentUsd(540_000), "$540k");
    assert.equal(formatCommitmentUsd(1_200_000), "$1.2M");
    assert.equal(formatCommitmentUsd(12_000_000), "$12M");
    // A round figure keeps no false decimal.
    assert.equal(formatCommitmentUsd(2_000_000), "$2M");
    assert.equal(formatCommitmentUsd(2_500_000_000), "$2.5B");
    assert.equal(formatCommitmentUsd(750), "$750");
  });
});

describe("parseMoneyInput", () => {
  it("accepts a bare number, because the field label already says dollars", () => {
    assert.equal(parseMoneyInput("150000"), 150_000);
    assert.equal(parseMoneyInput("150,000"), 150_000);
  });

  it("accepts the shorthand people type", () => {
    assert.equal(parseMoneyInput("$150k"), 150_000);
    assert.equal(parseMoneyInput("150k"), 150_000);
    assert.equal(parseMoneyInput("1.2m"), 1_200_000);
  });

  it("returns null on anything it cannot read, rather than zero", () => {
    for (const raw of ["", "   ", "abc", "-5000", "0"]) {
      assert.equal(parseMoneyInput(raw), null, `expected null for ${JSON.stringify(raw)}`);
    }
  });
});
