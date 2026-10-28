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

  it("lights the week's quadrant and dims the other three", () => {
    const html = renderToStaticMarkup(<RegimeRadar {...base} />);

    assert.equal(html.match(/data-active=""/g)?.length, 1);
    assert.match(html, /opacity="1" data-quadrant="SCARCITY" data-active=""/);
    assert.equal(html.match(/opacity="0.45"/g)?.length, 3);
  });

  it("dims nothing for an unmodelled regime", () => {
    const html = renderToStaticMarkup(<RegimeRadar {...base} currentRegime="SOMETHING_ELSE" />);

    assert.doesNotMatch(html, /data-active|opacity="0.45"/);
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
    // dashed stroke in the muted ink.
    const previousTrail = /stroke="var\(--app-text-muted\)" stroke-width="1\.2" stroke-dasharray="2 2"/;
    assert.match(withPrevious, /r="2\.5"/);
    assert.match(withPrevious, previousTrail);
    assert.doesNotMatch(withoutPrevious, /r="2\.5"/);
    assert.doesNotMatch(withoutPrevious, previousTrail);
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

  /* The scenario studio draws this map with a hypothetical as the filled dot
     and this week's reading as the hollow one — the same filled/hollow pair
     its ladders use. The two points must be named, or a reader of the markup
     (and a tooltip user) cannot tell which is which (2026-10-22). */
  it("names both points when a surface passes labels for them", () => {
    const html = renderToStaticMarkup(
      <RegimeRadar {...base} previousTightness={55} previousRiskAppetite={35} primaryLabel="Simulated reading" previousLabel="This week" />,
    );

    assert.match(html, /<title>Simulated reading: Funding pressure 75, Risk appetite 30 \(freezing\)<\/title>/);
    assert.match(html, /<title>This week: Funding pressure 55, Risk appetite 35<\/title>/);
  });

  it("keeps the default point name when no label is passed", () => {
    const html = renderToStaticMarkup(
      <RegimeRadar {...base} previousTightness={55} previousRiskAppetite={35} />,
    );

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

  it("keeps close month-end hover targets from covering one another", () => {
    const html = renderToStaticMarkup(<RegimeRadar {...base} trail={[
      { tightness: 40, riskAppetite: 61, label: "April 2026" },
      { tightness: 40, riskAppetite: 59, label: "May 2026" },
    ]} />);
    const targets = [...html.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)" fill="transparent"/g)];
    assert.equal(targets.length, 2);
    const [a, b] = targets;
    assert.ok(a && b);
    const distance = Math.hypot(Number(a[1]) - Number(b[1]), Number(a[2]) - Number(b[2]));
    assert.ok(Number(a[3]) + Number(b[3]) <= distance + 0.00001, "neither target may mask its neighbor's date");
  });

  it("offers the dated readings in HTML for touch, keyboard and screen-reader users", () => {
    const html = renderToStaticMarkup(<RegimeRadar {...base} trail={[
      { tightness: 40, riskAppetite: 61, label: "April 2026" },
      { tightness: 40, riskAppetite: 59, label: "May 2026" },
    ]} />);
    const caption = /<figcaption[\s\S]*<\/figcaption>/.exec(html)?.[0] ?? "";
    assert.match(caption, /<summary[^>]*>Scores on this chart<\/summary>/);
    assert.match(caption, /April 2026: Funding pressure 40, Risk appetite 61/);
    assert.match(caption, /May 2026: Funding pressure 40, Risk appetite 59/);
    assert.match(caption, /Current reading: Funding pressure 90, Risk appetite 48/);
  });

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

  it("always says which corner is easiest and which hardest", () => {
    // The four words are not a severity scale (2026-10-14), so the caption
    // always carries the orientation, and is never empty.
    const html = renderToStaticMarkup(<RegimeRadar {...base} trail={trail} />);
    assert.match(html, /<figcaption[\s\S]*Sunny, bottom right, is the easiest; Freezing, top left, the hardest\.[\s\S]*<\/figcaption>/);
    const withFooter = renderToStaticMarkup(<RegimeRadar {...base} footer={<span>How they are set</span>} />);
    assert.match(withFooter, /<figcaption[\s\S]*How they are set[\s\S]*<\/figcaption>/, "the footer closes the caption");
  });
});
