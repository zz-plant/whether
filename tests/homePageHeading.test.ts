import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";

describe("homepage heading contract", () => {
  const source = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

  it("keeps the home route responsible for the page-level h1", () => {
    assert.match(source, /<h1 className="sr-only" id="share-ready-artifact">/);
  });

  it("still names the weekly brief when no cadence is selected", () => {
    // Matches the fallback label, not the operator that selects it — this
    // asserted `: "Weekly Brief"` and so failed when the ternary became a `??`
    // against a shared cadence label, with the rendered heading unchanged.
    assert.match(source, /(\?\?|:) "Weekly Brief"/);
  });

  it("gives the shareable artifact a product-qualified title", () => {
    // The h1 names the page for someone already on it; the copied artifact lands
    // in a channel where "Whether" is the only thing identifying the source.
    assert.match(source, /title: cadenceTitle \?\? "Whether Weekly Brief"/);
  });

  it("names the selected horizon instead when one is", () => {
    assert.match(source, /cadenceCall\.cadenceLabel, cadenceCall\.periodLabel/);
  });
});
