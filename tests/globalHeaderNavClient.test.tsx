import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GlobalHeaderNavClient, MobileNavContent } from "../app/components/globalHeaderNavClient";
import { resolveGlobalHeaderNavigationLinks } from "../lib/navigation/globalHeader";

describe("GlobalHeaderNavClient", () => {
  it("renders the operator loop in IA order in desktop nav, without a top-level API link", () => {
    const html = renderToStaticMarkup(
      <GlobalHeaderNavClient pathname="/" />,
    );
    const primaryNav = html.slice(html.indexOf('aria-label="Primary"'), html.indexOf("<details"));
    assert.ok(primaryNav.includes("Weekly Brief"), "renders Brief link");

    const positions = ["Plan", "Evidence", "Resolve", "Trust", "History"].map((label) => {
      const index = primaryNav.indexOf(`>${label}<`);
      assert.ok(index > -1, `desktop nav renders ${label}`);
      return index;
    });
    assert.deepEqual(positions, [...positions].sort((a, b) => a - b), "loop links keep IA order");
    assert.ok(!primaryNav.includes('href="/api-docs"'), "API is not a top-level nav item");
  });

  it("marks the matching loop link active on a nested report route", () => {
    const html = renderToStaticMarkup(
      <GlobalHeaderNavClient pathname="/signals/thresholds" />,
    );
    const primaryNav = html.slice(html.indexOf('aria-label="Primary"'), html.indexOf("<details"));
    assert.match(
      primaryNav,
      /<a[^>]*href="\/signals"[^>]*aria-current="page"|<a[^>]*aria-current="page"[^>]*href="\/signals"/,
      "Evidence link is current",
    );
    assert.equal(primaryNav.split('aria-current="page"').length - 1, 1, "exactly one loop link is active");
  });

  it("renders resource and framework section in mobile navigation content", () => {
    const navigationLinks = resolveGlobalHeaderNavigationLinks("/");
    const html = renderToStaticMarkup(
      <MobileNavContent navigationLinks={navigationLinks} currentPathname="/" onClose={() => {}} />,
    );
    assert.ok(html.includes("Resources &amp; Framework") || html.includes("Resources & Framework"), "includes mobile resource section title");
    assert.ok(html.includes("Framework"), "includes Framework link");
    assert.ok(html.includes("Template"), "includes Template link");
    assert.ok(html.includes("About"), "includes About link");
  });

  it("nests demoted hubs as supporting layers under the brief in mobile", () => {
    const navigationLinks = resolveGlobalHeaderNavigationLinks("/");
    const html = renderToStaticMarkup(
      <MobileNavContent navigationLinks={navigationLinks} currentPathname="/" onClose={() => {}} />,
    );
    for (const hub of ["Evidence", "Plan", "Resolve", "Trust"]) {
      assert.ok(html.includes(hub), `mobile drawer keeps ${hub} reachable under the brief`);
    }
  });
});


