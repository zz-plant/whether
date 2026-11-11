import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as nextNavigation from "next/navigation";
import {
  UNPUBLISHED_WEEKS,
  describeUnpublishedWeeks,
  findPublishedBrief,
  findUnpublishedWeeks,
  getPublishedBriefs,
  groupPublishedBriefRuns,
  isPublishedBriefSlug,
  listPublishedRecord,
  type PublishedBrief,
} from "../lib/report/publishedBriefs";
import { buildBriefCalendarFeed } from "../lib/export/calendarFeed";

const mockAny: any = mock;
/* /history mounts a client explorer that reaches the router; spread, not replaced (see recordRoutesReadingOrder). */
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
  usePathname: () => "/history",
  useSearchParams: () => new URLSearchParams(),
}));

/*
 * The record promises a brief every week, and eight weeks of 2026 have none: w32 to
 * w37 and w42 and w43. They cannot be written now (a freeze records only the current
 * week, and a backfilled record would fabricate the cadence), so the record names them.
 * /history went from "Week of Oct 26, 2026" to "Weeks of Sep 15 – Oct 6, 2026" with
 * nothing between them, and w41's next-week link skipped two weeks without a word.
 */
const AUGUST_LINE =
  "No brief was published for the weeks of Aug 3 to Sep 7, 2026. The scheduled run that publishes the brief did not complete.";
const OCTOBER_LINE =
  "No brief was published for the weeks of Oct 12 and Oct 19, 2026. The scheduled run that publishes the brief did not complete.";

const textOf = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

const renderHistory = async () =>
  renderToStaticMarkup(await (await import("../app/history/page")).default({ searchParams: Promise.resolve({}) }));

const renderWeek = async (week: string) =>
  renderToStaticMarkup(await (await import("../app/brief/[week]/page")).default({ params: Promise.resolve({ week }) }));

/** A copy of a frozen record moved to another week, for the shapes the archive does not hold yet. */
const recordAt = (base: PublishedBrief, week: number, recordDate: string): PublishedBrief => ({
  ...base,
  slug: `2026-w${week}`,
  week,
  recordDate,
  publishedAt: `${recordDate}T00:00:00.000Z`,
});

describe("the weeks with no brief", () => {
  it("are none of the published weeks, and each sits inside the published record", () => {
    const briefs = getPublishedBriefs();
    const first = briefs.at(-1);
    const newest = briefs.at(0);
    assert.ok(first && newest);
    const between = new Set(findUnpublishedWeeks(first, newest));
    for (const week of Object.keys(UNPUBLISHED_WEEKS)) {
      assert.equal(isPublishedBriefSlug(week), false, `${week} is listed as unpublished and is in the archive`);
      assert.ok(between.has(week), `${week} is outside the published record`);
    }
  });

  it("are named in one line per stretch, in the w44 correction's words, with the recorded reason", () => {
    assert.equal(describeUnpublishedWeeks(["2026-w42", "2026-w43"]), OCTOBER_LINE);
    assert.equal(describeUnpublishedWeeks(["2026-w32", "2026-w33", "2026-w34", "2026-w35", "2026-w36", "2026-w37"]), AUGUST_LINE);
    /* A week missed later is shown all the same, by the fact alone until its reason is recorded. */
    assert.equal(describeUnpublishedWeeks(["2026-w49"]), "No brief was published for the week of Nov 30, 2026.");
    assert.equal(describeUnpublishedWeeks(["2026-w53", "2027-w01"]), "No brief was published for the weeks of Dec 28, 2026 and Jan 4, 2027.");
    assert.equal(describeUnpublishedWeeks([]), null);
  });

  it("end a run of the same guidance, so a run's span never covers a week with no brief", () => {
    const base = findPublishedBrief("2026-w45");
    assert.ok(base);
    const later = recordAt(base, 50, "2026-12-08");
    const adjacent = recordAt(base, 49, "2026-12-01");
    const apart = recordAt(base, 48, "2026-11-24");
    assert.equal(groupPublishedBriefRuns([later, adjacent]).length, 1, "adjacent weeks of the same guidance are one run");
    assert.equal(groupPublishedBriefRuns([later, apart]).length, 2, "a missed week ends the run");
    assert.deepEqual(
      listPublishedRecord([later, apart]).map((row) => (row.kind === "run" ? row.run.map((brief) => brief.slug) : row.line)),
      [["2026-w50"], "No brief was published for the week of Nov 30, 2026.", ["2026-w48"]],
    );
  });

  it("show on /history between the runs they fall between, as plain lines", async () => {
    const html = await renderHistory();
    const text = textOf(html);
    const start = text.indexOf("Published weekly briefs");
    assert.ok(start !== -1, "/history lists no published weeks");
    const section = text.slice(start, text.indexOf("Track record", start));
    for (const [line, before, after] of [
      [OCTOBER_LINE, "Week of Oct 26, 2026", "Weeks of Sep 28 – Oct 5, 2026"],
      [AUGUST_LINE, "Weeks of Sep 14 – Sep 21, 2026", "Week of Jul 27, 2026"],
    ] as const) {
      const at = section.indexOf(line);
      assert.ok(at !== -1, `/history does not say: ${line}`);
      /* The last of each label is the list's row: the week grid above it names the same weeks. */
      assert.ok(section.lastIndexOf(before) < at && at < section.lastIndexOf(after), `${line} is not between ${before} and ${after}`);
    }
    const named = new Set([...html.matchAll(/data-unpublished-weeks="([^"]+)"/g)].flatMap(([, weeks]) => weeks.split(" ")));
    for (const week of Object.keys(UNPUBLISHED_WEEKS)) assert.ok(named.has(week), `/history does not name ${week}`);
    for (const row of html.match(/<li[^>]*data-unpublished-weeks[\s\S]*?<\/li>/g) ?? []) {
      assert.doesNotMatch(row, /<a[\s>]|data-regime/, "a week with no brief carries no link and no conditions");
    }
  });

  it("show under the week links of the briefs on either side of them", async () => {
    for (const [week, line] of [
      ["2026-w31", AUGUST_LINE],
      ["2026-w38", AUGUST_LINE],
      ["2026-w41", OCTOBER_LINE],
      ["2026-w44", OCTOBER_LINE],
    ] as const) {
      const html = await renderWeek(week);
      const start = html.indexOf('aria-label="Adjacent weeks"');
      assert.ok(start !== -1, `/brief/${week} has no week links`);
      const nav = textOf(html.slice(start, html.indexOf("</nav>", start)));
      assert.ok(nav.includes(line), `/brief/${week}'s week links do not say: ${line}`);
    }
    assert.doesNotMatch(await renderWeek("2026-w39"), /data-unpublished-weeks/, "adjacent weeks pass over nothing");
  });

  /* The calendar is left as it is: a Monday with no brief is an empty day there, as the
     feed's own rule says once the week is past, and an event for it would sit in every
     subscriber's calendar in the shape of a brief. */
  it("get no calendar event", () => {
    const feed = buildBriefCalendarFeed(getPublishedBriefs(), new Date("2026-11-11T12:00:00Z"));
    for (const week of Object.keys(UNPUBLISHED_WEEKS)) assert.ok(!feed.includes(`UID:${week}@whether.work`), `${week} has a calendar event`);
  });
});
