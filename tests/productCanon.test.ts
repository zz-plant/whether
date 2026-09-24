import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import {
  buildCanonBaseRate,
  buildCanonTimeline,
  canonEssays,
  describeCanonBaseRate,
  essaysPublishedIn,
  formatCanonAuthors,
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
  authors: ["A. Author"],
  format: "essay",
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
      assert.ok(entry.authors.length > 0, entry.slug);
      for (const author of entry.authors) {
        assert.doesNotMatch(author, /synthesis|various|and peers|anonymous/i, entry.slug);
        /* One person per entry: a joined name is one Person in the markup. */
        assert.doesNotMatch(author, /,| and /, `${entry.slug}: "${author}" is more than one person`);
      }
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

describe("product canon: search and the archive", () => {
  it("joins authors the way a byline reads", () => {
    assert.equal(formatCanonAuthors({ authors: ["A"] }), "A");
    assert.equal(formatCanonAuthors({ authors: ["A", "B"] }), "A and B");
    assert.equal(formatCanonAuthors({ authors: ["A", "B", "C"] }), "A, B and C");
  });

  it("finds the essays published in an archive year or quarter", () => {
    const list = [essay("jan", 2016, 1), essay("apr", 2016, 4), essay("sep", 2016, 9), essay("other", 2017, 4)];
    assert.deepEqual(essaysPublishedIn({ year: 2016 }, list).map((entry) => entry.slug), ["jan", "apr", "sep"]);
    assert.deepEqual(essaysPublishedIn({ year: 2016, quarter: 2 }, list).map((entry) => entry.slug), ["apr"]);
    assert.deepEqual(essaysPublishedIn({ year: 2016, quarter: 4 }, list), []);
  });

  /* A search result shows about sixty characters of title; the layout appends " | Whether". */
  it("keeps the title inside a result line and gives the share card its own image", async () => {
    const { metadata } = await import("../app/concepts/page");
    assert.equal(typeof metadata.title, "string");
    const title = `${typeof metadata.title === "string" ? metadata.title : ""} | Whether`;
    assert.ok(title.length <= 60, `${title.length} characters: ${title}`);
    assert.ok((metadata.description ?? "").length <= 160);
    const images = metadata.openGraph?.images;
    const first = Array.isArray(images) ? images[0] : images;
    const url = typeof first === "object" && first !== null && "url" in first ? String(first.url) : String(first);
    assert.match(url, /template=reading/, "not the live weekly-guidance card");
  });

  it("marks books as books and each co-author as a person", async () => {
    const { buildProductCanonStructuredData } = await import("../lib/seo/pageStructuredData");
    /* Read it the way a crawler does: as JSON, not as the builder's types. */
    const graph = JSON.parse(JSON.stringify(buildProductCanonStructuredData({ essays: canonEssays })));
    const page = graph["@graph"].find((node: { "@type": string }) => node["@type"] === "CollectionPage");
    const items: Array<{ "@type": string; name: string; author: unknown[] }> =
      page?.mainEntity.itemListElement.map((element: { item: unknown }) => element.item) ?? [];
    assert.equal(items.length, canonEssays.length);
    assert.equal(items.find((item) => item.name === "The Mom Test")?.["@type"], "Book");
    assert.equal(items.find((item) => item.name === "The Alternative to Roadmaps")?.["@type"], "Article");
    assert.equal(items.find((item) => item.name === "Empowered")?.author.length, 2);
  });
});

describe("product canon: the archive's side of the link", () => {
  it("lists the essays a year page covers, each linking to its entry on the reading list", async () => {
    const page = await import("../app/history/[period]/page");
    const html = renderToStaticMarkup(await page.default({ params: Promise.resolve({ period: "2016" }) }));
    for (const entry of essaysPublishedIn({ year: 2016 })) {
      assert.ok(html.includes(`href="/concepts#${entry.slug}"`), `2016 links to ${entry.slug}`);
    }
    assert.ok(essaysPublishedIn({ year: 2016 }).length > 0, "the fixture year has essays");
  });

  it("leaves the section out of a year with none", async () => {
    const page = await import("../app/history/[period]/page");
    const html = renderToStaticMarkup(await page.default({ params: Promise.resolve({ period: "2010" }) }));
    assert.equal(essaysPublishedIn({ year: 2010 }).length, 0);
    assert.doesNotMatch(html, /Product writing published in/);
  });
});
