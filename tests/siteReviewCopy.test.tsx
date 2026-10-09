import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { RegimeRadar } from "../app/components/home/RegimeRadar";
import { formatWeekMondayUTC } from "../lib/formatters";
import { buildPublishedBriefTitle, findPublishedBrief } from "../lib/report/publishedBriefs";

/*
 * Findings from the live site review on 2026-10-09, each held where it was found.
 * The larger ones (vocabulary, margin, the headline action, the record counts, the
 * homepage order) have files of their own; these are the small ones.
 */

const visibleText = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

describe("site review copy fixes", () => {
  /* Every report route streams its Suspense fallback first, so a sentence in it
     ("Loading evidence: Checking what changed…") was the first text a crawler
     indexed there. The fallbacks keep their names in attributes. */
  it("streams no loading sentence in a route's server fallback", async () => {
    const routes = ["", "answers/", "operate/", "signals/", "trust/"];
    for (const route of routes) {
      const { default: Loading } = await import(`../app/${route}loading`);
      const html = renderToStaticMarkup(<Loading />);
      assert.equal(visibleText(html), "", `/${route}loading renders text: ${visibleText(html)}`);
      assert.doesNotMatch(html, /Loading|Preparing|Checking/, `/${route}loading still says it is loading, in its markup`);
      assert.match(html, /aria-busy="true"/, `/${route}loading still marks itself busy`);
    }
  });

  it("counts one point in the singular under the conditions chart", () => {
    const render = (riskAppetite: number) =>
      visibleText(
        renderToStaticMarkup(
          <RegimeRadar
            tightness={90}
            riskAppetite={riskAppetite}
            tightnessThreshold={70}
            riskAppetiteThreshold={50}
            currentRegime="SCARCITY"
          />,
        ),
      );
    assert.match(render(49), /\b1 point to the nearest change line/);
    assert.match(render(46), /\b4 points to the nearest change line/);
    assert.doesNotMatch(render(49), /boundary/i);
  });

  /* The homepage said "Week of Oct 7, 2026" (the reading's Wednesday) and the brief
     "week of Oct 6" (its record's Tuesday). A week is named by its Monday now. */
  it("names a week by its Monday", () => {
    for (const day of ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-11"]) {
      assert.equal(formatWeekMondayUTC(day), "Oct 5, 2026", day);
    }
    const w41 = findPublishedBrief("2026-w41");
    assert.ok(w41, "the w41 record exists");
    assert.match(buildPublishedBriefTitle(w41), /the week of Oct 5, 2026$/);
  });

  /* "Governance Resources" over an image titled "Governance Pillars Emblem", and a
     blurb that "aligns risk, spend, and sequencing through confirmation logic,
     thresholds, and reversible governance artifacts". */
  it("calls /resources Guides, and its framework blurbs say what the reader gets", async () => {
    const page = await import("../app/resources/page");
    const html = renderToStaticMarkup(await page.default({}));
    assert.match(html, /<h1[^>]*>Guides<\/h1>/);
    const title = page.metadata.title;
    assert.equal(typeof title === "string" ? title : JSON.stringify(title), "Guides");
    assert.doesNotMatch(html, /Governance Pillars Emblem|Governance resources/i);
    const text = visibleText(html);
    assert.doesNotMatch(text, /confirmation logic|governance artifacts|escalation thresholds|board operating system/i);
    for (const promise of ["A monthly scorecard", "A matrix that turns market signals", "A way to sort decisions by how hard they are to undo"]) {
      assert.ok(text.includes(promise), promise);
    }
  });
});
