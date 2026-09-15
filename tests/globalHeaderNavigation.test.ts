import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  normalizePathname,
  resolveGlobalHeaderNavigationLinks,
  resolveGlobalHeaderRouteLabel,
} from "../lib/navigation/globalHeader";

describe("global header navigation helpers", () => {
  it("normalizes trailing slash paths", () => {
    assert.equal(normalizePathname("/signals/"), "/signals");
    assert.equal(normalizePathname("/"), "/");
  });

  it("uses canonical IA labels for condensed report route context", () => {
    assert.equal(resolveGlobalHeaderRouteLabel("/signals/thresholds"), "Evidence");
    assert.equal(resolveGlobalHeaderRouteLabel("/operate/cli"), "Plan");
    assert.equal(resolveGlobalHeaderRouteLabel("/resolve/use-cases"), "Resolve");
    assert.equal(resolveGlobalHeaderRouteLabel("/trust"), "Trust");
    assert.equal(resolveGlobalHeaderRouteLabel("/nonexistent"), "Page");
  });

  it("labels utility routes without adding them to the operator loop", () => {
    // /threshold and /template are permanent redirects into /trust; the
    // framework is a section of the trust page rather than a route of its own.
    assert.equal(resolveGlobalHeaderRouteLabel("/threshold"), "Page");
    assert.equal(resolveGlobalHeaderRouteLabel("/template"), "Page");
    assert.equal(resolveGlobalHeaderRouteLabel("/api-docs"), "API & MCP");
    assert.equal(resolveGlobalHeaderRouteLabel("/about"), "About");
    assert.equal(resolveGlobalHeaderRouteLabel("/about/"), "About");
  });

  it("does not match a utility label on an unrelated path that merely shares a prefix", () => {
    assert.equal(resolveGlobalHeaderRouteLabel("/thresholdish"), "Page");
    assert.equal(resolveGlobalHeaderRouteLabel("/templating"), "Page");
  });

  it("names every public route rather than falling back to \"Page\"", () => {
    // These five families matched no navigation layer and no utility link, so
    // the header read "Whether · Page" on them — including /brief/<week>, the
    // frozen, citable record this product asks people to link to.
    assert.equal(resolveGlobalHeaderRouteLabel("/brief/2026-w31"), "Published brief");
    assert.equal(resolveGlobalHeaderRouteLabel("/answers/should-startups-hire-now"), "Answer");
    assert.equal(resolveGlobalHeaderRouteLabel("/resources/anything"), "Resource");
    assert.equal(resolveGlobalHeaderRouteLabel("/toolkits/anything/cluster"), "Toolkit");
    assert.equal(resolveGlobalHeaderRouteLabel("/contact"), "Contact");
  });

  it("does not let a section label shadow a real navigation layer", () => {
    // /resolve is the Resolve layer; /answers is the direct-answer pages. A
    // prefix match must not confuse the two in either direction.
    assert.equal(resolveGlobalHeaderRouteLabel("/resolve"), "Resolve");
    assert.equal(resolveGlobalHeaderRouteLabel("/resolve/use-cases"), "Resolve");
    assert.equal(resolveGlobalHeaderRouteLabel("/signals/thresholds"), "Evidence");
    assert.equal(resolveGlobalHeaderRouteLabel("/history/2024"), "History");
  });

  it("marks the brief active only on the home route", () => {
    const homeLinks = resolveGlobalHeaderNavigationLinks("/").filter((link) => link.isActive);
    assert.equal(homeLinks.length, 1);
    assert.equal(homeLinks[0]?.href, "/");

    // Demoted report routes are not primary, so no primary link is active there;
    // the one-screen brief stays the single primary destination.
    const reportLinks = resolveGlobalHeaderNavigationLinks("/resolve/use-cases").filter((link) => link.isActive);
    assert.equal(reportLinks.length, 0);
  });
});
