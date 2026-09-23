import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import {
  buildCanonBaseRate,
  buildCanonTimeline,
  canonEssays,
  describeCanonBaseRate,
  readingForMonth,
  type CanonEssay,
} from "../lib/productCanon";
import type { RegimeKey } from "../lib/regimeEngine";

const month = (year: number, monthNumber: number, regime: RegimeKey) => ({
  year,
  month: monthNumber,
  recordDate: `${year}-${String(monthNumber).padStart(2, "0")}-28`,
  regime,
});

/* Jan–Jun 2020: three Sunny, two Stormy, one Sunny. */
const series = [
  month(2020, 1, "EXPANSION"),
  month(2020, 2, "EXPANSION"),
  month(2020, 3, "EXPANSION"),
  month(2020, 4, "VOLATILE"),
  month(2020, 5, "VOLATILE"),
  month(2020, 6, "EXPANSION"),
];

const essay = (slug: string, year: number, monthNumber: number): CanonEssay => ({
  slug,
  title: slug,
  author: "A. Author",
  published: { year, month: monthNumber },
  sourceUrl: `https://example.test/${slug}`,
  argument: "An argument.",
});

describe("product canon: readings", () => {
  it("counts how long the conditions had held, including that month", () => {
    assert.deepEqual(readingForMonth(series, 2020, 3), {
      kind: "reading",
      regime: "EXPANSION",
      conditions: "Sunny",
      recordDate: "2020-03-28",
      heldMonths: 3,
      heldSinceRecordStart: true,
    });
    const firstStormy = readingForMonth(series, 2020, 4);
    assert.equal(firstStormy.kind === "reading" && firstStormy.heldMonths, 1);
    /* A run restarts after a change: June is Sunny's first month again, not its fourth. */
    const june = readingForMonth(series, 2020, 6);
    assert.equal(june.kind === "reading" && june.heldMonths, 1);
    assert.equal(june.kind === "reading" && june.heldSinceRecordStart, false);
  });

  it("says a month is outside the record rather than borrowing a neighbour's reading", () => {
    assert.equal(readingForMonth(series, 2019, 12).kind, "before-record");
    assert.equal(readingForMonth(series, 2020, 7).kind, "after-record");
    assert.equal(readingForMonth([], 2020, 1).kind, "before-record");
  });

  it("orders the timeline by publication, oldest first", () => {
    const timeline = buildCanonTimeline(series, [essay("late", 2020, 5), essay("early", 2019, 1), essay("mid", 2020, 2)]);
    assert.deepEqual(timeline.map((entry) => entry.slug), ["early", "mid", "late"]);
  });
});

describe("product canon: base rate", () => {
  const timeline = buildCanonTimeline(series, [essay("a", 2020, 1), essay("b", 2020, 2), essay("c", 2020, 4), essay("pre", 2019, 6)]);
  const baseRate = buildCanonBaseRate(series, timeline);

  it("puts the share of essays beside the share of months, over the essays that have a reading", () => {
    const sunny = baseRate.rows.find((row) => row.regime === "EXPANSION");
    const stormy = baseRate.rows.find((row) => row.regime === "VOLATILE");
    assert.equal(sunny?.months, 4);
    assert.equal(sunny?.essays, 2);
    assert.equal(stormy?.essays, 1);
    assert.equal(baseRate.essaysWithReading, 3);
    assert.equal(baseRate.essaysBeforeRecord, 1);
    const essayShareTotal = baseRate.rows.reduce((sum, row) => sum + row.essayShare, 0);
    const monthShareTotal = baseRate.rows.reduce((sum, row) => sum + row.monthShare, 0);
    assert.ok(Math.abs(essayShareTotal - 1) < 1e-9);
    assert.ok(Math.abs(monthShareTotal - 1) < 1e-9);
  });

  it("never offers the comparison as a cause", () => {
    const sentence = describeCanonBaseRate(baseRate);
    assert.match(sentence, /too few to say why/);
    assert.doesNotMatch(sentence, /\bbecause\b|\bcaused\b|\bdrove\b/i);
  });

  it("says the essays track the months when no gap reaches ten points", () => {
    const even = buildCanonTimeline(series, [
      essay("a", 2020, 1), essay("b", 2020, 2), essay("c", 2020, 4), essay("d", 2020, 6), essay("e", 2020, 5), essay("f", 2020, 3),
    ]);
    assert.match(describeCanonBaseRate(buildCanonBaseRate(series, even)), /fall about where the months do/);
  });
});

describe("product canon: the list itself", () => {
  it("has entries, each with a unique anchor, a first-publication month and a source", () => {
    assert.ok(canonEssays.length >= 10, "the page is a list; a handful of entries is not one");
    const slugs = new Set<string>();
    for (const entry of canonEssays) {
      assert.match(entry.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, entry.slug);
      assert.ok(!slugs.has(entry.slug), `duplicate slug ${entry.slug}`);
      slugs.add(entry.slug);
      assert.ok(entry.published.month >= 1 && entry.published.month <= 12, entry.slug);
      assert.ok(entry.published.year >= 1990 && entry.published.year <= 2026, entry.slug);
      assert.match(entry.sourceUrl, /^https:\/\//, entry.slug);
      assert.ok(entry.argument.trim().length > 0, entry.slug);
    }
  });

  /* The first version carried an entry credited to "Industry synthesis": a
     claim with no author is not a piece of writing anyone can go and read. */
  it("credits every entry to someone who wrote it", () => {
    for (const entry of canonEssays) {
      assert.doesNotMatch(entry.author, /synthesis|various|and peers|anonymous/i, entry.slug);
    }
  });

  /* The first version's defect: the regime's stock sentence printed under
     every essay as that month's guidance. */
  it("renders one anchor per essay and no per-month stock guidance", async () => {
    const page = await import("../app/concepts/page");
    const html = renderToStaticMarkup(page.default());
    for (const entry of canonEssays) {
      assert.ok(html.includes(`id="${entry.slug}"`), `anchor for ${entry.slug}`);
    }
    for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) {
      assert.ok(html.includes(`id="${target}"`), `in-page link #${target} resolves`);
    }
    assert.doesNotMatch(html, /scale proven bets|guidance that month/i);
  });

  /* Two ways into the rest of the site: each reading opens its year in the
     archive, and "this week" opens the published brief it compares against. */
  it("links readings to archive years that exist, and this week to its published brief", async () => {
    const { postureArchiveYears } = await import("../lib/summary/postureArchiveYears");
    const { latestPublishedBrief } = await import("../lib/report/publishedBriefs");
    const page = await import("../app/concepts/page");
    const html = renderToStaticMarkup(page.default());
    const years = new Set(postureArchiveYears.map((year) => year.slug));
    const linked = [...html.matchAll(/href="\/history\/(\d{4})"/g)].map(([, year]) => year);
    assert.ok(linked.length > 0, "readings link into the archive");
    for (const year of linked) assert.ok(years.has(year), `/history/${year} is a real archive page`);
    if (latestPublishedBrief) assert.ok(html.includes(`href="/brief/${latestPublishedBrief.slug}"`));
  });
});
