import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import {
  contentSections,
  navigationLayers,
  navigationLayerByKey,
  navigationLabelByPath,
  primaryNavigationLayers,
  reportShellPaths,
  utilityLinks,
} from "../lib/navigation/informationArchitecture";

describe("navigation information architecture", () => {
  it("keeps the weekly brief as the only primary layer", () => {
    assert.deepEqual(
      primaryNavigationLayers.map((layer) => layer.href),
      ["/"],
    );
  });

  it("keeps demoted hubs reachable as supporting layers", () => {
    for (const href of ["/operate", "/signals", "/resolve", "/trust", "/history", "/history/compare"]) {
      const layer = navigationLayers.find((candidate) => candidate.href === href);
      assert.ok(layer, `${href} stays in the IA layer set`);
      assert.equal(layer!.tier, "supporting", `${href} is reachable but not primary`);
    }
  });

  it("keeps one layer for each IA boundary and route", () => {
    const hrefs = new Set(navigationLayers.map((layer) => layer.href));
    const labels = new Set(navigationLayers.map((layer) => layer.label));

    assert.equal(hrefs.size, navigationLayers.length);
    assert.equal(labels.size, navigationLayers.length);

    assert.equal(navigationLabelByPath["/"], "Weekly Brief");
    assert.equal(navigationLabelByPath["/signals"], "Evidence");
    assert.equal(navigationLabelByPath["/operate"], "Plan");
    assert.equal(navigationLabelByPath["/resolve"], "Resolve");
    assert.equal(navigationLabelByPath["/trust"], "Trust");
  });

  it("derives report shell paths from the IA layers", () => {
    assert.deepEqual(
      reportShellPaths,
      navigationLayers.map((layer) => layer.href),
    );
  });

  it("nests supporting layers under an existing parent", () => {
    for (const layer of navigationLayers) {
      if (layer.tier === "supporting") {
        assert.ok(layer.parentKey, `${layer.key} must declare a parent`);
        assert.ok(navigationLayerByKey[layer.parentKey!], `${layer.key} parent must exist`);
      } else {
        assert.equal(layer.parentKey, undefined);
      }
    }
  });

  it("keeps canonical route transitions for Decide and Method", () => {
    const resolveLayer = navigationLayers.find((layer) => layer.key === "resolve");
    const trustLayer = navigationLayers.find((layer) => layer.key === "trust");
    assert.equal(resolveLayer?.href, "/resolve");
    assert.equal(trustLayer?.href, "/trust");
    assert.equal(resolveLayer?.href.startsWith("#"), false);
    assert.equal(trustLayer?.href.startsWith("#"), false);
  });

  it("matches primary route aliases consistently for active nav state", () => {
    const { pathMatchesLink } = require("../lib/navigation/pathMatching");

    assert.ok(pathMatchesLink("/signals", "/signals"));
    assert.ok(pathMatchesLink("/signals", "/evidence"));
    assert.ok(pathMatchesLink("/signals", "/evidence/capital-tightness-watch"));

    assert.ok(pathMatchesLink("/operate", "/operate"));
    assert.ok(pathMatchesLink("/operate", "/planning"));
    assert.ok(pathMatchesLink("/operate", "/planning/financial"));

    assert.ok(pathMatchesLink("/resolve", "/resolve"));
    assert.ok(pathMatchesLink("/resolve", "/resolve"));
    assert.ok(pathMatchesLink("/resolve", "/answers"));
  });
});

/*
 * The footer used to hand-list its own copy of the utility row. The copies
 * drifted, and /pricing — the only page explaining what costs money — ended up
 * in the IA but not in the footer, reachable solely from a header dropdown.
 */
describe("footer renders the whole utility set", () => {
  it("links every utilityLink", () => {
    const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");

    assert.match(
      layout,
      /utilityLinks\.map\(/,
      "the footer should render utilityLinks rather than restating them",
    );

    for (const link of utilityLinks) {
      assert.doesNotMatch(
        layout,
        new RegExp(`href="${link.href}"`),
        `${link.href} is hard-coded in the footer; render it from utilityLinks instead`,
      );
    }
  });

  it("keeps every indexable utility page in the sitemap", () => {
    const sitemap = readFileSync(new URL("../app/sitemap.ts", import.meta.url), "utf8");
    // /search is deliberately noindex, so it is deliberately not in the sitemap.
    const indexable = utilityLinks.filter((link) => link.href !== "/search");

    for (const link of indexable) {
      assert.ok(
        sitemap.includes(`"${link.href}"`),
        `${link.href} is linked in the footer but missing from the sitemap`,
      );
    }
  });
});

/*
 * The header used to keep a private list of route families that no layer or
 * utility link claimed, which is how it came to read "Whether · Page" on the
 * citable weekly record. The IA module owns that list now.
 */
describe("content sections", () => {
  it("names every routed content family the layers and utilities do not", () => {
    const named = new Set<string>(contentSections.map((section) => section.prefix));
    for (const prefix of ["/answers", "/brief", "/resources", "/toolkits", "/contact"]) {
      assert.ok(named.has(prefix), `${prefix} must be a named content section`);
    }
  });

  it("does not overlap a navigation layer or a utility link", () => {
    const claimed = new Set<string>([
      ...navigationLayers.map((layer) => layer.href),
      ...utilityLinks.map((link) => link.href),
    ]);
    for (const section of contentSections) {
      assert.equal(claimed.has(section.prefix), false, `${section.prefix} is claimed twice`);
    }
  });

  it("keeps the header out of the business of naming routes", () => {
    const header = readFileSync(new URL("../lib/navigation/globalHeader.ts", import.meta.url), "utf8");
    assert.doesNotMatch(header, /sectionRouteLabels/, "the private fallback list is gone");
    assert.match(header, /contentSections/);
  });
});

