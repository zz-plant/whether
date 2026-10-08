import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FirstVisitExplainer } from "../app/components/homeFirstRunOrientation";
import { canonicalPositioningLine, websiteName } from "../lib/seo";
import type { RegimeKey } from "../lib/regimeEngine";
import { FIRST_TIME_GUIDE_LINES, FIRST_TIME_GUIDE_STEPS } from "../lib/report/reportCopy";
import { navigationLayerByKey } from "../lib/navigation/informationArchitecture";
import { REGIME_LABELS, REGIME_ORDER, REGIME_WEATHER_RATIONALES } from "../lib/regimePresentation";

/*
 * The guide existed and no page rendered it.
 *
 * Three steps with worked examples, four highlights and three next links had
 * been sitting in `reportCopy.ts` since before this component, tested by
 * `tests/reportCopy.test.ts` — which asserted there were exactly three steps and
 * that each carried an example, and never asked whether anyone could read them.
 * That is the shape worth naming: a test is enough to keep an unshipped feature
 * past every gate in this repo, because `check:dead-exports` counts a reference
 * from anywhere and a test counts.
 *
 * So this file asserts the rendered markup, not the constants.
 */

/* React escapes an apostrophe to `&#x27;`, and the steps carry several. Decoded
   here so the assertion compares the copy rather than the encoding. */
const decode = (html: string) =>
  html
    .replaceAll("&#x27;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&");

const markup = (currentRegime?: RegimeKey) =>
  decode(renderToStaticMarkup(<FirstVisitExplainer currentRegime={currentRegime} />));

describe("first-run orientation guide", () => {
  it("renders every step", () => {
    const html = markup();

    for (const step of FIRST_TIME_GUIDE_STEPS) {
      assert.ok(html.includes(step.label), `step "${step.label}" is not on the page`);
      assert.ok(html.includes(step.detail), `step "${step.label}" lost its detail`);
    }
  });

  /*
   * Its first version named steps the page never drew ("Summary", "Proof", "Actions"),
   * pointed at "the score details" and "the planning page", linked "Past snapshots" for the
   * tab called History, and said a stage and runway changed "the notes under the guidance and
   * nothing else" above a picker that says they set the lines.
   */
  it("uses the page's own names, not a second vocabulary", () => {
    const html = markup();

    for (const retired of ["Summary.", "Proof.", "Actions.", "score details", "planning page", "Past snapshots", "nothing else"]) {
      assert.ok(!html.includes(retired), `the guide still says "${retired}"`);
    }
    assert.ok(html.includes("What are you deciding?"), "step two names the picker by its heading");
  });

  it("says what each of the four conditions means, and marks this week's", () => {
    const html = markup("SCARCITY");

    for (const regime of REGIME_ORDER) {
      assert.ok(html.includes(REGIME_LABELS[regime]), `${REGIME_LABELS[regime]} is missing`);
      assert.ok(html.includes(REGIME_WEATHER_RATIONALES[regime]), `${REGIME_LABELS[regime]} lost its meaning`);
    }
    assert.equal((html.match(/This week\./g) ?? []).length, 1, "exactly one condition is marked");
    assert.match(html, new RegExp(`${REGIME_WEATHER_RATIONALES.SCARCITY}<span[^>]*> This week\\.`));
    // An archived week passes no conditions, so nothing claims to be this week's.
    assert.ok(!markup().includes("This week."));
  });

  it("tells the change line from an area's pause and resume lines", () => {
    const html = markup();

    for (const line of FIRST_TIME_GUIDE_LINES) {
      assert.ok(html.includes(line.label), `line "${line.label}" is missing`);
      assert.ok(html.includes(line.detail), `line "${line.label}" lost its detail`);
    }
  });

  /*
   * The guide ends on the tabs a newcomer opens next, named as the header names them and
   * described as the IA describes them. Its own list was a third copy of the IA.
   */
  it("links out to header tabs by their header names", () => {
    const html = markup();

    for (const key of ["planning", "signals", "history"] as const) {
      const layer = navigationLayerByKey[key];
      assert.ok(html.includes(`href="${layer.href}"`), `link missing: ${layer.href}`);
      assert.ok(html.includes(`>${layer.navLabel ?? layer.label}</a>`), `${layer.href} is not labelled with its tab name`);
      assert.ok(html.includes(layer.description), `${layer.href} lost its description`);
    }
  });

  it("keeps the standfirst first and the guide collapsed behind it", () => {
    const html = markup();
    /* The standfirst is the stakes line, not the category tagline: what the
       page will do to a reader's hiring, spend and raise is the reason to read
       the card under it; "Weekly Operating Guidance for Startup Leaders" named
       a shelf. Both come from lib/seo.ts. */
    const standfirst = html.indexOf(canonicalPositioningLine);
    assert.ok(!html.includes(websiteName), "the category tagline is back as the opening line");
    const guide = html.indexOf("How to read this page");

    assert.ok(standfirst >= 0 && guide > standfirst, "the guide displaced the opening line");
    assert.ok(html.includes("<details"), "the guide is not collapsed");
    assert.ok(html.indexOf("read each") > guide, "the longer explanation belongs inside the guide");
    assert.match(html, /aria-label="Dismiss introduction"/, "the compact dismiss control keeps its name");
  });

  it("tells a reader who followed a paste what they are looking at, in the same slot", () => {
    // `?ref=share` is set by the Slack and agenda formats. The opening line
    // changes; nothing is added above or beside it, because this spot is the
    // one thing on `/` addressed to a newcomer and it has grown a second block
    // before. The line says what the page is and names the product once, in
    // the canonical category line. It assumes nothing about who sent the link
    // or what meeting they hold: "a teammate", "operating call" and a Monday
    // calendar hold were all facts about a reader the page cannot know.
    const shared = decode(renderToStaticMarkup(<FirstVisitExplainer arrival="share" />));
    const plain = markup();

    assert.match(shared, /This is this week's guidance from Whether\./);
    assert.ok(shared.includes(canonicalPositioningLine));
    assert.doesNotMatch(shared, /teammate|Monday hold|calendar\.google\.com|operating call/);
    assert.ok(!shared.includes("read each"), "the shared line replaces the standfirst rather than stacking on it");
    assert.equal((shared.match(/<section /g) ?? []).length, 1, "one section, not a banner above one");

    assert.ok(!plain.includes("This is this week"));
    // The guide behind the line is the same either way.
    assert.ok(shared.includes("How to read this page"));
  });
});
