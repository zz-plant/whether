import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GlobalHeaderNavRail } from "../app/components/globalHeaderNavClient";
import { resolveGlobalHeaderNavigationLinks } from "../lib/navigation/globalHeader";

describe("GlobalHeaderNavRail", () => {
  it("surfaces explicit compact-nav scroll affordances", () => {
    const html = renderToStaticMarkup(
      <GlobalHeaderNavRail
        navigationLinks={resolveGlobalHeaderNavigationLinks("/signals")}
        activeRouteLabel="Evidence"
        variant="compact"
        onIntent={() => {}}
      />,
    );

    assert.match(html, /Navigation/);
    assert.match(html, /Evidence/);
    assert.match(html, /aria-label="Previous surface"/);
    assert.match(html, /aria-label="Next surface"/);
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
    assert.match(html, /Open navigation, then swipe or use the arrows to move between the main pages\./);
    assert.match(html, /aria-label="Previous surface"/);
    assert.match(html, /aria-label="Next surface"/);
  });
});
