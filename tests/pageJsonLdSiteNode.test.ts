import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { organizationId, websiteId } from "../lib/seo";

/*
 * Eleven pages wrote their JSON-LD by hand ("@context" and all), and nine of them carried no
 * `WebSite` node, so the `#website` id other graphs point at resolved against nothing on the page;
 * two described the site inline, with no id, which reads to a parser as a second site. They are
 * built with `graph` (lib/seo/pageStructuredData.ts) now, which puts the site node first. Rendered
 * here, page by page, because the claim is about what a crawler reads.
 */

type Node = Record<string, unknown>;

const documentsIn = (html: string): Node[] =>
  [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));

const nodesOf = (document: Node): Node[] => (Array.isArray(document["@graph"]) ? document["@graph"] : [document]);

const render = async (element: ReactElement | Promise<ReactElement>) => documentsIn(renderToStaticMarkup(await element));

const params = <Value>(value: Value) => ({ params: Promise.resolve(value) });

/** One graph whose first node is the site, and no other node calling itself a website. */
const assertCarriesTheSite = (page: string, documents: Node[]) => {
  const graphs = documents.filter((document) => Array.isArray(document["@graph"]));
  assert.equal(graphs.length, 1, `${page}: one page graph`);
  assert.deepEqual(nodesOf(graphs[0])[0]?.["@id"], websiteId, `${page}: the site node comes first`);
  const websites = documents.flatMap(nodesOf).filter((node) => node["@type"] === "WebSite");
  assert.equal(websites.length, 1, `${page}: one WebSite node`);
  const serialized = JSON.stringify(documents);
  assert.ok(!serialized.includes('"isPartOf":{"@type":"WebSite"'), `${page}: no inline site without an id`);
  return nodesOf(graphs[0]);
};

describe("every hand-built page graph carries the site node", () => {
  it("on /about and /contact, whose page nodes are part of it", async () => {
    for (const [page, path, type] of [
      ["/about", "../app/about/page", "AboutPage"],
      ["/contact", "../app/contact/page", "ContactPage"],
    ] as const) {
      const { default: Page } = await import(path);
      const nodes = assertCarriesTheSite(page, await render(Page()));
      assert.deepEqual(nodes.find((node) => node["@type"] === type)?.isPartOf, { "@id": websiteId }, page);
    }
  });

  it("on /trust, /operate and /signals, built in their page models", async () => {
    const { buildTrustPageModel } = await import("../app/trust/trustPageModel");
    const { buildPlanningPageModel } = await import("../app/operate/planningPageModel");
    const { buildSignalsPageModel } = await import("../app/signals/evidencePageModel");
    const trust = await buildTrustPageModel();
    const planning = await buildPlanningPageModel();
    const signals = await buildSignalsPageModel();

    assertCarriesTheSite("/trust", [JSON.parse(JSON.stringify(trust.reportShellModel.payloads?.structuredData))]);
    for (const [page, document] of [
      ["/operate", planning.reportShellModel.payloads?.structuredData],
      ["/signals", signals.structuredData],
    ] as const) {
      const nodes = assertCarriesTheSite(page, [JSON.parse(JSON.stringify(document))]);
      const webPage = nodes.find((node) => node["@type"] === "WebPage");
      assert.deepEqual(webPage?.isPartOf, { "@id": websiteId }, `${page}: the page names the site by id`);
      assert.deepEqual(webPage?.publisher, { "@id": organizationId }, page);
    }
  });

  // /resolve was checked here until 2026-10-08, when it became a redirect into Decide and Guides.
  it("on the resource pages, a published week and an archive period", async () => {
    const resources = await import("../app/resources/[slug]/page");
    for (const slug of ["capital-discipline-venture-backed-companies", "should-we-freeze-hiring-high-interest-rate-environment"]) {
      const nodes = assertCarriesTheSite(`/resources/${slug}`, await render(resources.default(params({ slug }))));
      assert.ok(nodes.some((node) => node["@type"] === "Article"), slug);
    }
    const article = assertCarriesTheSite(
      "/resources/should-we-freeze-hiring-high-interest-rate-environment",
      await render(resources.default(params({ slug: "should-we-freeze-hiring-high-interest-rate-environment" }))),
    );
    assert.deepEqual(article.map((node) => node["@type"]), ["WebSite", "Article", "FAQPage"], "the article and its FAQ in one graph");

    const brief = await import("../app/brief/[week]/page");
    const [week] = brief.generateStaticParams();
    assertCarriesTheSite(`/brief/${week.week}`, await render(brief.default(params(week))));

    const history = await import("../app/history/[period]/page");
    const [period] = history.generateStaticParams();
    assertCarriesTheSite(`/history/${period.period}`, await render(history.default(params(period))));
  });

  it("but the homepage declares the full site node itself, once", async () => {
    const { buildHomeStructuredData } = await import("../lib/report/home/structuredData");
    const home = buildHomeStructuredData({ headline: "h", description: "d", datePublishedIso: "2026-09-10", dateModifiedIso: "2026-09-15", postureLabel: "p", regimeLabel: "r", confidenceLabel: "c" });
    const websites = home["@graph"].filter((node) => node["@type"] === "WebSite");

    assert.equal(websites.length, 1);
    assert.equal(websites[0]["@id"], websiteId);
    assert.ok("description" in websites[0], "the full node, not the short one `graph` adds");
  });
});
