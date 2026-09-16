import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildAnswerFaqStructuredData,
  buildApiDocsStructuredData,
  buildCompsStructuredData,
  buildHistoryStructuredData,
  buildPricingStructuredData,
  buildToolkitHowTo,
} from "../lib/seo/pageStructuredData";
import { buildHomeStructuredData } from "../lib/report/home/structuredData";
import { buildPublisherSchema } from "../lib/publisher";
import { organizationId, organizationSameAs, websiteId } from "../lib/seo";
import { pricingPlans } from "../lib/pricing";
import { findToolkitDefinition } from "../lib/decisionDomainCatalog";
import { getPostureArchivePeriods } from "../lib/summary/postureArchive";
import { getPublishedBriefs } from "../lib/report/publishedBriefs";

type Node = Record<string, unknown>;
const nodesOf = (graph: { "@graph": Node[] }, type: string) =>
  graph["@graph"].filter((node) => node["@type"] === type || (Array.isArray(node["@type"]) && node["@type"].includes(type)));
const one = (graph: { "@graph": Node[] }, type: string) => {
  const matches = nodesOf(graph, type);
  assert.equal(matches.length, 1, `exactly one ${type} node`);
  return matches[0];
};

describe("site entities", () => {
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
      buildPricingStructuredData({ plans: pricingPlans, paidPlansOnSale: false }),
      buildCompsStructuredData({ data: null, tickers: ["SNOW"] }),
    ]) {
      const website = one(graph, "WebSite");
      assert.equal(website["@id"], websiteId);
      const page = graph["@graph"].find((node) => node["@type"] === "WebPage" || node["@type"] === "CollectionPage");
      assert.deepEqual(page?.isPartOf, { "@id": websiteId });
    }
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

describe("/pricing", () => {
  it("marks paid plans PreOrder while they are not on sale, and the free plan in stock", () => {
    const graph = buildPricingStructuredData({ plans: pricingPlans, paidPlansOnSale: false });
    const product = one(graph, "Product");
    const offers = product.offers as Array<Record<string, unknown>>;
    assert.equal(offers.length, pricingPlans.length);

    const free = offers.find((offer) => offer.price === 0);
    assert.equal(free?.availability, "https://schema.org/InStock");
    for (const offer of offers.filter((entry) => entry.price !== 0)) {
      assert.equal(offer.availability, "https://schema.org/PreOrder");
      assert.equal(offer.priceCurrency, "USD");
    }
  });

  it("flips to InStock when the plans go on sale", () => {
    const graph = buildPricingStructuredData({ plans: pricingPlans, paidPlansOnSale: true });
    const offers = one(graph, "Product").offers as Array<Record<string, unknown>>;
    assert.ok(offers.every((offer) => offer.availability === "https://schema.org/InStock"));
  });
});

describe("/comps", () => {
  it("declares a dataset only when there is a reading", () => {
    const withData = buildCompsStructuredData({
      data: { medianEvToRevenue: 8.2, medianRevenueGrowth: null, companyCount: 15, fetchedAt: "2026-09-15T14:00:00.000Z", source: "yahoo" },
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
