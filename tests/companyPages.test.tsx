import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CompanyNextLinks,
  CompanyPositionSection,
  ConditionsSection,
  RoleDecisionsSection,
} from "../app/companies/companyPageSections";
import { pilotPeerGrowth, readCompanyFigures, refreshCompanyFilings } from "../lib/companies/companyFilingStore";
import { COMPANIES, COMPANY_ROLES, findCompany, findCompanyRole, type CompanyEntry } from "../lib/companies/companyRegistry";
import { findUseCaseRole } from "../lib/decisionDomainCatalog";
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
    assert.match(situation.reading?.[3] ?? "", /ends June 30, and budgets for the next one are usually set/);
    assert.ok(situation.rows.some((row) => row.label === "Debt on file" && row.value === "$35.5B"));
    assert.ok(situation.rows.some((row) => row.label === "Free cash flow, last 12 months" && row.value === "$60B"));
    assert.equal(situation.current, true);
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
    const stored = await readCompanyFigures(oracle, null);
    assert.ok(stored);
    assert.equal(buildCompanySituation(oracle, stored, pilotPeerGrowth(), NOW).reading, null);
    assert.equal(pilotPeerGrowth()?.companies, COMPANIES.length);
  });

  it("says no word about runway or the company's health on any pilot page, and names who it isn't", async () => {
    for (const entry of COMPANIES) {
      const stored = await readCompanyFigures(entry, null);
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
    const stored = await readCompanyFigures(rivian, null);
    assert.ok(stored);
    const html = renderToStaticMarkup(<CompanyPositionSection company={rivian} situation={buildCompanySituation(rivian, stored, pilotPeerGrowth(), NOW)} />);
    assert.doesNotMatch(html, /company-reading|What that changes/);
    assert.match(html, /Cash from operations/);
  });
});

describe("the page sections", () => {
  it("gives every role decisions and rules of its own", () => {
    const seen = new Set<string>();
    for (const role of COMPANY_ROLES) {
      const catalog = findUseCaseRole(role.catalogSlug);
      assert.ok(catalog, role.slug);
      const html = renderToStaticMarkup(
        <RoleDecisionsSection role={role} decisions={catalog.decisions} shifts={catalog.postureShifts} rules={[]} />,
      );
      assert.ok(!seen.has(html), `${role.slug} repeats another role`);
      seen.add(html);
    }
  });

  it("warns on the page when the reading is a saved one, and only then", () => {
    const week = { label: "Cloudy", rationale: "Money is costly.", guidance: "Hold.", recordDateLabel: "Nov 3, 2026" };
    assert.doesNotMatch(renderToStaticMarkup(<ConditionsSection conditions={week} />), /company-saved-copy/);
    const saved = renderToStaticMarkup(<ConditionsSection conditions={{ ...week, savedCopyNotice: "Live data is late." }} />);
    assert.match(saved, /company-saved-copy/);
    assert.match(saved, /Live data is late\./);
  });

  it("says who the guidance is written for, and calls the rules general", () => {
    const html = renderToStaticMarkup(
      <ConditionsSection conditions={{ label: "Cloudy", rationale: "Money is costly.", guidance: "Hold.", recordDateLabel: "Nov 3, 2026" }} />,
    );
    assert.match(html, /written for companies that depend on outside funding/);
  });

  it("prints the shared conditions as shared", () => {
    const html = renderToStaticMarkup(
      <ConditionsSection conditions={{ label: "Cloudy", rationale: "Money is costly.", guidance: "Hold.", recordDateLabel: "Nov 3, 2026" }} />,
    );
    assert.match(html, /Cloudy/);
    assert.match(html, /Every company reads the same conditions/);
  });

  it("links every page onward, and keeps the role when it walks to another company", () => {
    const role = findCompanyRole("product-managers");
    const html = renderToStaticMarkup(<CompanyNextLinks company={company} role={role} />);
    assert.match(html, /href="\/companies\/microsoft"/);
    assert.match(html, /href="\/companies\/microsoft\/engineering-managers"/);
    assert.match(html, /href="\/companies\/google\/product-managers"/);
    assert.match(html, /href="\/"/);
  });

  it("wraps round the end of the list", () => {
    const last = COMPANIES.at(-1);
    assert.ok(last);
    assert.match(renderToStaticMarkup(<CompanyNextLinks company={last} />), /href="\/companies\/microsoft"/);
  });
});

describe("the company list", () => {
  it("has unique slugs and tickers, and bundled figures for each", async () => {
    assert.equal(new Set(COMPANIES.map((entry) => entry.slug)).size, COMPANIES.length);
    assert.equal(new Set(COMPANIES.map((entry) => entry.ticker)).size, COMPANIES.length);
    for (const entry of COMPANIES) assert.ok(await readCompanyFigures(entry, null), entry.ticker);
  });

  it("prefers what the cron stored over the bundled copy", async () => {
    const store = {
      get: async () => JSON.stringify({ ...figures, cashUsd: 1 }),
      put: async () => undefined,
    };
    assert.equal((await readCompanyFigures(company, store))?.cashUsd, 1);
    const empty = { get: async () => null, put: async () => undefined };
    assert.notEqual((await readCompanyFigures(company, empty))?.cashUsd, 1);
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
    globalThis.fetch = async () => Response.json(filed());
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
