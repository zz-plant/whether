import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GlobalHeaderNavClient, MobileNavContent } from "../app/components/globalHeaderNavClient";
import { resolveGlobalHeaderNavigationLinks } from "../lib/navigation/globalHeader";

describe("GlobalHeaderNavClient", () => {
  it("renders workflow step links and API link", () => {
    const html = renderToStaticMarkup(
      <GlobalHeaderNavClient pathname="/" />,
    );
    assert.ok(html.includes("Brief"), "renders Brief link");
    assert.ok(html.includes("Evidence"), "renders Evidence link");
    assert.ok(html.includes("Plan"), "renders Plan link");
    assert.ok(html.includes("Resolve"), "renders Resolve link");
    assert.ok(html.includes("Trust"), "renders Trust link");
    assert.ok(html.includes("API"), "renders API link");
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
});


