import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { Breadcrumbs } from "../app/components/ui/breadcrumbs";
import SignalsClusterPage from "../app/signals/[cluster]/page";
import { signalScenarioRoutes } from "../app/seoRouteClusters";
import { siteUrl } from "../lib/siteUrl";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";

serveUnreachableUpstreams();

/*
 * Two things a crawler needs that the 2026-09-23 audit found missing: a way to
 * reach a sitemap URL from a page, and a breadcrumb it can read as data.
 */
describe("breadcrumbs", () => {
  it("describe the trail they draw, as structured data", () => {
    const html = renderToStaticMarkup(
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "History", href: "/history" },
          { label: "Week of Sep 15, 2026" },
        ]}
      />,
    );
    const json = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)?.[1];
    assert.ok(json, "a visible trail carries a BreadcrumbList");
    const data = JSON.parse(json);
    assert.equal(data["@type"], "BreadcrumbList");
    assert.deepEqual(
      data.itemListElement.map((entry: { name: string }) => entry.name),
      ["Home", "History", "Week of Sep 15, 2026"],
    );
    assert.equal(data.itemListElement[1].item, `${siteUrl}/history`);
    assert.equal(data.itemListElement[2].item, undefined, "the current page is the unlinked last crumb");
  });

  it("emit nothing for a trail with an unlinked crumb before the last", () => {
    const html = renderToStaticMarkup(<Breadcrumbs items={[{ label: "Home" }, { label: "Here" }]} />);
    assert.doesNotMatch(html, /ld\+json/);
  });
});

describe("signal hubs", () => {
  it("link every decision page the sitemap submits beneath them", async () => {
    const clusters = [...new Set(signalScenarioRoutes.map((route) => route.signalSlug))];
    for (const cluster of clusters) {
      const html = renderToStaticMarkup(await SignalsClusterPage({ params: Promise.resolve({ cluster }) }));
      for (const route of signalScenarioRoutes.filter((entry) => entry.signalSlug === cluster)) {
        assert.ok(
          html.includes(`href="/signals/${cluster}/${route.decisionScenario}"`),
          `/signals/${cluster} does not link /signals/${cluster}/${route.decisionScenario}`,
        );
      }
    }
  });
});
