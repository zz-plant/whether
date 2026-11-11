import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CompanyNextLinks,
  CompanyPositionSection,
  RoleDecisionsSection,
  WeekConditionsLines,
} from "../app/companies/companyPageSections";
import { pilotPeerGrowth, readCompanyRecord, refreshCompanyFilings } from "../lib/companies/companyFilingStore";
import { COMPANIES, findCompany, type CompanyEntry } from "../lib/companies/companyRegistry";
import { askForThisWeek, COMPANY_ROLES, findCompanyRole, paybackBarLine } from "../lib/report/companyRoles";
import { findLeadAnswerForArea } from "../app/answers/decisionPages";
import { buildCanonicalBoundedDecisionRules } from "../lib/report/boundedDecisionRules";
import { DEFAULT_THRESHOLDS } from "../lib/regimeEngineCore";
import type { SecCompanyFigures } from "../lib/marketData/secEdgar";
import { buildCompanySituation } from "../lib/report/companySituation";
import { companyFactsFixture } from "./fixtures/marketData";

const NOW = new Date("2026-11-04T12:00:00.000Z");
const figures = {
  cashUsd: 64.5e9,
  debtUsd: 35.5e9,
  debtAsOf: "2026-09-30",
  longTermInvestmentsUsd: 37.8e9,
  revenueTtmUsd: 346e9,
  operatingCashFlowTtmUsd: 196e9,
  capitalSpendingTtmUsd: 136e9,
  stockCompensationTtmUsd: 12.6e9,
  researchFiscalYearUsd: 35.6e9,
  researchPriorFiscalYearUsd: 32.5e9,
  researchFiscalYearEnd: "2026-06-30",
  revenueGrowth: 0.19,
  periodEnd: "2026-09-30",
};
const microsoft = findCompany("microsoft");
if (!microsoft) throw new Error("the list lost Microsoft");
const company: CompanyEntry = microsoft;

describe("what a page says beside a company's name", () => {
  const peers = { median: 0.17, companies: 50 };

  it("reads a company whose cash covers its capital spending, in facts", () => {
    const situation = buildCompanySituation(company, figures, peers, NOW);
    assert.match(situation.reading?.[0] ?? "", /covered capital spending with \$60B left over\. Capital spending took 69% of it\./);
    assert.match(situation.reading?.[1] ?? "", /budgets and priorities/);
    assert.equal(situation.reading?.[2], "Revenue grew 19% in the latest quarter on a year earlier, above the 17% median of these 50 companies.");
    assert.equal(situation.budgetCalendar, "Its next fiscal year starts around Jul 1, 2027, about 8 months away. Budgets for it are usually set in the months before.");
    assert.ok(situation.rows.some((row) => row.label === "R&D, fiscal year ended Jun 30, 2026" && row.value === "$35.6B, up 10%"));
    assert.ok(situation.rows.some((row) => row.label === "Stock pay, last 12 months" && row.value === "$12.6B"));
    assert.ok(situation.rows.some((row) => row.label === "Debt on file" && row.value === "$35.5B"));
    assert.ok(situation.rows.some((row) => row.label === "Free cash flow, last 12 months" && row.value === "$60B"));
    assert.equal(situation.current, true);
  });

  it("dates the budget calendar from today, whatever the company's cash", () => {
    const calendarOn = (date: string) => buildCompanySituation(company, figures, peers, new Date(`${date}T12:00:00.000Z`)).budgetCalendar;
    assert.match(calendarOn("2026-03-15") ?? "", /Jul 1, 2026, about 4 months away\. Budgets for it are usually being set about now\./);
    assert.match(calendarOn("2026-06-20") ?? "", /Jul 1, 2026, about a month away/);
    assert.match(calendarOn("2026-07-02") ?? "", /Jul 1, 2027, about 12 months away\. Budgets for it are usually set in the months before\./);
    assert.ok(buildCompanySituation(company, { ...figures, operatingCashFlowTtmUsd: -2e9 }, peers, NOW).budgetCalendar);
    const unreadable = { ...company, fiscalYearEnd: "" };
    assert.equal(buildCompanySituation(unreadable, figures, peers, NOW).budgetCalendar, null);
  });

  it("prints R&D falling as plainly as rising, and nothing when it is not on file", () => {
    const row = (changes: Partial<SecCompanyFigures>) =>
      buildCompanySituation(company, { ...figures, ...changes }, peers, NOW).rows.find((entry) => entry.label.startsWith("R&D"))?.value;
    assert.equal(row({ researchFiscalYearUsd: 13.8e9, researchPriorFiscalYearUsd: 16.5e9 }), "$13.8B, down 16%");
    assert.equal(row({ researchPriorFiscalYearUsd: null }), "$35.6B");
    assert.equal(row({ researchFiscalYearUsd: null, researchFiscalYearEnd: null }), undefined);
  });

  it("lists restructuring filings from the last year, and says nothing without one", () => {
    const filing = (filedOn: string) => ({ filedOn, url: `https://www.sec.gov/Archives/${filedOn}.htm` });
    const listed = buildCompanySituation(company, { ...figures, restructurings: [filing("2026-10-06"), filing("2025-10-01")] }, peers, NOW);
    assert.deepEqual(listed.restructurings, [{ filedOn: "Oct 6, 2026", url: "https://www.sec.gov/Archives/2026-10-06.htm" }]);
    const html = renderToStaticMarkup(<CompanyPositionSection company={company} situation={listed} />);
    assert.match(html, /Restructuring filings, last 12 months/);
    assert.match(html, /Filed Oct 6, 2026 \(8-K item 2\.05\)/);
    assert.match(html, /it may not say how many people/);
    assert.doesNotMatch(html, /layoff/i);
    const none = renderToStaticMarkup(<CompanyPositionSection company={company} situation={buildCompanySituation(company, figures, peers, NOW)} />);
    assert.doesNotMatch(none, /company-restructurings|Restructuring|restructur/i);
  });

  it("states growth against the median, and claims nothing about what it does for new work", () => {
    const sentence = (revenueGrowth: number) => buildCompanySituation(company, { ...figures, revenueGrowth }, peers, NOW).reading?.[2];
    assert.match(sentence(0.05) ?? "", /grew 5%.*below the 17% median/);
    assert.match(sentence(-0.08) ?? "", /fell 8%.*below the 17% median/);
    assert.match(sentence(0.17) ?? "", /grew 17%.*in line with the 17% median/);
    for (const growth of [0.5, 0.05, -0.2]) {
      assert.doesNotMatch(buildCompanySituation(company, { ...figures, revenueGrowth: growth }, peers, NOW).reading?.join(" ") ?? "", /usually gives|higher bar|likely to compete/);
    }
    assert.equal(buildCompanySituation(company, figures, null, NOW).reading?.some((line) => line.includes("median")), false);
  });

  it("lets the figures stand alone without free cash flow, or with heavy debt", () => {
    const standsAlone = (changes: Partial<SecCompanyFigures>) =>
      buildCompanySituation(company, { ...figures, ...changes }, peers, NOW).reading;
    assert.equal(standsAlone({ operatingCashFlowTtmUsd: -2e9 }), null);
    // Oracle's shape: plenty from operations, more than all of it spent on capital.
    assert.equal(standsAlone({ operatingCashFlowTtmUsd: 46.9e9, capitalSpendingTtmUsd: 75.7e9 }), null);
    // No capital spending on file means free cash flow isn't known, not that it is all of it.
    assert.equal(standsAlone({ capitalSpendingTtmUsd: null }), null);
    assert.equal(standsAlone({ debtUsd: 600e9 }), null);
    // Debt is read net of what the company holds: Google owes $126B and holds more.
    assert.ok(standsAlone({ debtUsd: 126e9, cashUsd: 265e9, operatingCashFlowTtmUsd: 179e9, capitalSpendingTtmUsd: 160e9 }));
  });

  it("dates a debt figure older than the period, and prints nothing when none is on file", () => {
    const older = buildCompanySituation(company, { ...figures, debtAsOf: "2026-05-31" }, peers, NOW);
    assert.ok(older.rows.some((row) => row.label === "Debt on file, as of May 31, 2026"));
    const none = buildCompanySituation(company, { ...figures, debtUsd: null, debtAsOf: null }, peers, NOW);
    assert.ok(!none.rows.some((row) => row.label.startsWith("Debt on file")));
  });

  it("stops standing behind an old filing", () => {
    assert.equal(buildCompanySituation(company, { ...figures, periodEnd: "2026-01-01" }, peers, NOW).current, false);
  });

  it("reads no pilot company whose capital spending outruns its cash, and takes the median from the list", async () => {
    const oracle = findCompany("oracle");
    assert.ok(oracle);
    const stored = await readCompanyRecord(oracle, null);
    assert.ok(stored);
    assert.equal(buildCompanySituation(oracle, stored, pilotPeerGrowth(), NOW).reading, null);
    assert.equal(pilotPeerGrowth()?.companies, COMPANIES.length);
  });

  it("says no word about runway or the company's health on any pilot page, and names who it isn't", async () => {
    for (const entry of COMPANIES) {
      const stored = await readCompanyRecord(entry, null);
      assert.ok(stored, `${entry.name} has no bundled figures`);
      const situation = buildCompanySituation(entry, stored, pilotPeerGrowth(), NOW);
      const html = renderToStaticMarkup(<CompanyPositionSection company={entry} situation={situation} />);
      assert.doesNotMatch(html, /runway|cushion|cash first|solven|bankrupt|distress|at risk|months of cash/i, entry.name);
      assert.ok(html.includes(`isn&#x27;t affiliated with ${entry.name}`), entry.name);
    }
  });

  it("gives a loss-making company no reading on the page", async () => {
    const rivian = findCompany("rivian");
    assert.ok(rivian);
    const stored = await readCompanyRecord(rivian, null);
    assert.ok(stored);
    const html = renderToStaticMarkup(<CompanyPositionSection company={rivian} situation={buildCompanySituation(rivian, stored, pilotPeerGrowth(), NOW)} />);
    assert.doesNotMatch(html, /company-reading|What that changes/);
    assert.match(html, /Cash from operations/);
  });
});

describe("the page sections", () => {
  it("gives every role decisions and an ask of its own, under every condition", () => {
    const seen = new Set<string>();
    for (const role of COMPANY_ROLES) {
      for (const decision of role.decisions) {
        assert.ok(!seen.has(decision), `${role.slug} repeats "${decision}"`);
        seen.add(decision);
      }
      for (const regime of ["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"] as const) {
        assert.ok(askForThisWeek(role, regime).length > 0);
      }
      const asks = new Set(Object.values(role.askFor));
      assert.equal(asks.size, 3, `${role.slug} gives the same ask under different conditions`);
    }
    assert.equal(new Set(COMPANY_ROLES.map((role) => role.slug)).size, COMPANY_ROLES.length);
  });

  it("asks for less when conditions are tight, and prints the rule's own bar", () => {
    const engineers = findCompanyRole("software-engineers");
    assert.ok(engineers);
    assert.equal(askForThisWeek(engineers, "SCARCITY"), askForThisWeek(engineers, "DEFENSIVE"));
    assert.notEqual(askForThisWeek(engineers, "DEFENSIVE"), askForThisWeek(engineers, "EXPANSION"));
    assert.match(paybackBarLine("DEFENSIVE"), /more than 12 months/);
    assert.match(paybackBarLine("EXPANSION"), /no payback bar/);
    const html = renderToStaticMarkup(
      <RoleDecisionsSection role={engineers} askFor={askForThisWeek(engineers, "DEFENSIVE")} paybackBar={paybackBarLine("DEFENSIVE")} rules={[]} />,
    );
    assert.match(html, /What to ask for this week/);
    assert.match(html, /Which project to attach yourself to/);
  });

  it("links each general rule to the answer that argues it", () => {
    const role = findCompanyRole("software-engineers");
    assert.ok(role);
    const lead = findLeadAnswerForArea("hiring");
    assert.ok(lead);
    const hiringRules = buildCanonicalBoundedDecisionRules({
      regime: "DEFENSIVE",
      thresholds: DEFAULT_THRESHOLDS,
      scores: { tightness: 72, riskAppetite: 42 },
    }).filter((rule) => rule.area === "hiring");
    assert.equal(hiringRules.length, 1);
    const html = renderToStaticMarkup(
      <RoleDecisionsSection role={role} askFor="a" paybackBar="b" rules={hiringRules} />,
    );
    assert.ok(html.includes(`href="/answers/${lead.slug}"`), "the hiring rule links its answer");
  });

  it("marks the reading's date up as a date", () => {
    const html = renderToStaticMarkup(
      <WeekConditionsLines conditions={{ label: "Cloudy", rationale: "Money is costly.", guidance: "Hold.", recordDateLabel: "Nov 3, 2026", recordDateIso: "2026-11-03" }} />,
    );
    assert.match(html, /<time dateTime="2026-11-03">Nov 3, 2026<\/time>/);
  });

  it("warns on the page when the reading is a saved one, and only then", () => {
    const week = { label: "Cloudy", rationale: "Money is costly.", guidance: "Hold.", recordDateLabel: "Nov 3, 2026", recordDateIso: "2026-11-03" };
    assert.doesNotMatch(renderToStaticMarkup(<WeekConditionsLines conditions={week} />), /company-saved-copy/);
    const saved = renderToStaticMarkup(<WeekConditionsLines conditions={{ ...week, savedCopyNotice: "Live data is late." }} />);
    assert.match(saved, /company-saved-copy/);
    assert.match(saved, /Live data is late\./);
  });

  it("says who the guidance is written for, and calls the rules general", () => {
    const html = renderToStaticMarkup(
      <WeekConditionsLines conditions={{ label: "Cloudy", rationale: "Money is costly.", guidance: "Hold.", recordDateLabel: "Nov 3, 2026", recordDateIso: "2026-11-03" }} />,
    );
    assert.match(html, /written for companies that depend on outside funding/);
  });

  it("prints the shared conditions as shared, and links the brief they come from", () => {
    const html = renderToStaticMarkup(
      <WeekConditionsLines conditions={{ label: "Cloudy", rationale: "Money is costly.", guidance: "Hold.", recordDateLabel: "Nov 3, 2026", recordDateIso: "2026-11-03" }} />,
    );
    assert.match(html, /Cloudy/);
    assert.match(html, /Every company reads the same conditions/);
    assert.match(html, /href="\/"/, "every company and role page links back to the brief");
  });

  it("walks the role to other companies, and to the role at any company", () => {
    const role = findCompanyRole("product-managers");
    assert.ok(role);
    const html = renderToStaticMarkup(<CompanyNextLinks company={company} role={role} />);
    assert.match(html, /href="\/companies\/google\/product-managers"/);
    assert.match(html, /href="\/roles\/product-managers"/);
  });

  it("wraps round the end of the list", () => {
    const last = COMPANIES.at(-1);
    const role = findCompanyRole("product-managers");
    assert.ok(last && role);
    assert.match(renderToStaticMarkup(<CompanyNextLinks company={last} role={role} />), /href="\/companies\/microsoft\/product-managers"/);
  });
});

describe("the company list", () => {
  it("has unique slugs and tickers, and bundled figures for each", async () => {
    assert.equal(new Set(COMPANIES.map((entry) => entry.slug)).size, COMPANIES.length);
    assert.equal(new Set(COMPANIES.map((entry) => entry.ticker)).size, COMPANIES.length);
    for (const entry of COMPANIES) assert.ok(await readCompanyRecord(entry, null), entry.ticker);
  });

  it("prefers what the cron stored over the bundled copy", async () => {
    const store = {
      get: async () => JSON.stringify({ ...figures, cashUsd: 1, restructurings: [] }),
      put: async () => undefined,
    };
    assert.equal((await readCompanyRecord(company, store))?.cashUsd, 1);
    const empty = { get: async () => null, put: async () => undefined };
    assert.notEqual((await readCompanyRecord(company, empty))?.cashUsd, 1);
  });
});

describe("refreshing the stored filings", () => {
  const originalFetch = globalThis.fetch;
  const store = () => {
    const entries = new Map<string, string>();
    return { entries, get: async (key: string) => entries.get(key) ?? null, put: async (key: string, value: string) => void entries.set(key, value) };
  };
  const filed = () => {
    const fixture = companyFactsFixture({ latestQuarterEnd: "2026-09-30" });
    return {
      ...fixture,
      facts: {
        ...fixture.facts,
        "us-gaap": {
          ...fixture.facts["us-gaap"],
          NetCashProvidedByUsedInOperatingActivities: {
            units: { USD: [{ start: "2025-10-01", end: "2026-09-30", val: 5e6, filed: "2026-10-20" }] },
          },
        },
      },
    };
  };

  it("does nothing without a store", async () => {
    assert.deepEqual(await refreshCompanyFilings({ store: null, now: NOW }), { ok: true, refreshed: 0 });
  });

  it("stores a few companies a run, and every company comes round", async () => {
    globalThis.fetch = async (input) =>
      Response.json(
        (input instanceof Request ? input.url : input.toString()).includes("/submissions/")
          ? { filings: { recent: { form: [], filingDate: [], items: [], accessionNumber: [], primaryDocument: [] } } }
          : filed(),
      );
    try {
      const kv = store();
      for (let day = 0; day < 7; day += 1) {
        const result = await refreshCompanyFilings({ store: kv, now: new Date(NOW.getTime() + day * 86_400_000) });
        assert.equal(result.refreshed, 8);
      }
      assert.equal(kv.entries.size, COMPANIES.length);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("stores nothing for a company whose restructuring filings could not be read", async () => {
    globalThis.fetch = async (input) =>
      (input instanceof Request ? input.url : input.toString()).includes("/submissions/")
        ? new Response("busy", { status: 503 })
        : Response.json(filed());
    try {
      const kv = store();
      const result = await refreshCompanyFilings({ store: kv, now: NOW });
      assert.equal(result.ok, false);
      assert.equal(kv.entries.size, 0, "a record without that read would say the company had filed none");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("keeps the last good figures through an outage, and says so", async () => {
    globalThis.fetch = async () => new Response("busy", { status: 503 });
    try {
      const kv = store();
      const result = await refreshCompanyFilings({ store: kv, now: NOW });
      assert.equal(result.ok, false);
      assert.equal(kv.entries.size, 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
