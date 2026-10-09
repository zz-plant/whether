import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { deriveSecFundamentals } from "../lib/marketData/secEdgar";
import { companyFactsFixture, quarterPeriods } from "./fixtures/marketData";

/*
 * The comps' fundamentals come from what companies file with the SEC, derived here from
 * EDGAR's company facts. The derivation has to survive the ways real filers differ: the fourth
 * quarter that only a 10-K reports, the revenue concept that changed names, the same notes
 * tagged twice, a share count that stopped being tagged years ago, a company that was bought.
 * Each case below is one of those, taken from the basket's own filings on 2026-10-09.
 */

const NOW = new Date("2026-10-09T12:00:00.000Z");

const derive = (facts: unknown) => {
  const result = deriveSecFundamentals(facts, NOW);
  assert.equal(result.status, "ok", result.status === "ok" ? "" : result.reason);
  return result.status === "ok" ? result.value : null;
};

type Row = { start?: string; end: string; val: number; filed: string };
const usd = (rows: Row[]) => ({ units: { USD: rows } });

describe("deriveSecFundamentals", () => {
  it("reads trailing revenue, year-on-year growth, cash, debt and shares from a 10-Q", () => {
    const value = derive(companyFactsFixture({ latestQuarterEnd: "2026-07-31" }));

    assert.deepEqual(value, {
      revenueTtm: 410e6,
      revenueGrowth: 110e6 / 88e6 - 1,
      cash: 150e6,
      debt: 50e6,
      sharesOutstanding: 10e6,
      periodEnd: "2026-07-31",
    });
  });

  it("derives the fiscal fourth quarter from the 10-K's year less its first three quarters", () => {
    // Atlassian's fiscal year ends June 30: the 10-K reports the year, and no Q4 on its own.
    const [q3, q2, q1] = quarterPeriods("2026-03-31", 3);
    const facts = companyFactsFixture({
      latestQuarterEnd: "2026-03-31",
      quarterlyRevenue: [100e6, 95e6, 90e6, 85e6, 80e6],
      extraRevenueRows: [{ start: q1.start, end: "2026-06-30", val: 100e6 + 95e6 + 90e6 + 120e6, filed: "2026-08-01", form: "10-K" }],
    });

    const value = derive(facts);

    assert.deepEqual([q3.end, q2.end, q1.end], ["2026-03-31", "2025-12-31", "2025-09-30"]);
    assert.equal(value?.periodEnd, "2026-06-30");
    assert.equal(value?.revenueTtm, 120e6 + 100e6 + 95e6 + 90e6, "the derived Q4 plus the three quarters before it");
    assert.equal(value?.revenueGrowth, 120e6 / 85e6 - 1, "Q4 against the fourth quarter a year earlier");
  });

  it("reads the revenue concept with the newest quarter, not the first one on the list", () => {
    // Shopify filed revenue under RevenueFromContractWithCustomer… until 2023 and under Revenues since.
    const facts = companyFactsFixture({ latestQuarterEnd: "2026-06-30", revenueConcept: "Revenues" });
    Object.assign(facts.facts["us-gaap"], {
      RevenueFromContractWithCustomerExcludingAssessedTax: usd([{ start: "2023-01-01", end: "2023-12-31", val: 7e9, filed: "2024-02-01" }]),
    });

    assert.equal(derive(facts)?.revenueTtm, 410e6);
  });

  it("counts notes tagged under two concepts once, and adds short-term borrowings", () => {
    const facts = companyFactsFixture({ latestQuarterEnd: "2026-06-30", convertibleDebt: 1_000e6 });
    Object.assign(facts.facts["us-gaap"], {
      LongTermDebtNoncurrent: usd([{ end: "2026-06-30", val: 1_000e6, filed: "2026-07-30" }]),
      ShortTermBorrowings: usd([{ end: "2026-06-30", val: 200e6, filed: "2026-07-30" }]),
    });

    assert.equal(derive(facts)?.debt, 1_200e6);
  });

  it("takes a restatement over the figure it restates", () => {
    const facts = companyFactsFixture({ latestQuarterEnd: "2026-06-30" });
    facts.facts["us-gaap"].CashAndCashEquivalentsAtCarryingValue.units.USD.push({ end: "2026-06-30", val: 300e6, filed: "2026-09-01", form: "10-Q/A" });

    assert.equal(derive(facts)?.cash, 350e6);
  });

  it("uses the cover-page share count only when it is newer and agrees with the weighted count", () => {
    const withCover = (end: string, val: number) => {
      const facts = companyFactsFixture({ latestQuarterEnd: "2026-07-31", weightedShares: 10e6 });
      Object.assign(facts.facts.dei, {
        EntityCommonStockSharesOutstanding: { units: { shares: [{ end, val, filed: end }] } },
      });
      return facts;
    };

    assert.equal(derive(withCover("2026-08-28", 10.3e6))?.sharesOutstanding, 10.3e6, "newer and within a tenth");
    // Workday's last cover-page count is from 2018.
    assert.equal(derive(withCover("2018-11-30", 8e6))?.sharesOutstanding, 10e6, "years stale");
    // A multi-class filer tagging one class: a count that disagrees by a third is not the company.
    assert.equal(derive(withCover("2026-08-28", 6e6))?.sharesOutstanding, 10e6, "one class of several");
  });

  it("reports a company that stopped filing as missing, not as a current figure", () => {
    // Confluent deregistered in March 2026; its last 10-Q is for the quarter ended 2025-12-31.
    const result = deriveSecFundamentals(companyFactsFixture({ latestQuarterEnd: "2025-12-31" }), NOW);
    assert.equal(result.status, "missing");
    assert.match(result.status === "missing" ? result.reason : "", /2025-12-31/);
  });

  it("will not call three quarters a trailing year", () => {
    const facts = companyFactsFixture({ latestQuarterEnd: "2026-06-30", quarterlyRevenue: [110e6, 105e6, 100e6] });
    assert.equal(deriveSecFundamentals(facts, NOW).status, "missing");
  });

  it("reads an unrecognisable document as missing rather than throwing", () => {
    assert.equal(deriveSecFundamentals({ error: "rate limited" }, NOW).status, "missing");
    assert.equal(deriveSecFundamentals(null, NOW).status, "missing");
  });
});
