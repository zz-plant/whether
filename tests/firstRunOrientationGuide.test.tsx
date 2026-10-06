import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FirstVisitExplainer } from "../app/components/homeFirstRunOrientation";
import { canonicalPositioningLine, websiteName } from "../lib/seo";
import {
  FIRST_TIME_GUIDE_HIGHLIGHTS,
  FIRST_TIME_GUIDE_NEXT_LINKS,
  FIRST_TIME_GUIDE_STEPS,
} from "../lib/report/reportCopy";

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

/* React escapes an apostrophe to `&#x27;`, and one highlight has one. Decoded
   here so the assertion compares the copy rather than the encoding. */
const decode = (html: string) =>
  html
    .replaceAll("&#x27;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&");

const markup = () => decode(renderToStaticMarkup(<FirstVisitExplainer />));

describe("first-run orientation guide", () => {
  it("renders every step, with the example that makes it concrete", () => {
    const html = markup();

    for (const step of FIRST_TIME_GUIDE_STEPS) {
      assert.ok(html.includes(step.label), `step "${step.label}" is not on the page`);
      assert.ok(html.includes(step.example), `step "${step.label}" lost its example`);
    }
  });

  it("renders the highlights and the links out", () => {
    const html = markup();

    for (const highlight of FIRST_TIME_GUIDE_HIGHLIGHTS) {
      assert.ok(html.includes(highlight.text), `highlight missing: ${highlight.text}`);
    }
    for (const link of FIRST_TIME_GUIDE_NEXT_LINKS) {
      assert.ok(html.includes(`href="${link.href}"`), `link missing: ${link.href}`);
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

  /*
   * The one in-page target it has. `#executive-snapshot` was the original, and
   * no page has ever rendered that id — the guide was never rendered either, so
   * nobody could click it and find out.
   */
  it("points its in-page link at a section the homepage renders", () => {
    const inPage = FIRST_TIME_GUIDE_NEXT_LINKS.filter((link) => link.href.startsWith("#"));

    assert.deepEqual(inPage.map((link) => link.href), ["#weekly-call"]);
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
