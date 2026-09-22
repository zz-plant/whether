import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as nextNavigation from "next/navigation";
import { CALL_CHANGE_RULE } from "../lib/report/trackRecordCopy";

const mockAny: any = mock;

/* /history mounts a client explorer and /history/compare two period pickers,
   and both reach the router through next/navigation, which renderToStaticMarkup
   never mounts. Spread rather than replaced — `mock.module` patches the registry
   process-wide, and a stub narrower than the module it stands in for is a
   decision about every other file in the run (see toolkitHowToAnchors). */
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

/*
 * The three routes that show a reading against the record, each pinned on the
 * order a reader meets things in rather than on what the sections say.
 *
 * All three render offline: /history reads the bundled archive, and the other
 * two read through `loadWeeklyBriefSnapshot`, which falls back to the bundled
 * snapshot when no upstream answers.
 */
const headingsInOrder = (html: string) =>
  [...html.matchAll(/<h[1-3][^>]*>([^<]*)</g)].map(([, text]) => text.replace(/&#x27;/g, "'"));

describe("/history leads with the record's answer", () => {
  it("draws the month strip before the phase map, and the tiles beside the confidence record", async () => {
    const page = await import("../app/history/page");
    const html = renderToStaticMarkup(await page.default({ searchParams: Promise.resolve({}) }));
    const headings = headingsInOrder(html);

    const strip = headings.indexOf("The call by month");
    const record = headings.indexOf("Track record");
    const confidence = headings.indexOf("What the confidence number has been worth");
    const map = headings.indexOf("How the two scores decide the call");
    const table = headings.indexOf("Monthly calls");
    const briefs = headings.indexOf("Published weekly briefs");

    assert.ok(strip !== -1 && record !== -1 && map !== -1 && table !== -1, `headings: ${headings.join(" | ")}`);
    assert.ok(strip < record, "the month strip opens the page");
    assert.ok(record < confidence && confidence < map, "the confidence record sits with the track record, before the phase map");
    assert.ok(map < table, "the month-by-month table is evidence, after the map");
    assert.ok(briefs === -1 || table < briefs, "published briefs close the record");

    assert.equal((html.match(/data-month-strip/g) ?? []).length, 1);
    assert.ok(html.indexOf("data-month-strip") < html.indexOf('id="phase-map-heading"'));
    assert.doesNotMatch(html, /Where this month sits/);
    /* The confidence record prints the rule on /calibration; here it sits
       beside the tiles that already state it, and the rule is once per page. */
    assert.equal(html.split(CALL_CHANGE_RULE).length - 1, 1, "the call-change rule is stated once on /history");
  });

  it("keeps the rail in page order under the sections' own names", async () => {
    const page = await import("../app/history/page");
    const html = renderToStaticMarkup(await page.default({ searchParams: Promise.resolve({}) }));
    const rail = [...html.matchAll(/href="#(call-by-month|track-record|regime-map|monthly-calls|published-briefs)"/g)].map(([, id]) => id);
    const firstOfEach = [...new Set(rail)];
    assert.deepEqual(firstOfEach.slice(0, 4), ["call-by-month", "track-record", "regime-map", "monthly-calls"]);
  });
});

describe("/trust carries one trust strip", () => {
  it("renders exactly one TrustStrip, under the h1, and no five-cell status strip", async () => {
    const page = await import("../app/trust/page");
    const html = renderToStaticMarkup(await page.default({}));

    assert.equal((html.match(/data-trust-strip/g) ?? []).length, 1);
    const h1 = html.indexOf("<h1");
    const strip = html.indexOf("data-trust-strip");
    assert.ok(h1 !== -1 && h1 < strip, "the strip follows the page title");
    const firstSectionHeading = html.indexOf('id="section-formula-reference-heading"');
    assert.ok(strip < firstSectionHeading, "the strip comes before the first explanatory section");
    assert.doesNotMatch(html, /sm:grid-cols-5/, "the five-cell System status strip is gone");
    assert.doesNotMatch(html, /href="\/trust"/, "on /trust the strip carries no link to itself");
    for (const cell of ["As of", "Sources", "Confidence", "Could change next week"]) assert.match(html, new RegExp(cell));
  });

  it("draws where the score sits as two ladders at the top of the formula section", async () => {
    const page = await import("../app/trust/page");
    const html = renderToStaticMarkup(await page.default({}));
    const formula = html.indexOf('id="formula-reference"');
    const ladders = [...html.matchAll(/data-score-ladder/g)].map((match) => match.index ?? -1);
    assert.equal(ladders.length, 2);
    assert.ok(ladders.every((index) => index > formula), "both ladders sit inside the formula section");
    assert.ok(ladders[1] < html.indexOf("Four conditions: funding pressure above"), "the quadrant stays, as the rule's explanation, beneath them");
  });
});

describe("/history/compare draws each score against its lines", () => {
  it("renders two ladders, period A filled and period B hollow, plus the borrowing-premium tile", async () => {
    const page = await import("../app/history/compare/page");
    const html = renderToStaticMarkup(
      await page.default({ searchParams: Promise.resolve({ yearA: "2024", monthA: "3", yearB: "2020", monthB: "3" }) }),
    );
    assert.equal((html.match(/data-score-ladder/g) ?? []).length, 2);
    assert.match(html, /Period B \d+(\.\d+)?/, "the hollow dot is named for period B, not last week");
    assert.doesNotMatch(html, /Last week/);
    assert.match(html, /Corporate borrowing premium, A minus B/);
    assert.doesNotMatch(html, /Operating latitude change|Yield curve slope change/, "the delta tiles are the ladders now");
  });

  /*
   * The reader layer names the implication, never the instrument
   * (docs/glossary-retirement-plan.md). The period picker carried the engine key
   * ("Mar 2023 · SCARCITY"), and the signal rows carried desk shorthand in
   * parentheses — (1M/3M), (10Y−2Y), (BBB) — with nothing on the page to expand it.
   */
  it("names every row and option in plain words, with each score on its scale", async () => {
    const page = await import("../app/history/compare/page");
    const html = renderToStaticMarkup(
      await page.default({ searchParams: Promise.resolve({ yearA: "2024", monthA: "3", yearB: "2020", monthB: "3" }) }),
    );
    const text = html.replace(/<[^>]+>/g, " ");
    assert.doesNotMatch(text, /\b(SCARCITY|DEFENSIVE|VOLATILE|EXPANSION)\b/);
    assert.doesNotMatch(text, /\(1M\/3M\)|10Y|\(BBB\)|\bCPI\b|Macro deltas/);
    assert.match(text, /Funding pressure\s+[A-Z][^<]*?\.\s+\d+\/100/, "funding pressure carries its meaning and scale");
    assert.match(text, /Risk appetite\s+[A-Z][^<]*?\.\s+\d+\/100/, "risk appetite carries its meaning and scale");
  });
});
