import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { hasVisibleActiveNavLink, resolveGlobalHeaderRouteLabel } from "../lib/navigation/globalHeader";

/**
 * The header may drop the route label beside the wordmark only where a group
 * tab marks the route. Every grouped page and route family does; utility and
 * legal routes — `/about`, `/share`, `/api-docs` — sit outside the groups, so the
 * label comes back for those.
 */

describe("route context in the global header", () => {
  it("reports a visible active link for every grouped route, nested routes included", () => {
    for (const pathname of ["/", "/signals", "/signals/capital-tightness-watch", "/operate", "/trust", "/history", "/history/compare", "/brief/2026-w31", "/resources/some-article", "/answers/x"]) {
      assert.equal(hasVisibleActiveNavLink(pathname), true, pathname);
    }
  });

  it("reports none for utility and unlisted routes, which then keep their label", () => {
    for (const pathname of ["/about", "/share", "/api-docs"]) {
      assert.equal(hasVisibleActiveNavLink(pathname), false, pathname);
      // Whatever the header falls back to must actually name something.
      const label = resolveGlobalHeaderRouteLabel(pathname);
      assert.ok(label && label !== "Page", `${pathname} resolves a label`);
    }
  });

  it("renders that fallback in the header, gated on the same helper", () => {
    const gate = readFileSync(
      new URL("../app/components/globalHeaderRouteGate.tsx", import.meta.url).pathname,
      "utf8",
    ).replace(/\/\*[\s\S]*?\*\//g, "");

    assert.match(gate, /hasVisibleActiveNavLink\(pathname\)/);
    assert.match(gate, /fallbackRouteLabel/);
  });
});

describe("the header action group does not clip its children", () => {
  it("rounds through the end cells rather than overflow-hidden", () => {
    const source = readFileSync(
      new URL("../app/components/globalHeaderActionsClient.tsx", import.meta.url).pathname,
      "utf8",
    );
    const markup = source.replace(/\/\*[\s\S]*?\*\//g, "");

    // `.weather-pill:focus-visible` draws an outward 2px outline plus a halo
    // from unlayered CSS, so a clipping ancestor cuts the ring's top and bottom.
    assert.doesNotMatch(markup, /overflow-hidden/);
    assert.match(markup, /rounded-l-\[7px\]/);
    assert.match(markup, /rounded-r-\[7px\]/);
    // Every child that brings its own focus treatment is pulled inward.
    assert.match(markup, /!outline-offset-\[-2px\]/, "theme toggle takes the inward ring");
    assert.match(markup, /focus-visible:outline-offset-\[-2px\]"/, "present mode takes the inward ring");
  });
});
