import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { RegimeRadar } from "../app/components/home/RegimeRadar";

/**
 * The radar is the page's picture of "how close are we": two scores, the two
 * boundary lines, and the distance between them. Its geometry is the claim —
 * a marker outside the frame, a trail pointing at the wrong previous reading,
 * or a blank label for an unmodelled regime all say something the data does
 * not. These cases pin the geometry and the fallbacks rather than the styling.
 */
describe("RegimeRadar", () => {
  const base = {
    tightness: 75,
    riskAppetite: 30,
    tightnessThreshold: 60,
    riskAppetiteThreshold: 45,
    currentRegime: "SCARCITY",
  };

  it("names the weather word, the scores and the regime in the accessible name", () => {
    const html = renderToStaticMarkup(<RegimeRadar {...base} />);

    assert.match(html, /aria-label="Conditions radar: freezing, funding pressure 75, risk appetite 30"/);
    assert.match(html, /Funding pressure 75 vs risk appetite 30 \(freezing\)/);
  });

  it("passes an unmodelled regime through instead of rendering a blank label", () => {
    // getRegimePublicLabel returns unknown keys unchanged; the radar must say
    // something a reader can act on, not an empty pair of parentheses.
    const html = renderToStaticMarkup(<RegimeRadar {...base} currentRegime="SOMETHING_ELSE" />);

    assert.match(html, /\(something_else\)/);
  });

  it("keeps the marker inside the frame when a score is outside 0–100", () => {
    // y runs from 14 (top, tightness 100) to 162 (bottom, tightness 0). A
    // reading beyond the range must clamp to the frame, not draw past it.
    const above = renderToStaticMarkup(<RegimeRadar {...base} tightness={120} />);
    const below = renderToStaticMarkup(<RegimeRadar {...base} tightness={-5} />);

    assert.match(above, /cy="14"/);
    assert.match(below, /cy="162"/);
  });

  it("draws the dashed trail only when a previous reading exists", () => {
    const withPrevious = renderToStaticMarkup(
      <RegimeRadar {...base} previousTightness={55} previousRiskAppetite={35} />,
    );
    const withoutPrevious = renderToStaticMarkup(<RegimeRadar {...base} />);

    // The trail dot is the only circle at r=2.5 and the trail line is the only
    // stroke in plain gray.
    assert.match(withPrevious, /r="2\.5"/);
    assert.match(withPrevious, /stroke="#94a3b8"/);
    assert.doesNotMatch(withoutPrevious, /r="2\.5"/);
    assert.doesNotMatch(withoutPrevious, /stroke="#94a3b8"/);
  });

  it("prints the distance to the boundary line only when it has one", () => {
    const close = renderToStaticMarkup(<RegimeRadar {...base} pointsToPause={8} />);
    const far = renderToStaticMarkup(<RegimeRadar {...base} pointsToPause={25} />);
    const none = renderToStaticMarkup(<RegimeRadar {...base} />);

    assert.match(close, /8 points to boundary line/);
    assert.match(close, /text-rose-300/, "a close call reads as emphasized");
    assert.match(far, /25 points to boundary line/);
    assert.doesNotMatch(far, /text-rose-300/);
    assert.doesNotMatch(none, /<figcaption/);
  });

  it("carries accessible title tooltips for threshold boundaries and current position", () => {
    const html = renderToStaticMarkup(<RegimeRadar {...base} />);

    assert.match(html, /<title>Funding pressure boundary at 60<\/title>/);
    assert.match(html, /<title>Risk appetite boundary at 45<\/title>/);
    assert.match(html, /<title>Current reading: Funding pressure 75, Risk appetite 30 \(freezing\)<\/title>/);
  });
});
