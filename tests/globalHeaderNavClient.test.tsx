import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GlobalHeaderNavRail } from "../app/components/globalHeaderNavClient";
import { resolveGlobalHeaderNavigationLinks } from "../lib/navigation/globalHeader";

describe("GlobalHeaderNavRail", () => {
  it("keeps the compact rail focused on workspace switching", () => {
    const html = renderToStaticMarkup(
      <GlobalHeaderNavRail
        navigationLinks={resolveGlobalHeaderNavigationLinks("/signals")}
        activeRouteLabel="Evidence"
        variant="compact"
        onIntent={() => {}}
      />,
    );

    assert.match(html, /Primary routes/);
    assert.match(html, />Decision Tools</);
    assert.match(html, /min-h-\[40px\]/);
    assert.match(html, /rounded-full/);
    assert.doesNotMatch(html, /aria-label="Previous surface"/);
    assert.doesNotMatch(html, /aria-label="Next surface"/);
    assert.doesNotMatch(html, /Browse workflow/);
  });

  it("explains how to open and traverse the default mobile rail", () => {
    const html = renderToStaticMarkup(
      <GlobalHeaderNavRail
        navigationLinks={resolveGlobalHeaderNavigationLinks("/")}
        activeRouteLabel="Brief"
        onIntent={() => {}}
      />,
    );

    assert.match(html, /Open navigation/);
    assert.match(html, /Open navigation to move between the main pages\./);
    assert.match(html, /aria-label="Previous surface"/);
    assert.match(html, /aria-label="Next surface"/);
  });
});
