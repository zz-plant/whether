import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildAnswerFaqStructuredData,
  buildApiDocsStructuredData,
  buildCompanyPageStructuredData,
  buildCompsStructuredData,
  buildHistoryStructuredData,
  buildHubStructuredData,
  buildPublishedBriefStructuredData,
  buildRolePageStructuredData,
  buildSignalScenarioStructuredData,
  buildSignalWatchStructuredData,
  buildToolkitHowTo,
  buildWorkstreamStructuredData,
  graph as pageGraph,
} from "../lib/seo/pageStructuredData";
import { buildHomeStructuredData } from "../lib/report/home/structuredData";
import { buildPublisherSchema } from "../lib/publisher";
import { organizationId, organizationSameAs, websiteId } from "../lib/seo";
import { findToolkitDefinition } from "../lib/decisionDomainCatalog";
import { getPostureArchivePeriods } from "../lib/summary/postureArchive";
import { getPublishedBriefs } from "../lib/report/publishedBriefs";

type Node = Record<string, unknown>;
const nodesOf = (graph: { "@graph": Node[] }, type: string) =>
  graph["@graph"].filter((node) => node["@type"] === type || (Array.isArray(node["@type"]) && node["@type"].includes(type)));
const one = (graph: { "@graph": Node[] }, type: string) => {
  const [match, ...rest] = nodesOf(graph, type);
  assert.ok(match && rest.length === 0, `exactly one ${type} node`);
  return match;
};

describe("site entities", () => {
  it("identifies the website preview in homepage and page graphs", () => {
    const home = buildHomeStructuredData({
      headline: "h", description: "d", datePublishedIso: "2026-09-10",
      dateModifiedIso: "2026-09-15T12:00:00.000Z", postureLabel: "p", regimeLabel: "r", confidenceLabel: "c",
    });
    for (const graph of [home, buildApiDocsStructuredData(), buildCompsStructuredData({ data: null, tickers: ["SNOW"] })]) {
      assert.equal(one(graph, "WebSite").image, "https://whether.work/api/og?template=report");
    }
  });

  it("anchors the organization to its public profiles on the homepage and in every publisher node", () => {
    const home = buildHomeStructuredData({
      headline: "h",
      description: "d",
      datePublishedIso: "2026-09-10",
      dateModifiedIso: "2026-09-15T12:00:00.000Z",
      postureLabel: "p",
      regimeLabel: "r",
      confidenceLabel: "c",
    });
    const organization = one(home, "Organization");
    assert.deepEqual(organization.sameAs, [...organizationSameAs]);
    assert.equal(organization["@id"], organizationId);

    const publisher = buildPublisherSchema("Whether");
    assert.equal(publisher["@id"], organizationId);
    assert.deepEqual(publisher.sameAs, [...organizationSameAs]);
  });

  it("joins every page graph to the site entity by id", () => {
    for (const graph of [
      buildApiDocsStructuredData(),
      buildCompsStructuredData({ data: null, tickers: ["SNOW"] }),
    ]) {
      const website = one(graph, "WebSite");
      assert.equal(website["@id"], websiteId);
      const page = graph["@graph"].find((node) => node["@type"] === "WebPage" || node["@type"] === "CollectionPage");
      assert.deepEqual(page?.isPartOf, { "@id": websiteId });
    }
  });
});

/** Every `{ "@id": … }` reference in a graph that no node on the same page declares. */
const danglingReferences = (document: { "@graph": Node[] }) => {
  const declared = new Set<unknown>();
  const referenced = new Set<unknown>();
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== "object") return;
    const entries = Object.entries(value);
    const id = entries.find(([key]) => key === "@id")?.[1];
    if (id !== undefined) (entries.length === 1 ? referenced : declared).add(id);
    entries.forEach(([, child]) => walk(child));
  };
  walk(document);
  return [...referenced].filter((id) => !declared.has(id));
};

const microsoftPage = (overrides: { audience?: string } = {}) =>
  buildCompanyPageStructuredData({
    path: "/companies/microsoft/product-managers",
    title: "Product managers at Microsoft: this week's conditions",
    description: "What this week's conditions mean.",
    company: "Microsoft",
    ticker: "MSFT",
    cik: 789019,
    trail: [{ name: "Companies", path: "/companies" }],
    dateModifiedIso: "2026-11-03",
    ...overrides,
  });

describe("references", () => {
  /* 351 pages published `publisher: { "@id": organizationId }` with no Organization node on the
     page, against the rule at the top of pageStructuredData.ts. A crawl found it; no suite could. */
  it("resolves every id on the page that declares it", () => {
    const documents = {
      company: microsoftPage(),
      role: buildRolePageStructuredData({ path: "/roles/product-managers", title: "t", role: "Product managers", trail: [], dateModifiedIso: "2026-11-03" }),
      hub: buildHubStructuredData({ path: "/companies", name: "n", description: "d", items: [{ path: "/companies/microsoft", name: "Microsoft" }] }),
      watch: buildSignalWatchStructuredData({ slug: "yield-curve-flip-watch", name: "n", description: "d", scenarios: [], dateModifiedIso: "2026-11-03" }),
      scenario: buildSignalScenarioStructuredData({ slug: "yield-curve-flip-watch", signalTitle: "s", area: "hiring", name: "n", description: "d", dateModifiedIso: "2026-11-03" }),
      workstream: pageGraph([buildWorkstreamStructuredData({ path: "/operate/financial", name: "n", description: "d", applicationCategory: "FinanceApplication" })]),
    };
    for (const [name, document] of Object.entries(documents)) {
      assert.deepEqual(danglingReferences(document), [], name);
    }
  });
});

describe("topics", () => {
  const sameAsOf = (about: unknown) =>
    (Array.isArray(about) ? about : []).map((topic: { sameAs?: string }) => topic.sameAs);

  it("ties a signal watch to what it reads", () => {
    const page = one(buildSignalWatchStructuredData({ slug: "yield-curve-flip-watch", name: "n", description: "d", scenarios: [{ path: "/signals/yield-curve-flip-watch/hiring", name: "h" }], dateModifiedIso: "2026-11-03" }), "CollectionPage");
    assert.deepEqual(sameAsOf(page.about), ["https://en.wikipedia.org/wiki/Yield_curve"]);
    assert.equal(page.dateModified, "2026-11-03");
  });

  it("ties a scenario page to the signal and the decision", () => {
    const page = one(buildSignalScenarioStructuredData({ slug: "risk-appetite-watch", signalTitle: "s", area: "capital-raising", name: "n", description: "d", dateModifiedIso: "2026-11-03" }), "WebPage");
    assert.deepEqual(sameAsOf(page.about), ["https://en.wikipedia.org/wiki/Risk_aversion", "https://en.wikipedia.org/wiki/Venture_capital"]);
  });

  it("names no topic for a decision with no exact article", () => {
    const page = one(buildSignalScenarioStructuredData({ slug: "unknown", signalTitle: "s", area: "expansion-bets", name: "n", description: "d", dateModifiedIso: "2026-11-03" }), "WebPage");
    assert.deepEqual(page.about, []);
  });

  it("ties an answer to the decisions it maps to and says who it is for", () => {
    const page = one(buildAnswerFaqStructuredData({
      slug: "s", question: "q", answer: "a",
      payload: { triggerThreshold: "t", reversalCondition: "r" },
      datePublishedIso: "2026-11-03", dateModifiedIso: "2026-11-03",
      areas: ["hiring", "burn-discipline"], audience: "CEO/CFO",
    }), "FAQPage");
    assert.deepEqual(sameAsOf(page.about), ["https://en.wikipedia.org/wiki/Recruitment", "https://en.wikipedia.org/wiki/Burn_rate"]);
    assert.deepEqual(page.audience, { "@type": "Audience", audienceType: "CEO/CFO" });
  });
});

describe("company pages", () => {
  it("identifies the company by its SEC registrant number", () => {
    const about = one(microsoftPage(), "WebPage").about;
    assert.deepEqual(about, {
      "@type": "Corporation",
      name: "Microsoft",
      tickerSymbol: "MSFT",
      identifier: { "@type": "PropertyValue", propertyID: "SEC CIK", value: "789019" },
      sameAs: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000789019",
    });
  });

  it("names the role only on a role page, and dates the page by its reading", () => {
    assert.equal(one(microsoftPage(), "WebPage").audience, undefined);
    const page = one(microsoftPage({ audience: "Product managers" }), "WebPage");
    assert.deepEqual(page.audience, { "@type": "Audience", audienceType: "Product managers" });
    assert.equal(page.dateModified, "2026-11-03");
  });
});

describe("hubs", () => {
  it("lists what the hub links, numbered, with absolute URLs", () => {
    const page = one(buildHubStructuredData({ path: "/companies", name: "n", description: "d", items: [{ path: "/companies/microsoft", name: "Microsoft" }] }), "CollectionPage");
    assert.deepEqual(page.mainEntity, {
      "@type": "ItemList",
      numberOfItems: 1,
      itemListElement: [{ "@type": "ListItem", position: 1, url: "https://whether.work/companies/microsoft", name: "Microsoft" }],
    });
  });
});

describe("/history", () => {
  it("lists every archive period and published week under the regime-history dataset", () => {
    const periods = getPostureArchivePeriods();
    const briefs = getPublishedBriefs();
    const graph = buildHistoryStructuredData({ periods, publishedBriefs: briefs, coverage: { from: "2012-01-31", to: "2026-08-31" } });

    const list = one(graph, "ItemList");
    assert.equal(list.numberOfItems, periods.length + briefs.length);
    const dataset = one(graph, "Dataset");
    assert.equal(dataset.temporalCoverage, "2012-01-31/2026-08-31");
    const page = one(graph, "CollectionPage");
    assert.deepEqual(page.mainEntity, { "@id": dataset["@id"] });
  });

  it("omits coverage when the record is empty rather than inventing a range", () => {
    const graph = buildHistoryStructuredData({ periods: [], publishedBriefs: [], coverage: null });
    assert.equal("temporalCoverage" in one(graph, "Dataset"), false);
  });
});

describe("/comps", () => {
  it("declares a dataset only when there is a reading", () => {
    const withData = buildCompsStructuredData({
      data: { medianEvToRevenue: 8.2, medianRevenueGrowth: null, companyCount: 15, growthCompanyCount: 15, fetchedAt: "2026-09-15T14:00:00.000Z", source: "yahoo" },
      tickers: ["SNOW", "SHOP"],
    });
    const dataset = one(withData, "Dataset");
    assert.equal(dataset.temporalCoverage, "2026-09-15");
    const measured = dataset.variableMeasured as Array<{ name: string }>;
    assert.deepEqual(measured.map((entry) => entry.name), ["Median EV / revenue", "Companies in basket"]);

    const outage = buildCompsStructuredData({ data: null, tickers: ["SNOW"] });
    assert.equal(nodesOf(outage, "Dataset").length, 0);
    assert.equal("mainEntity" in one(outage, "WebPage"), false);
  });
});

describe("/api-docs", () => {
  it("describes the API as a WebAPI documented by the page", () => {
    const graph = buildApiDocsStructuredData();
    const api = one(graph, "WebAPI");
    assert.match(String(api.documentation), /\/api-docs$/);
    assert.equal((api.provider as Node)["@id"], organizationId);
  });
});

describe("/toolkits/[slug]", () => {
  it("turns the run sequence into HowTo steps with a parsed duration", () => {
    const toolkit = findToolkitDefinition("pmf");
    assert.ok(toolkit);
    const graph = buildToolkitHowTo(toolkit);
    const howTo = one(graph, "HowTo");
    const steps = howTo.step as Array<Record<string, unknown>>;
    assert.equal(steps.length, toolkit.runSequence.length);
    assert.equal((howTo.supply as unknown[]).length, toolkit.prepChecklist.length);
    assert.match(String(howTo.totalTime), /^PT\d+[MH]$/);
  });

  it("omits totalTime when the runtime copy is not a duration", () => {
    const graph = buildToolkitHowTo({
      slug: "x",
      title: "X",
      whenToUse: "w",
      timeToRun: "one working session",
      prepChecklist: [],
      runSequence: [{ phase: "p", objective: "o", prompts: ["q"], deliverable: "d" }],
    });
    assert.equal("totalTime" in one(graph, "HowTo"), false);
  });
});

describe("/answers/[slug]", () => {
  it("carries author, publisher, dates, and the threshold question", () => {
    const graph = buildAnswerFaqStructuredData({
      slug: "should-startups-hire-engineers-right-now",
      question: "Should startups hire engineers right now?",
      answer: "Selectively.",
      payload: { triggerThreshold: "Pause if tightness > 70.", reversalCondition: "Resume after two easing reads." },
      datePublishedIso: "2026-09-10",
      dateModifiedIso: "2026-09-15T12:00:00.000Z",
    });
    const faq = one(graph, "FAQPage");
    assert.equal(faq.datePublished, "2026-09-10");
    assert.equal(faq.dateModified, "2026-09-15T12:00:00.000Z");
    assert.equal((faq.publisher as Node)["@id"], organizationId);
    assert.equal((faq.author as Node)["@type"], "Person");
    const questions = faq.mainEntity as Array<{ name: string }>;
    assert.equal(questions.length, 2);
    assert.equal(questions[1].name, "What would change this answer?");
  });
});

describe("/brief/[week]", () => {
  it("declares a news article, as an issue of the periodical, with temporalCoverage and keywords", () => {
    const briefs = getPublishedBriefs();
    const brief = briefs[0];
    assert.ok(brief);
    const graph = buildPublishedBriefStructuredData({
      brief,
      canonicalUrl: `https://whether.work/brief/${brief.slug}`,
      imageUrl: `https://whether.work/brief/${brief.slug}/opengraph-image`,
      headline: "Test headline",
      description: "Test description",
      dateModified: "2026-12-01T00:00:00.000Z",
    });
    const article = one(graph, "NewsArticle");
    assert.equal(article.headline, "Test headline");
    assert.equal(article.datePublished, brief.publishedAt);
    assert.equal(article.dateModified, "2026-12-01T00:00:00.000Z");
    assert.deepEqual(article.isPartOf, {
      "@type": "PublicationIssue",
      issueNumber: brief.slug,
      datePublished: brief.publishedAt,
      isPartOf: {
        "@type": "Periodical",
        name: "Whether Weekly Brief",
        url: "https://whether.work/history",
        publisher: { "@id": organizationId },
      },
    });
    assert.equal(article.temporalCoverage, `${brief.recordDate}/${brief.recordDate}`);
    assert.ok(Array.isArray(article.keywords));
  });
});
