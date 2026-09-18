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

    assert.match(html, /What this call means at your runway/);
    /* The invitation, not the caveat. The panel used to open with a sentence
       about browser storage — the first thing a reader was told about a control
       they had no reason to touch was where the value would be kept. */
    assert.match(html, /Pick a band/);
    for (const pick of RUNWAY_QUICK_PICKS) {
      assert.ok(html.includes(`>${pick.label}</span>`), `band "${pick.label}" is not offered`);
    }
    assert.ok(!html.includes("<li"), "no note may render before a figure is given");
    assert.ok(!html.includes("checked=\"\""), "no band is selected before a figure is given");
  });

  it("keeps the dial a radio group, not a navigation", () => {
    // A pick stores a figure; it does not change the page's address. It is the
    // shared segmented control — a native radio group — so a keyboard reaches
    // it and the URL stays the canonical brief.
    const html = renderToStaticMarkup(<RunwayConditionedNotes regime="EXPANSION" />);
    assert.match(html, /<legend class="sr-only">Cash runway<\/legend>/);
    assert.equal((html.match(/<input type="radio"/g) ?? []).length, RUNWAY_QUICK_PICKS.length);
    assert.ok(!html.includes("<a "), "the dial must not render as links");
  });
});
