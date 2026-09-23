import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

import { WorkstreamNavFallback } from "../app/components/suspenseFallbacks";
import { WORKSTREAM_NAV_CLASS } from "../app/operate/components/workstreamNavLayout";

const fallbacks = [
  { name: "WorkstreamNavFallback", html: renderToStaticMarkup(<WorkstreamNavFallback />) },
];

describe("suspense fallbacks", () => {
  it("announces itself as a busy region", () => {
    for (const { name, html } of fallbacks) {
      // `<output>` carries an implicit role="status", so either form is a live
      // region. The element is what matters here, not the literal attribute.
      assert.match(html, /(role="status"|^<output|<output )/, `${name} is not a live region`);
      assert.match(html, /aria-busy="true"/, `${name} does not report busy`);
      assert.match(html, /aria-label="[^"]+"/, `${name} has no accessible name`);
    }
  });

  it("uses the skeleton primitive rather than a raw pulse", () => {
    for (const { name, html } of fallbacks) {
      assert.match(html, /weather-skeleton/, `${name} does not use the Skeleton primitive`);
      // Only the primitive's shimmer is disabled under prefers-reduced-motion;
      // Tailwind's animate-pulse keeps animating for people who opted out.
      assert.doesNotMatch(html, /animate-pulse/, `${name} animates under reduced motion`);
    }
  });

  it("mirrors the wrapper of the component it stands in for", () => {
    // Height comes out right by construction when the fallback reuses the real
    // component's outer classes, rather than being guessed at with `h-28`.
    // The class string is shared with the real row, not copied from it, and
    // `<output>` takes no `block` when the row already sets a display.
    assert.ok(fallbacks[0].html.includes(`class="${WORKSTREAM_NAV_CLASS}"`));
    const navSource = readFileSync("app/operate/components/planningWorkstreamNav.tsx", "utf8");
    assert.match(navSource, /className=\{WORKSTREAM_NAV_CLASS\}/, "the switcher reads the same constant");
  });
});

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
