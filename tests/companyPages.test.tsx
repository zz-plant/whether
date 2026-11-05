import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CompanyNextLinks,
  CompanyPositionSection,
  ConditionsSection,
  RoleDecisionsSection,
} from "../app/companies/companyPageSections";
import { readCompanyFigures, refreshCompanyFilings } from "../lib/companies/companyFilingStore";
import { COMPANIES, COMPANY_ROLES, findCompany, findCompanyRole, type CompanyEntry } from "../lib/companies/companyRegistry";
import { findUseCaseRole } from "../lib/decisionDomainCatalog";
import { buildCompanySituation } from "../lib/report/companySituation";
import { companyFactsFixture } from "./fixtures/marketData";

const NOW = new Date("2026-11-04T12:00:00.000Z");
const figures = {
  cashUsd: 64.5e9,
  debtUsd: 35.5e9,
  revenueTtmUsd: 346e9,
  operatingCashFlowTtmUsd: 196e9,
  revenueGrowth: 0.19,
  periodEnd: "2026-09-30",
};
const microsoft = findCompany("microsoft");
if (!microsoft) throw new Error("the list lost Microsoft");
const company: CompanyEntry = microsoft;

describe("what a page says beside a company's name", () => {
  it("reads a company generating cash", () => {
    const situation = buildCompanySituation(company, figures, NOW);
    assert.match(situation.reading?.[0] ?? "", /budgets and priorities/);
    assert.match(situation.reading?.[1] ?? "", /grew 19%/);
    assert.match(situation.reading?.[2] ?? "", /ends June 30/);
    assert.ok(situation.rows.some((row) => row.label === "Debt on file" && row.value === "$35.5B"));
    assert.equal(situation.current, true);
  });

  it("lets the figures stand alone for a company using cash or carrying heavy debt", () => {
    assert.equal(buildCompanySituation(company, { ...figures, operatingCashFlowTtmUsd: -2e9 }, NOW).reading, null);
    assert.equal(buildCompanySituation(company, { ...figures, operatingCashFlowTtmUsd: 0 }, NOW).reading, null);
    assert.equal(buildCompanySituation(company, { ...figures, debtUsd: 600e9 }, NOW).reading, null);
    assert.ok(buildCompanySituation(company, { ...figures, debtUsd: null }, NOW).reading);
  });

  it("prints nothing for debt that is not on file, rather than none", () => {
    const situation = buildCompanySituation(company, { ...figures, debtUsd: null }, NOW);
    assert.ok(!situation.rows.some((row) => row.label === "Debt on file"));
  });

  it("stops standing behind an old filing", () => {
    assert.equal(buildCompanySituation(company, { ...figures, periodEnd: "2026-01-01" }, NOW).current, false);
  });

  it("says no word about runway or the company's health on any pilot page, and names who it isn't", async () => {
    for (const entry of COMPANIES) {
      const stored = await readCompanyFigures(entry, null);
      assert.ok(stored, `${entry.name} has no bundled figures`);
      const situation = buildCompanySituation(entry, stored, NOW);
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
    const html = renderToStaticMarkup(<CompanyPositionSection company={rivian} situation={buildCompanySituation(rivian, stored, NOW)} />);
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
