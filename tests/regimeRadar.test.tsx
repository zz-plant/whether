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

  /* The distance to the nearer line is the trust strip's margin, printed once on the
     page; the map printed it again as a caption (2026-10-09). What the map states in
     words is each change line's value, at the line, and the four sides for a screen
     reader: the definition the one-line legend gives where the map is not drawn. */
  it("labels each change line with its value and defines the four sides, without restating the margin", () => {
    const html = renderToStaticMarkup(
      <RegimeRadar {...base} tightness={90} riskAppetite={47} tightnessThreshold={70} riskAppetiteThreshold={50} />,
    );
    assert.match(html, /data-change-line="tightness"[^>]*>70<\/text>/);
    assert.match(html, /data-change-line="riskAppetite"[^>]*>50<\/text>/);
    assert.doesNotMatch(html, /to the nearest change line/);
    assert.match(
      html,
      /<p class="sr-only">Funding pressure above 70 and risk appetite below 50: Freezing\. Above 70 and above 50: Cloudy\. Below 70 and below 50: Stormy\. Below 70 and above 50: Sunny\.<\/p>/,
    );
  });

  it("carries accessible title tooltips for threshold boundaries and current position", () => {
    const html = renderToStaticMarkup(<RegimeRadar {...base} />);

    assert.match(html, /<title>Funding pressure change line at 60<\/title>/);
    assert.match(html, /<title>Risk appetite change line at 45<\/title>/);
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
        trailCaption="Trail: month-ends Jun–Aug 2026, then this week."
        caveat="The Aug 31 scores were built from interest rates alone."
      />,
    );
    assert.match(html, /Trail: month-ends Jun–Aug 2026, then this week\./);
    assert.match(html, /built from interest rates alone/);
  });

  it("draws no empty caption", () => {
    const html = renderToStaticMarkup(<RegimeRadar {...base} trail={trail} />);
    assert.doesNotMatch(html, /<figcaption/, "no empty caption is drawn");
    const withFooter = renderToStaticMarkup(<RegimeRadar {...base} footer={<span>How they are set</span>} />);
    assert.match(withFooter, /<figcaption[\s\S]*How they are set[\s\S]*<\/figcaption>/, "the footer closes the caption");
  });
});
