import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RunwayConditionedNotes } from "../app/components/RunwayConditionedNotes";
import { RUNWAY_QUICK_PICKS } from "../lib/report/runwayConditionedNotes";

/*
 * Server-rendered, so the profile is empty: this is what every reader sees
 * before hydration and what a reader with no stored figure sees after it. The
 * panel used to return null here, which made the one line on `/` that
 * translates the call to a company invisible to anyone who had not first
 * found the figure input on /operate.
 */
describe("runway dial on the homepage", () => {
  it("offers the four bands when no runway is stored, and no note", () => {
    const html = renderToStaticMarkup(<RunwayConditionedNotes regime="DEFENSIVE" />);

    assert.match(html, /Translate this call for your runway/);
    for (const pick of RUNWAY_QUICK_PICKS) {
      assert.ok(html.includes(`>${pick.label}</button>`), `band "${pick.label}" is not offered`);
    }
    assert.ok(!html.includes("<li"), "no note may render before a figure is given");
    assert.ok(!html.includes("aria-pressed=\"true\""), "no band is pressed before a figure is given");
  });

  it("keeps the dial a button group, not a navigation", () => {
    // A pick stores a figure; it does not change the page's address. The
    // control is a fieldset of pressed/unpressed buttons rather than links, so
    // a keyboard reaches it and the URL stays the canonical brief.
    const html = renderToStaticMarkup(<RunwayConditionedNotes regime="EXPANSION" />);
    assert.match(html, /<fieldset[^>]*aria-label="Cash runway"/);
    assert.equal((html.match(/<button type="button" aria-pressed="false"/g) ?? []).length, RUNWAY_QUICK_PICKS.length);
    assert.ok(!html.includes("<a "), "the dial must not render as links");
  });
});
