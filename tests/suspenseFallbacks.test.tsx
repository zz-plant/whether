import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFileSync } from "node:fs";

/*
 * The shaped fallback this file also checked (`WorkstreamNavFallback`) went with
 * the planning switcher it stood in for on 2026-10-08: the group's sub-tabs are
 * server-rendered (`SectionTabs`) and need no streaming boundary.
 */

describe("suspense boundaries", () => {
  it("keeps raw pulse fallbacks out of the routes that stream", () => {
    for (const route of ["app/page.tsx", "app/operate/page.tsx"]) {
      const source = readFileSync(route, "utf8");
      const inlinePulseFallback = /fallback=\{[^}]*animate-pulse/.test(source);
      assert.equal(inlinePulseFallback, false, `${route} has an inline animate-pulse fallback`);
      assert.equal(
        /fallback=\{null\}/.test(source),
        false,
        `${route} has a fallback that reserves no space`,
      );
    }
  });
});
