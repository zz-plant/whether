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
  it("reports a visible active link for every route in a header group, nested routes included", () => {
    for (const pathname of ["/", "/signals", "/signals/capital-tightness-watch", "/operate", "/trust", "/history", "/history/compare", "/brief/2026-w31"]) {
      assert.equal(hasVisibleActiveNavLink(pathname), true, pathname);
    }
  });

  /* Guides has no header tab since 2026-11-25, so its pages keep the label beside the wordmark. */
  it("reports none for Guides, utility and unlisted routes, which then keep their label", () => {
    for (const pathname of ["/resources", "/resources/some-article", "/answers/x", "/roles", "/companies", "/research/advice-vs-market", "/about", "/share", "/api-docs"]) {
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
  it("renders flat Forecast ink controls without a clipping dark cage or sky chrome", () => {
    const source = readFileSync(
      new URL("../app/components/globalHeaderActionsClient.tsx", import.meta.url).pathname,
      "utf8",
    );
    const markup = source.replace(/\/\*[\s\S]*?\*\//g, "");

    assert.doesNotMatch(markup, /overflow-hidden/);
    assert.doesNotMatch(markup, /bg-slate-900|border-slate-800|sky-400/);
    assert.match(markup, /weather-focus-ring/, "controls carry the shared focus treatment");
  });
});
