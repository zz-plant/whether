import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "bun:test";
import { GET } from "../app/api/company-filing/route";
import { deriveSecCompanyFigures, deriveSecRestructurings, fetchSecCompanyFiling } from "../lib/marketData/secEdgar";
import { applyCompanyFiling, parseOperatorProfile, resolveProfileRunway, setOperatorProfileField } from "../lib/operatorProfile";
import { companyFilingLookupSchema, describeProfileFiling } from "../lib/report/companyFiling";
import { runwayBandForProfileRunway } from "../lib/report/operatorRunway";
import { companyFactsFixture } from "./fixtures/marketData";

const NOW = new Date("2026-10-09T12:00:00.000Z");
const PERIOD_END = "2026-06-30";

type Row = { start: string; end: string; val: number; filed: string };

/* Year to date, as filings report it: last year's full year, then this year's first half and last year's. */
const CASH_FLOW_ROWS: Row[] = [
  { start: "2025-01-01", end: "2025-12-31", val: -120e6, filed: "2026-02-20" },
  { start: "2026-01-01", end: "2026-03-31", val: -20e6, filed: "2026-05-01" },
  { start: "2026-01-01", end: PERIOD_END, val: -48e6, filed: "2026-08-01" },
  { start: "2025-01-01", end: "2025-06-30", val: -60e6, filed: "2026-08-01" },
];

const facts = ({
  cashFlow = CASH_FLOW_ROWS,
  extra = {},
  ...options
}: { cashFlow?: Row[]; extra?: Record<string, unknown> } & Partial<Parameters<typeof companyFactsFixture>[0]> = {}) => {
  const fixture = companyFactsFixture({ latestQuarterEnd: PERIOD_END, ...options });
  return {
    ...fixture,
    facts: {
      ...fixture.facts,
      "us-gaap": {
        ...fixture.facts["us-gaap"],
        NetCashProvidedByUsedInOperatingActivities: { units: { USD: cashFlow } },
        ...extra,
      },
    },
  };
};

const refusalOf = (input: unknown, now = NOW) => {
  const result = deriveSecCompanyFigures(input, now);
  return result.status === "refused" ? result.refusal : result.status;
};

describe("a company's figures from its filings", () => {
  it("builds a trailing year out of year-to-date cash flow", () => {
    const result = deriveSecCompanyFigures(facts(), NOW);
    assert.equal(result.status, "ok");
    if (result.status !== "ok") return;
    // -120 for last year, -48 this half, less last year's -60 half.
    assert.equal(result.value.operatingCashFlowTtmUsd, -108e6);
    assert.equal(result.value.periodEnd, PERIOD_END);
    assert.equal(result.value.cashUsd, 150e6);
    assert.equal(result.value.debtUsd, 50e6);
    assert.equal(result.value.revenueTtmUsd, 410e6);
    assert.equal(result.value.capitalSpendingTtmUsd, null);
  });

  it("reads capital spending the same way, and only for the same period", () => {
    const capital = (end: string) => ({
      PaymentsToAcquireProductiveAssets: { units: { USD: [{ start: "2025-07-01", end, val: 30e6, filed: "2026-08-20" }] } },
    });
    const stale = { PaymentsToAcquirePropertyPlantAndEquipment: { units: { USD: [{ start: "2018-01-01", end: "2018-12-31", val: 9e6, filed: "2019-02-20" }] } } };
    const cashFlow = [{ start: "2025-07-01", end: PERIOD_END, val: 90e6, filed: "2026-08-20" }];
    const read = (extra: Record<string, unknown>) => {
      const result = deriveSecCompanyFigures(facts({ cashFlow, extra }), NOW);
      return result.status === "ok" ? result.value.capitalSpendingTtmUsd : "refused";
    };
    // A tag the company stopped using must not answer for this year, and the current one must.
    assert.equal(read({ ...stale, ...capital(PERIOD_END) }), 30e6);
    assert.equal(read(stale), null);
    assert.equal(read(capital("2025-12-31")), null);
  });

  it("keeps the date of a debt figure older than the balance sheet, and long-term securities", () => {
    const fixture = facts();
    const gaap = Object.fromEntries(Object.entries(fixture.facts["us-gaap"]).filter(([concept]) => !concept.startsWith("Convertible")));
    const result = deriveSecCompanyFigures(
      {
        ...fixture,
        facts: {
          ...fixture.facts,
          "us-gaap": {
            ...gaap,
            DebtLongtermAndShorttermCombinedAmount: { units: { USD: [{ end: "2025-12-31", val: 130e6, filed: "2026-02-20" }] } },
            MarketableSecuritiesNoncurrent: { units: { USD: [{ end: PERIOD_END, val: 80e6, filed: "2026-08-01" }] } },
          },
        },
      },
      NOW,
    );
    assert.equal(result.status === "ok" && result.value.debtAsOf, "2025-12-31");
    assert.equal(result.status === "ok" && result.value.longTermInvestmentsUsd, 80e6);
  });

  it("reads the latest fiscal year's R&D against the one before, and stock pay", () => {
    const year = (start: string, end: string, val: number) => ({ start, end, val, filed: "2026-08-01" });
    const result = deriveSecCompanyFigures(
      facts({
        extra: {
          ResearchAndDevelopmentExpense: { units: { USD: [year("2024-01-01", "2024-12-31", 80e6), year("2025-01-01", "2025-12-31", 100e6)] } },
          ShareBasedCompensation: { units: { USD: [year("2025-07-01", PERIOD_END, 12e6)] } },
        },
      }),
      NOW,
    );
    assert.equal(result.status === "ok" && result.value.researchFiscalYearUsd, 100e6);
    assert.equal(result.status === "ok" && result.value.researchPriorFiscalYearUsd, 80e6);
    assert.equal(result.status === "ok" && result.value.researchFiscalYearEnd, "2025-12-31");
    assert.equal(result.status === "ok" && result.value.stockCompensationTtmUsd, 12e6);
    // R&D last tagged years ago answers for nothing.
    const stale = deriveSecCompanyFigures(facts({ extra: { ResearchAndDevelopmentExpense: { units: { USD: [year("2020-01-01", "2020-12-31", 80e6)] } } } }), NOW);
    assert.equal(stale.status === "ok" && stale.value.researchFiscalYearUsd, null);
  });

  it("finds item 2.05 among a company's 8-Ks, within the year, with a link", () => {
    const recent = {
      form: ["8-K", "8-K", "10-Q", "8-K"],
      filingDate: ["2026-09-29", "2026-08-01", "2026-09-29", "2025-01-01"],
      items: ["2.05,9.01", "2.02,9.01", "2.05", "2.05"],
      accessionNumber: ["0001-26-000001", "0001-26-000002", "0001-26-000003", "0001-25-000004"],
      primaryDocument: ["a.htm", "b.htm", "c.htm", "d.htm"],
    };
    assert.deepEqual(deriveSecRestructurings({ filings: { recent } }, 7, NOW), [
      { filedOn: "2026-09-29", url: "https://www.sec.gov/Archives/edgar/data/7/000126000001/a.htm" },
    ]);
    assert.equal(deriveSecRestructurings({ nothing: true }, 7, NOW), null);
  });

  it("reads a full year as it stands", () => {
    const cashFlow = [{ start: "2025-07-01", end: PERIOD_END, val: -90e6, filed: "2026-08-20" }];
    const result = deriveSecCompanyFigures(facts({ cashFlow }), NOW);
    assert.equal(result.status === "ok" && result.value.operatingCashFlowTtmUsd, -90e6);
  });

  it("works out a company with no revenue on file from its burn", () => {
    const withoutRevenue = (input: ReturnType<typeof facts>) => ({
      ...input,
      facts: {
        ...input.facts,
        "us-gaap": Object.fromEntries(Object.entries(input.facts["us-gaap"]).filter(([concept]) => !concept.startsWith("Revenue"))),
      },
    });
    const result = deriveSecCompanyFigures(withoutRevenue(facts()), NOW);
    assert.equal(result.status === "ok" && result.value.revenueTtmUsd, 0);
    // Cash coming in with no revenue on file means revenue under a concept this does not read.
    const positive = CASH_FLOW_ROWS.map((row) => ({ ...row, val: Math.abs(row.val) }));
    assert.equal(refusalOf(withoutRevenue(facts({ cashFlow: positive }))), "incomplete-filing");
  });

  it("takes a reported zero over last year's debt, and a mention over nothing", () => {
    const old = { DebtLongtermAndShorttermCombinedAmount: { units: { USD: [{ end: "2025-12-31", val: 130e6, filed: "2026-02-20" }] } } };
    const debtOf = (input: unknown) => {
      const result = deriveSecCompanyFigures(input, NOW);
      return result.status === "ok" ? result.value.debtUsd : "refused";
    };
    const withoutDebt = (input: ReturnType<typeof facts>) => ({
      ...input,
      facts: {
        ...input.facts,
        "us-gaap": Object.fromEntries(Object.entries(input.facts["us-gaap"]).filter(([concept]) => !concept.startsWith("Convertible"))),
      },
    });
    assert.equal(debtOf(withoutDebt(facts())), null);
    assert.equal(debtOf(withoutDebt(facts({ extra: old }))), 130e6);
    const repaid = { LongTermDebt: { units: { USD: [{ end: PERIOD_END, val: 0, filed: "2026-08-01" }] } } };
    assert.equal(debtOf(withoutDebt(facts({ extra: { ...old, ...repaid } }))), 0);
  });

  it("says why a filing cannot stand in for a company's figures", () => {
    assert.equal(refusalOf({ facts: { "ifrs-full": { Revenue: {} }, dei: {} } }), "international-filer");
    assert.equal(refusalOf(facts({ extra: { Deposits: { units: { USD: [] } } } })), "financial-company");
    assert.equal(refusalOf(facts(), new Date("2027-06-01T00:00:00.000Z")), "no-recent-filing");
    assert.equal(refusalOf(facts({ cashFlow: [] })), "incomplete-filing");
    // A half with no comparable half a year earlier is not a year.
    assert.equal(refusalOf(facts({ cashFlow: CASH_FLOW_ROWS.slice(0, 3) })), "incomplete-filing");
    assert.equal(refusalOf(facts({ cash: 0, shortTermInvestments: 0 })), "incomplete-filing");
    assert.equal(refusalOf("not a filing"), "incomplete-filing");
  });
});

describe("looking a company up by ticker", () => {
  const originalFetch = globalThis.fetch;
  let requests: string[] = [];
  let upstream: (url: string) => Response;

  const healthy = (url: string) =>
    url.includes("company_tickers")
      ? Response.json({ "0": { cik_str: 7, ticker: "BRK-B", title: "Fixture Holdings" }, "1": { cik_str: 8, ticker: "DOCU", title: "Fixture Sign" } })
      : Response.json(facts());

  const kv = () => {
    const entries = new Map<string, string>();
    return {
      entries,
      get: async (key: string) => entries.get(key) ?? null,
      put: async (key: string, value: string) => void entries.set(key, value),
    };
  };

  beforeEach(() => {
    requests = [];
    upstream = healthy;
    globalThis.fetch = async (input) => {
      const url = input instanceof Request ? input.url : input.toString();
      requests.push(url);
      return upstream(url);
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("reads a ticker as the SEC lists it, and names the company", async () => {
    const result = await fetchSecCompanyFiling(" brk.b ", { cache: null, now: NOW });
    assert.equal(result.status, "ok");
    assert.equal(result.status === "ok" && result.value.ticker, "BRK-B");
    assert.equal(result.status === "ok" && result.value.name, "Fixture Holdings");
    assert.ok(requests[1]?.includes("CIK0000000007"));
  });

  it("refuses what cannot be a ticker without asking anyone", async () => {
    const result = await fetchSecCompanyFiling("not a ticker!", { cache: null, now: NOW });
    assert.deepEqual(result, { status: "refused", refusal: "unknown-ticker" });
    assert.deepEqual(requests, []);
  });

  it("asks the SEC once per company, unknown tickers included", async () => {
    const cache = kv();
    await fetchSecCompanyFiling("DOCU", { cache, now: NOW });
    await fetchSecCompanyFiling("DOCU", { cache, now: NOW });
    assert.equal(requests.length, 2, "one list read and one filing read");

    requests = [];
    assert.deepEqual(await fetchSecCompanyFiling("ZZZZ", { cache, now: NOW }), { status: "refused", refusal: "unknown-ticker" });
    assert.deepEqual(await fetchSecCompanyFiling("ZZZZ", { cache, now: NOW }), { status: "refused", refusal: "unknown-ticker" });
    assert.equal(requests.length, 1);
  });

  it("does not remember an outage as a fact about the company", async () => {
    const cache = kv();
    upstream = (url) => (url.includes("company_tickers") ? healthy(url) : new Response("busy", { status: 503 }));
    assert.equal((await fetchSecCompanyFiling("DOCU", { cache, now: NOW })).status, "unavailable");
    upstream = healthy;
    assert.equal((await fetchSecCompanyFiling("DOCU", { cache, now: NOW })).status, "ok");
  });

  it("answers with filed numbers and no reading of them", async () => {
    const response = await GET(new Request("https://whether.test/api/company-filing?ticker=DOCU"));
    assert.equal(response.status, 200);
    const body = await response.text();
    const lookup = companyFilingLookupSchema.parse(JSON.parse(body));
    assert.equal(lookup.ok && lookup.filing.ticker, "DOCU");
    assert.doesNotMatch(body, /runway|band|cash first|cushion/i);
  });

  it("answers a failure in the shape the form reads", async () => {
    const unknown = await GET(new Request("https://whether.test/api/company-filing?ticker=ZZZZ"));
    assert.equal(unknown.status, 404);
    assert.deepEqual(companyFilingLookupSchema.parse(await unknown.json()), { ok: false, failure: "unknown-ticker" });

    upstream = () => new Response("busy", { status: 503 });
    const down = await GET(new Request("https://whether.test/api/company-filing?ticker=DOCU"));
    assert.equal(down.status, 503);
    assert.deepEqual(companyFilingLookupSchema.parse(await down.json()), { ok: false, failure: "unavailable" });
  });
});

describe("a filing as the operator's figures", () => {
  const filing = {
    ticker: "RIVN",
    name: "Fixture Motors",
    cashUsd: 3_600e6,
    debtUsd: 100e6,
    longTermInvestmentsUsd: 0,
    revenueTtmUsd: 1_200e6,
    operatingCashFlowTtmUsd: -2_000e6,
    capitalSpendingTtmUsd: 400e6,
    stockCompensationTtmUsd: null,
    researchFiscalYearUsd: null,
    researchPriorFiscalYearUsd: null,
    researchFiscalYearEnd: null,
    revenueGrowth: 0.2,
    periodEnd: PERIOD_END,
  };

  it("fills the fields a reader would type, so net burn is the filing's own", () => {
    const profile = applyCompanyFiling({ version: 1, runwayMonths: 9, sector: "consumer" }, filing, NOW);
    assert.equal(profile.cashUsd, 3_600e6);
    assert.equal(profile.monthlyRevenueUsd, 100e6);
    assert.equal(profile.monthlyBurnUsd, 300e6);
    assert.equal(profile.runwayMonths, undefined);
    assert.equal(profile.sector, "consumer");
    // 20% a year compounds from about 1.5% a month.
    assert.equal(profile.monthlyGrowthPct, 1.5);
    const runway = resolveProfileRunway(profile);
    assert.equal(runway?.basis === "cash" && runway.months, 18);
    assert.equal(runwayBandForProfileRunway(runway), "balanced");
  });

  it("counts capital spending in burn, and falls back to operating cash where none is on file", () => {
    const runwayOf = (capitalSpendingTtmUsd: number | null) => {
      const runway = resolveProfileRunway(applyCompanyFiling({ version: 1 }, { ...filing, capitalSpendingTtmUsd }, NOW));
      return runway?.basis === "cash" ? runway.months : null;
    };
    assert.equal(runwayOf(400e6), 18);
    assert.equal(runwayOf(0), 21.6);
    assert.equal(runwayOf(null), 21.6);
  });

  it("survives being stored, large figures included", () => {
    const huge = applyCompanyFiling({ version: 1 }, { ...filing, revenueTtmUsd: 400e9, operatingCashFlowTtmUsd: 110e9, capitalSpendingTtmUsd: 10e9, cashUsd: 60e9 }, NOW);
    const stored = parseOperatorProfile(JSON.parse(JSON.stringify(huge)));
    assert.equal(stored.monthlyRevenueUsd, huge.monthlyRevenueUsd);
    assert.equal(stored.monthlyBurnUsd, huge.monthlyBurnUsd);
    assert.deepEqual(stored.filing, huge.filing);
    assert.equal(parseOperatorProfile({ version: 1, filing: { ticker: "X" } }).filing, undefined);
  });

  it("gives no cushion to a company owing more than it holds", () => {
    const long = { ...filing, operatingCashFlowTtmUsd: -500e6, capitalSpendingTtmUsd: 100e6 };
    assert.equal(runwayBandForProfileRunway(resolveProfileRunway(applyCompanyFiling({ version: 1 }, long, NOW))), "abundant");
    const owing = applyCompanyFiling({ version: 1 }, { ...long, debtUsd: 5_000e6 }, NOW);
    assert.equal(runwayBandForProfileRunway(resolveProfileRunway(owing)), "balanced");
    // Rivian's shape: less debt than cash, but what is left after it would not last 24 months.
    const close = applyCompanyFiling({ version: 1 }, { ...long, cashUsd: 5_500e6, debtUsd: 4_400e6, operatingCashFlowTtmUsd: -2_600e6, capitalSpendingTtmUsd: 1_600e6 }, NOW);
    assert.equal(runwayBandForProfileRunway(resolveProfileRunway(close)), "balanced");
    // Apple's shape: more debt than cash, less than cash and long-term securities together.
    const apple = { ...filing, cashUsd: 56.7e9, longTermInvestmentsUsd: 80.2e9, debtUsd: 80.1e9, revenueTtmUsd: 400e9, operatingCashFlowTtmUsd: 145e9, capitalSpendingTtmUsd: 9e9, revenueGrowth: 0 };
    assert.equal(resolveProfileRunway(applyCompanyFiling({ version: 1 }, apple, NOW))?.debtLimitsRunway, undefined);
    const covered = { ...filing, operatingCashFlowTtmUsd: 500e6, capitalSpendingTtmUsd: 200e6, revenueGrowth: 0 };
    assert.equal(runwayBandForProfileRunway(resolveProfileRunway(applyCompanyFiling({ version: 1 }, covered, NOW))), "abundant");
    assert.equal(runwayBandForProfileRunway(resolveProfileRunway(applyCompanyFiling({ version: 1 }, { ...covered, debtUsd: 5_000e6 }, NOW))), "balanced");
  });

  it("stops naming the filing once a figure is the reader's own", () => {
    const profile = applyCompanyFiling({ version: 1 }, filing, NOW);
    assert.ok(profile.filing);
    assert.equal(setOperatorProfileField(profile, "cashUsd", 5).filing, undefined);
    assert.equal(setOperatorProfileField(profile, "monthlyRevenueUsd", 5).filing, undefined);
    assert.ok(setOperatorProfileField(profile, "raiseAtRunwayMonths", 9).filing);
  });

  it("names the filing and what it owes", () => {
    const source = { ticker: "RIVN", name: "Fixture Motors", periodEnd: PERIOD_END, debtUsd: 5_000e6, longTermInvestmentsUsd: 0 };
    assert.equal(
      describeProfileFiling(source, false),
      "From Rivian (RIVN), worked out from SEC filings for the period ended Jun 30, 2026. Change any figure to use your own.",
    );
    assert.match(describeProfileFiling(source, true), /It owes \$5B, so the guidance stops short of the 24\+ month band\.$/);
    // Debt not on file says nothing about debt, whatever the flag.
    assert.doesNotMatch(describeProfileFiling({ ...source, debtUsd: null }, true), /owes/);
  });

  it("prints a filed name the way a reader knows it", () => {
    const named = (ticker: string, name: string) =>
      describeProfileFiling({ ticker, name, periodEnd: PERIOD_END, debtUsd: null, longTermInvestmentsUsd: 0 }, false).split(" (")[0];
    assert.equal(named("ZZZ", "BEYOND MEAT, INC."), "From Beyond Meat, Inc.");
    assert.equal(named("ZZZ", "QUALCOMM INC/DE"), "From Qualcomm Inc");
    assert.equal(named("ZZZ", "AMC NETWORKS INC"), "From AMC Networks Inc");
    assert.equal(named("ZZZ", "Fixture Sign"), "From Fixture Sign");
    assert.equal(named("MSFT", "MICROSOFT CORP"), "From Microsoft");
  });
});
