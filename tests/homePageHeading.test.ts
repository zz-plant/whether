import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";

describe("homepage heading contract", () => {
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const hero = readFileSync(new URL("../app/components/DecisionHero.tsx", import.meta.url), "utf8");

  /*
   * The homepage used to carry a visually hidden `h1` reading "Weekly Brief"
   * while the sentence that states the week's call was an `h2` inside the hero.
   * The one heading a crawler and a screen-reader user meet first said nothing
   * this week that it did not say every week.
   */
  it("makes the visible weekly call the page's h1", () => {
    assert.match(hero, /<h1\s+id="weekly-call-title"/);
    assert.doesNotMatch(hero, /<h2\s+id="weekly-call-title"/);
    assert.doesNotMatch(page, /<h1\b/, "the route no longer renders a competing h1");
  });

  it("anchors the share-ready artifact on the card that is the artifact", () => {
    assert.match(hero, /id="share-ready-artifact"/);
    assert.doesNotMatch(page, /id="share-ready-artifact"/);
  });

  it("still names the horizon on the copied artifact", () => {
    // Matches the fallback label, not the operator that selects it — this
    // asserted `: "Weekly Brief"` and so failed when the ternary became a `??`
    // against a shared cadence label, with the rendered heading unchanged.
    assert.match(page, /title: cadenceTitle \?\? "Whether Weekly Brief"/);
    assert.match(page, /cadenceCall\.cadenceLabel, cadenceCall\.periodLabel/);
  });
});
