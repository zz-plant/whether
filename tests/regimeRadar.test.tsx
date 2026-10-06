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

  it("measures the nearest plotted call-change line, independently of operating pause rules", () => {
    const current = renderToStaticMarkup(
      <RegimeRadar {...base} tightness={90} riskAppetite={47} tightnessThreshold={70} riskAppetiteThreshold={50} />,
    );
    assert.match(current, /3 points to nearest change line/);
    assert.doesNotMatch(current, /0 points to/);

    const horizontal = renderToStaticMarkup(<RegimeRadar {...base} tightness={62} />);
    assert.match(horizontal, /2 points to nearest change line/);

    const onLine = renderToStaticMarkup(<RegimeRadar {...base} riskAppetite={45} />);
    assert.match(onLine, /0 points to nearest change line/);
  });

  it("carries accessible title tooltips for threshold boundaries and current position", () => {
    const html = renderToStaticMarkup(<RegimeRadar {...base} />);

    assert.match(html, /<title>Funding pressure boundary at 60<\/title>/);
    assert.match(html, /<title>Risk appetite boundary at 45<\/title>/);
    assert.match(html, /<title>Current reading: Funding pressure 75, Risk appetite 30 \(freezing\)<\/title>/);
  });
});

/**
 * The brief's map carries the month-ends that led to this reading as a path,
 * so the direction of travel reads before any number does. The path replaces
 * the single earlier dot, ends at the current point, and says what its dots are.
 */
describe("RegimeRadar path", () => {
  const base = {
    tightness: 90,
    riskAppetite: 48,
    tightnessThreshold: 70,
    riskAppetiteThreshold: 50,
    currentRegime: "SCARCITY",
  };
  const trail = [
    { tightness: 40, riskAppetite: 61 },
    { tightness: 50, riskAppetite: 59 },
    { tightness: 63, riskAppetite: 56 },
  ];

  it("joins every month-end to the current point, and drops the single earlier dot", () => {
    const html = renderToStaticMarkup(
      <RegimeRadar {...base} previousTightness={63} previousRiskAppetite={56} trail={trail} />,
    );
    const points = /<polyline points="([^"]+)"/.exec(html)?.[1]?.split(" ") ?? [];
    assert.equal(points.length, trail.length + 1, "the path ends at the current reading");
    assert.equal((html.match(/r="2\.4"/g) ?? []).length, trail.length, "one dot per month-end");
    assert.doesNotMatch(html, /r="2\.5"/, "the single earlier dot is the path's last point, not drawn twice");
  });

  it("states the path's domain and its like-for-like note when it has a path", () => {
    const html = renderToStaticMarkup(
      <RegimeRadar
        {...base}
        trail={trail}
        trailCaption="Path: month-ends Jun–Aug 2026, then now."
        caveat="The Aug 31 scores were built from interest rates alone."
      />,
    );
    assert.match(html, /Path: month-ends Jun–Aug 2026, then now\./);
    assert.match(html, /built from interest rates alone/);
  });

  it("leaves the distance caption to a surface that already states it", () => {
    const html = renderToStaticMarkup(<RegimeRadar {...base} trail={trail} showDistance={false} />);
    assert.doesNotMatch(html, /points to nearest change line/);
    assert.doesNotMatch(html, /<figcaption/, "no empty caption is drawn");
  });
});
