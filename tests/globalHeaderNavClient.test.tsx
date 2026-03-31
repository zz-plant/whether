import assert from "node:assert/strict";
import { describe, it } from "node:test";
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

    assert.match(html, /Surface 2 of 5/);
    assert.match(html, /Swipe or tap arrows to see every primary surface\./);
    assert.match(html, /aria-label="Previous surface"/);
    assert.match(html, /aria-label="Next surface"/);
  });

  it("explains how to open and traverse the default mobile rail", () => {
    const html = renderToStaticMarkup(
      <GlobalHeaderNavRail
        navigationLinks={resolveGlobalHeaderNavigationLinks("/")}
        activeRouteLabel="Weekly Brief"
        onIntent={() => {}}
      />,
    );

    assert.match(html, /Browse sections/);
    assert.match(html, /Open sections, then swipe or tap arrows to move across the primary surfaces\./);
    assert.match(html, /aria-label="Previous surface"/);
    assert.match(html, /aria-label="Next surface"/);
  });
});
