import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RunwayConditionedNotes } from "../app/components/RunwayConditionedNotes";
import { runwayMonthsForBandPick } from "../lib/report/operatorRunway";

/*
 * Server-rendered, so the profile is empty: this is what every reader sees
 * before hydration and what a reader with no stored figure sees after it.
 */
describe("runway notes on the homepage", () => {
  it("invites a runway and renders no note before one is given", () => {
    const html = renderToStaticMarkup(<RunwayConditionedNotes regime="DEFENSIVE" />);
    assert.match(html, /What this guidance means at your runway/);
    assert.match(html, /Choose your cash runway/);
    assert.ok(!html.includes("<li"), "no note may render before a figure is given");
  });

  it("carries no runway control of its own", () => {
    // The band selector heading the section (the header pill on a phone) is the
    // one runway control. This panel used to render a second four-button
    // picker, banded at 18 months where the selector bands at 24.
    const html = renderToStaticMarkup(<RunwayConditionedNotes regime="EXPANSION" />);
    assert.equal((html.match(/<input type="radio"/g) ?? []).length, 0);
  });
});

describe("picking a runway band", () => {
  it("keeps an entered figure that already sits inside the picked band", () => {
    assert.equal(runwayMonthsForBandPick(13, "balanced"), 13);
  });

  it("stands the band's figure in when the entered one is outside it, and clears on no band", () => {
    assert.equal(runwayMonthsForBandPick(13, "tight"), 9);
    assert.equal(runwayMonthsForBandPick(undefined, "abundant"), 30);
    assert.equal(runwayMonthsForBandPick(13, null), undefined);
  });
});
