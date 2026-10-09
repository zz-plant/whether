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
  /* The order follows the page summary's two questions: what the guidance said
     (the strip, then the published weeks), then how it held up (the tiles and
     the confidence record). The published weeks used to close the page, under
     the phase map, though they are the record a reader cites. */
  it("draws the strip, then the published weeks, then the track record, then the phase map", async () => {
    const page = await import("../app/history/page");
    const html = renderToStaticMarkup(await page.default({ searchParams: Promise.resolve({}) }));
    const headings = headingsInOrder(html);

    const strip = headings.indexOf("Conditions by month");
    const record = headings.indexOf("Track record");
    const confidence = headings.indexOf("What the confidence number has been worth");
    const map = headings.indexOf("How the two scores set conditions");
    const table = headings.indexOf("Monthly readings");
    const briefs = headings.indexOf("Published weekly briefs");

    assert.ok(strip !== -1 && record !== -1 && map !== -1 && table !== -1, `headings: ${headings.join(" | ")}`);
    assert.ok(strip < record, "the month strip opens the page");
    assert.ok(briefs === -1 || (strip < briefs && briefs < record), "the published weeks follow the strip");
    assert.ok(record < confidence && confidence < map, "the confidence record sits with the track record, before the phase map");
    assert.ok(map < table, "the month-by-month table is evidence, after the map");

    assert.equal((html.match(/data-month-strip/g) ?? []).length, 1);
    assert.ok(html.indexOf("data-month-strip") < html.indexOf('id="phase-map-heading"'));
    assert.doesNotMatch(html, /Where this month sits/);
    /* The confidence record prints the rule on /calibration; here it sits
       beside the tiles that already state it, and the rule is once per page. */
    assert.equal(html.split(CALL_CHANGE_RULE).length - 1, 1, "the change rule is stated once on /history");
  });

  it("names the newest published week above the month strip only when it is newer than the strip", async () => {
    /* The strip ends at a month-end and says what held; every other route shows
       the week. Without this line /history read Sunny while the brief read
       Freezing, one click apart, and nothing said why. */
    const { getPublishedBriefs, publishedBriefDisplay } = await import("../lib/report/publishedBriefs");
    const { getTimeMachineRegimeSeries } = await import("../lib/timeMachine/timeMachineCache");
    const { buildTrackRecord } = await import("../lib/report/trackRecord");
    const page = await import("../app/history/page");
    const html = renderToStaticMarkup(await page.default({ searchParams: Promise.resolve({}) }));
    const latest = [...getPublishedBriefs()].sort((a, b) => b.recordDate.localeCompare(a.recordDate))[0];
    assert.ok(latest);
    const stripEnd = buildTrackRecord(getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER))?.latestRecordDate ?? "";
    const line = html.indexOf("Since the last month-end, the week of");
    /* Between a month-end landing and the next Thursday freeze merging, the
       newest published week is older than the strip, and the page says nothing
       the strip does not (2026-10-07: the Sep 29 week under a Sep 30 strip).
       This held the bridge to whichever case the bundled data was in. */
    if (latest.recordDate <= stripEnd) {
      assert.equal(line, -1, "no bridge for a week the strip already covers");
      return;
    }
    assert.ok(line !== -1, "the bridge line renders");
    assert.ok(line < html.indexOf("data-month-strip"), "above the strip it qualifies");
    assert.ok(html.slice(line, line + 400).includes(publishedBriefDisplay(latest).conditions));
  });

  it("keeps the rail in page order under the sections' own names", async () => {
    const page = await import("../app/history/page");
    const html = renderToStaticMarkup(await page.default({ searchParams: Promise.resolve({}) }));
    const rail = [...html.matchAll(/href="#(call-by-month|track-record|regime-map|monthly-calls|published-briefs)"/g)].map(([, id]) => id);
    const firstOfEach = [...new Set(rail)];
    assert.deepEqual(firstOfEach, ["call-by-month", "published-briefs", "track-record", "regime-map", "monthly-calls"]);
  });

  it("folds the phase map until asked, and opens it for a window link", async () => {
    const page = await import("../app/history/page");
    const mapTag = (html: string) => {
      const heading = html.indexOf('id="phase-map-heading"');
      return html.slice(0, heading).match(/<details[^>]*>/g)?.at(-1) ?? "";
    };
    const closed = renderToStaticMarkup(await page.default({ searchParams: Promise.resolve({}) }));
    assert.doesNotMatch(mapTag(closed), /\sopen/, "the mechanism is a second read");
    const windowed = renderToStaticMarkup(await page.default({ searchParams: Promise.resolve({ span: "5y" }) }));
    assert.match(mapTag(windowed), /\sopen/, "a window link lands on the chart it changed");
  });

  it("lists each closed year under the strip, not in a section of its own", async () => {
    const page = await import("../app/history/page");
    const html = renderToStaticMarkup(await page.default({ searchParams: Promise.resolve({}) }));
    const { buildPostureArchivePath, postureArchiveYears } = await import("../lib/summary/postureArchiveYears");
    const strip = /<section[^>]*id="call-by-month"[^>]*>([\s\S]*?)<\/section>/.exec(html)?.[1] ?? "";
    assert.ok(postureArchiveYears.length > 0);
    for (const year of postureArchiveYears) {
      assert.ok(strip.includes(`href="${buildPostureArchivePath(year.slug)}"`), `${year.title} links from the strip's section`);
    }
    assert.doesNotMatch(html, /posture-by-year-heading/);
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
    // The sub-tab row names /trust as the current page (aria-current); the strip itself must not link here.
    const withoutTabs = html.replace(/<nav[^>]*data-section-tabs[\s\S]*?<\/nav>/, "");
    assert.doesNotMatch(withoutTabs, /href="\/trust"/, "on /trust the strip carries no link to itself");
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
    assert.match(html, /Period B: \d+(\.\d+)?/, "the hollow dot is named for period B, not last week");
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

/* DD-037. The page's section titles were eyebrow labels, and the record export
   had a row of its own between the intro and the first section. */
describe("/history marks its sections", () => {
  const h2Class = (html: string, id: string) => {
    const tag = new RegExp(`<h2([^>]*)id="${id}"([^>]*)>`).exec(html);
    if (!tag) return null;
    return /class="([^"]*)"/.exec(`${tag[1] ?? ""}${tag[2] ?? ""}`)?.[1] ?? "";
  };

  it("heads each section with a heading, and keeps the record export in the Track record header", async () => {
    const page = await import("../app/history/page");
    const html = renderToStaticMarkup(await page.default({ searchParams: Promise.resolve({}) }));

    for (const id of ["call-by-month-heading", "track-record-heading", "phase-map-heading", "monthly-calls-heading", "published-briefs-heading"]) {
      const className = h2Class(html, id);
      assert.notEqual(className, null, `${id} renders`);
      assert.doesNotMatch(className ?? "", /type-eyebrow/, `${id} is a heading, not a label`);
    }

    const trackRecord = /<section[^>]*aria-labelledby="track-record-heading"[^>]*>([\s\S]*?)<\/section>/.exec(html);
    assert.ok(trackRecord, "the track record section renders");
    assert.match(trackRecord[1] ?? "", /Copy the record summary/, "the export sits in the section it copies");
    assert.ok(html.indexOf("Copy the record summary") > html.indexOf('id="call-by-month-heading"'), "and not above the first section");
  });
});
