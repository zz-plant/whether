import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GlobalHeaderNavClient, MobileNavContent } from "../app/components/globalHeaderNavClient";
import { resolveGlobalHeaderNavigationLinks } from "../lib/navigation/globalHeader";

describe("GlobalHeaderNavClient", () => {
  it("renders the one-screen brief and API link in desktop nav", () => {
    const html = renderToStaticMarkup(
      <GlobalHeaderNavClient pathname="/" />,
    );
    assert.ok(html.includes("Brief"), "renders Brief link");
    assert.ok(html.includes("API"), "renders API link");

    // The four hubs are no longer primary peers; they stay reachable through the
    // mobile drawer as supporting layers under the brief.
    for (const hub of ["Evidence", "Plan", "Resolve", "Trust"]) {
      assert.ok(!html.includes(hub), `desktop nav does not render ${hub} as a primary peer`);
    }
  });

  it("marks API link active when on /api-docs", () => {
    const html = renderToStaticMarkup(
      <GlobalHeaderNavClient pathname="/api-docs" />,
    );
    assert.ok(html.includes('href="/api-docs"'), "renders API link href");
    assert.ok(html.includes('aria-current="page"'), "API link has aria-current page attribute");
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


