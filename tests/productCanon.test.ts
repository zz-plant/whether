import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { ADVICE_STANCES, ADVICE_STANCE_DEFINITIONS } from "../lib/adviceStance";
import {
  buildCanonBaseRate,
  buildCanonTimeline,
  canonEssays,
  describeCanonBaseRate,
  essaysPublishedIn,
  formatCanonAuthors,
  readingForMonth,
  summarizeCanonBaseRate,
  type CanonEssay,
} from "../lib/productCanon";
import {
  buildAdvicePairs,
  buildCapitalAdviceLag,
  buildScoreAlignment,
  describeAdvicePairs,
  describeCapitalAdviceLag,
  describeScoreAlignment,
} from "../lib/productCanonMeasures";
import type { RegimeKey } from "../lib/regimeEngine";
import type { AdviceStance } from "../lib/adviceStance";
import { getTimeMachineRegimeSeries } from "../lib/timeMachine/timeMachineCache";

const month = (year: number, monthNumber: number, regime: RegimeKey, tightness = 0, riskAppetite = 80) => ({
  year,
  month: monthNumber,
  recordDate: `${year}-${String(monthNumber).padStart(2, "0")}-28`,
  regime,
  tightness,
  riskAppetite,
});

/* Jan–Jun 2020: three Sunny, two Stormy, one Sunny. Risk appetite drops under its
   line in April and recovers in June; funding pressure never moves. */
const series = [
  month(2020, 1, "EXPANSION"),
  month(2020, 2, "EXPANSION"),
  month(2020, 3, "EXPANSION"),
  month(2020, 4, "VOLATILE", 0, 40),
  month(2020, 5, "VOLATILE", 0, 35),
  month(2020, 6, "EXPANSION", 0, 60),
];

const essay = (slug: string, year: number, monthNumber: number, stance: AdviceStance = "craft"): CanonEssay => ({
  slug,
  kind: "canon",
  title: slug,
  authors: ["A. Author"],
  format: "essay",
  published: { year, month: monthNumber },
  sourceUrl: `https://example.test/${slug}`,
  argument: "An argument.",
  stance,
  stanceBasis: "A basis.",
});

const record = getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER);
const liveTimeline = buildCanonTimeline(record);

const renderPage = async () => {
  const page = await import("../app/concepts/page");
  return renderToStaticMarkup(page.default());
};

describe("product canon: readings", () => {
  it("counts how long the conditions had held, including that month, and carries both scores", () => {
    assert.deepEqual(readingForMonth(series, 2020, 3), {
      kind: "reading",
      regime: "EXPANSION",
      conditions: "Sunny",
      recordDate: "2020-03-28",
      heldMonths: 3,
      heldSinceRecordStart: true,
      fundingPressure: 0,
      riskAppetite: 80,
      monthsSinceFundingPressureCrossed: null,
      monthsSinceRiskAppetiteCrossed: null,
    });
    const firstStormy = readingForMonth(series, 2020, 4);
    assert.equal(firstStormy.kind === "reading" && firstStormy.heldMonths, 1);
    /* A run restarts after a change: June is Sunny's first month again, not its fourth. */
    const june = readingForMonth(series, 2020, 6);
    assert.equal(june.kind === "reading" && june.heldMonths, 1);
    assert.equal(june.kind === "reading" && june.heldSinceRecordStart, false);
  });

  it("counts months since a score last crossed its line, and says null when it never had", () => {
    const may = readingForMonth(series, 2020, 5);
    assert.equal(may.kind === "reading" && may.monthsSinceRiskAppetiteCrossed, 1, "crossed under 50 in April");
    assert.equal(may.kind === "reading" && may.monthsSinceFundingPressureCrossed, null);
    const june = readingForMonth(series, 2020, 6);
    assert.equal(june.kind === "reading" && june.monthsSinceRiskAppetiteCrossed, 0, "crossed back in June itself");
    /* 50 is not above the line: the quadrant rule is strict, as regimeAtCoordinates is. */
    const atLine = [month(2020, 1, "EXPANSION", 0, 51), month(2020, 2, "EXPANSION", 0, 50)];
    const feb = readingForMonth(atLine, 2020, 2);
    assert.equal(feb.kind === "reading" && feb.monthsSinceRiskAppetiteCrossed, 0);
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

describe("product canon: base rate by kind of advice", () => {
  const timeline = buildCanonTimeline(series, [
    essay("a", 2020, 1, "expand"),
    essay("b", 2020, 2, "craft"),
    essay("c", 2020, 4, "conserve"),
    essay("d", 2020, 5, "conserve"),
    essay("e", 2020, 6, "expand"),
    essay("f", 2020, 4, "craft"),
    essay("pre", 2019, 6, "conserve"),
  ]);
  const baseRate = buildCanonBaseRate(series, timeline);

  it("puts each kind's share beside the share of months, over the texts that have a reading", () => {
    const sunny = baseRate.rows.find((row) => row.regime === "EXPANSION");
    const stormy = baseRate.rows.find((row) => row.regime === "VOLATILE");
    assert.equal(sunny?.months, 4);
    assert.equal(sunny?.byStance.expand.count, 2);
    assert.equal(stormy?.byStance.conserve.count, 2);
    assert.deepEqual(baseRate.placed, { expand: 2, conserve: 2, craft: 2 });
    assert.equal(baseRate.beforeRecord, 1);
    for (const stance of ADVICE_STANCES) {
      const total = baseRate.rows.reduce((sum, row) => sum + row.byStance[stance].share, 0);
      assert.ok(Math.abs(total - 1) < 1e-9, stance);
    }
    assert.ok(Math.abs(baseRate.rows.reduce((sum, row) => sum + row.monthShare, 0) - 1) < 1e-9);
  });

  it("states the lean only where ten points of it exist, and never as a cause", () => {
    const sentence = describeCanonBaseRate(baseRate);
    assert.match(sentence, /Sunny months make up 67% of the record, and Freezing or Stormy months 33%\./);
    assert.match(sentence, /Of the 2 texts tagged Expand, 2 came out in a Sunny month \(100%\)\./);
    assert.match(sentence, /Of the 2 tagged Conserve, 2 came out in a Freezing or Stormy month \(100%\)\./);
    assert.match(sentence, /capital advice leans with the conditions/);
    assert.match(sentence, /one text more or less moves a share by 50 points/);
    assert.doesNotMatch(sentence, /\bbecause\b|\bcaused?\b|\bdrove\b|\bdriven\b/i);
  });

  it("says capital advice does not lean when it falls where the months do", () => {
    const flat = buildCanonTimeline(series, [
      essay("a", 2020, 1, "expand"), essay("b", 2020, 4, "expand"), essay("c", 2020, 2, "expand"),
      essay("d", 2020, 3, "conserve"), essay("e", 2020, 5, "conserve"), essay("f", 2020, 6, "conserve"),
    ]);
    assert.match(describeCanonBaseRate(buildCanonBaseRate(series, flat)), /capital advice does not lean with the conditions/);
  });
});

describe("product canon: lag and which score", () => {
  const timeline = buildCanonTimeline(series, [
    essay("a", 2020, 2, "expand"),
    essay("b", 2020, 5, "conserve"),
    essay("c", 2020, 6, "expand"),
    essay("craft", 2020, 5, "craft"),
  ]);

  it("measures months since the record moved for capital texts only, and says why the rest are out", () => {
    const lag = buildCapitalAdviceLag(timeline);
    assert.equal(lag.capitalTexts, 3);
    assert.deepEqual(lag.sinceChange, { texts: 2, median: 0.5, min: 0, max: 1 });
    assert.deepEqual(lag.sinceRiskAppetiteCrossed, { texts: 2, median: 0.5, min: 0, max: 1 });
    assert.equal(lag.sinceFundingPressureCrossed, null);
    const [change, , pressure] = describeCapitalAdviceLag(lag);
    assert.match(change, /across 2 of the 3 capital texts; the other 1 came out before the record's first change\./);
    assert.match(pressure, /none of the 3 capital texts came after its first crossing\./);
  });

  it("scores each score alone against the advice, with the months' own shares beside it", () => {
    const alignment = buildScoreAlignment(series, timeline);
    assert.equal(alignment.riskAppetite.matches, 3, "Feb expand at 80, May conserve at 35, June expand at 60");
    assert.equal(alignment.fundingPressure.matches, 2, "funding pressure 0 matches both expand texts and neither conserve");
    const sentences = describeScoreAlignment(alignment);
    assert.match(sentences.join(" "), /Risk appetite lines up better, on 3 texts\. That is too few to rank the two scores\./);
    assert.match(sentences.join(" "), /funding pressure was at 70 or below in 100% of all months, and risk appetite above 50 in 67%/);
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

  /* 2026-10-09: the tag is the page's one judgment per entry, so it has to come
     with the line it rests on, and a quotation has to stay a short one. */
  it("tags every entry with one kind of advice and the line the tag rests on", () => {
    for (const entry of canonEssays) {
      assert.ok(ADVICE_STANCES.includes(entry.stance), entry.slug);
      assert.ok(entry.stanceBasis.trim().length > 0, `${entry.slug} has a basis`);
      for (const [, quoted] of entry.stanceBasis.matchAll(/“([^”]+)”/g)) {
        assert.ok(quoted.split(/\s+/).length <= 15, `${entry.slug}: a quotation of ${quoted.split(/\s+/).length} words`);
      }
      /* A memo is described by what it says; its firm's interest is not ours to name. */
      if (entry.kind === "investorMemo") {
        assert.doesNotMatch(`${entry.argument} ${entry.stanceBasis}`, /\b(deploy|deployment|marks|portfolio value|its own fund|interest)\b/i, `${entry.slug} states no motive`);
      }
    }
    for (const stance of ["expand", "conserve"] as const) {
      assert.ok(canonEssays.some((entry) => entry.stance === stance), `the list carries ${stance} texts`);
    }
  });

  /* The first version carried an entry credited to "Industry synthesis": a
     claim with no author is not a piece of writing anyone can go and read. */
  it("credits every entry to someone who wrote it, and every memo to its firm", () => {
    for (const entry of canonEssays) {
      if (entry.kind === "investorMemo") {
        assert.ok(entry.firm.trim().length > 0, entry.slug);
        assert.equal(entry.format, "essay", `${entry.slug}: a book is canon whoever wrote it`);
      } else {
        assert.ok(entry.authors.length > 0, `${entry.slug} is signed by a person`);
      }
      for (const author of entry.authors) {
        assert.doesNotMatch(author, /synthesis|various|and peers|anonymous|team /i, entry.slug);
        /* One person per entry: a joined name is one Person in the markup. */
        assert.doesNotMatch(author, /,| and /, `${entry.slug}: "${author}" is more than one person`);
      }
    }
  });

  it("pairs only listed texts, each tagged the way its side says, on both sides of the conditions", () => {
    const pairs = buildAdvicePairs(liveTimeline);
    assert.ok(pairs.length >= 2 && pairs.length <= 4, `${pairs.length} pairs`);
    const slugs = new Set(canonEssays.map((entry) => entry.slug));
    for (const pair of pairs) {
      assert.ok(slugs.has(pair.expand.slug) && slugs.has(pair.conserve.slug), pair.decision);
      assert.equal(pair.expand.stance, "expand", pair.decision);
      assert.equal(pair.conserve.stance, "conserve", pair.decision);
    }
    const sameConditions = pairs.filter(
      (pair) => pair.expand.reading.kind === "reading" && pair.conserve.reading.kind === "reading" && pair.expand.reading.regime === pair.conserve.reading.regime,
    );
    assert.ok(sameConditions.length > 0 && sameConditions.length < pairs.length, "counterexamples and fits both");
    assert.match(describeAdvicePairs(pairs), new RegExp(`^In ${sameConditions.length} of these ${pairs.length} pairs`));
  });

  /* The first version's defect: the regime's stock sentence printed under
     every essay as that month's guidance. */
  it("renders one H1, one anchor per entry and no per-month stock guidance", async () => {
    const html = await renderPage();
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
    for (const entry of canonEssays) {
      assert.ok(html.includes(`id="${entry.slug}"`), `anchor for ${entry.slug}`);
    }
    for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) {
      assert.ok(html.includes(`id="${target}"`), `in-page link #${target} resolves`);
    }
    assert.doesNotMatch(html, /scale proven bets|guidance that month/i);
  });

  it("prints each entry's tag and basis, and marks memos as memos", async () => {
    const html = await renderPage();
    for (const entry of canonEssays) {
      const start = html.indexOf(`id="${entry.slug}"`);
      const item = html.slice(start, html.indexOf("</li>", start)).replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
      assert.ok(item.includes(`data-advice="${entry.stance}"`), entry.slug);
      assert.ok(item.includes(ADVICE_STANCE_DEFINITIONS[entry.stance].label), entry.slug);
      assert.ok(item.includes(entry.stanceBasis), `${entry.slug} prints its basis`);
      assert.equal(item.includes("investor memo"), entry.kind === "investorMemo", entry.slug);
    }
  });

  it("draws every placed text on the plane once, with a screen-reader table of the same texts", async () => {
    const html = await renderPage();
    const figure = /<figure[^>]*data-advice-plane[^>]*>([\s\S]*?)<\/figure>/.exec(html)?.[1] ?? "";
    assert.ok(figure, "the plane renders");
    const placed = liveTimeline.filter((entry) => entry.reading.kind === "reading");
    assert.equal((figure.match(/<g data-advice="/g) ?? []).length, placed.length, "one mark per placed text");
    const table = /<div class="sr-only"><table>([\s\S]*?)<\/table><\/div>/.exec(figure)?.[1] ?? "";
    assert.equal((table.match(/<tr>/g) ?? []).length, placed.length + 1, "a header row and one row per text");
    for (const entry of placed) {
      if (entry.reading.kind !== "reading") continue;
      const row = new RegExp(`<th scope="row">${entry.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/'/g, "&#x27;")}</th><td>[^<]+</td><td>${ADVICE_STANCE_DEFINITIONS[entry.stance].label}</td><td>${entry.reading.conditions}</td><td>${entry.reading.fundingPressure}</td><td>${entry.reading.riskAppetite}</td>`);
      assert.match(table, row, entry.slug);
    }
    assert.doesNotMatch(figure.replace(/<[^>]+>/g, " "), /SCARCITY|DEFENSIVE|VOLATILE|EXPANSION/, "no engine keys");
  });

  /* No count on the page is typed: each comes from the record. The lead is the
     builder's sentence over the live record, and the builder's numbers move
     with its input (the fixture tests above). */
  it("states the measured result from the record, with no count typed into the page", async () => {
    const html = (await renderPage()).replace(/&#x27;/g, "'");
    const baseRate = buildCanonBaseRate(record, liveTimeline);
    const summary = summarizeCanonBaseRate(baseRate);
    const independent = (stance: AdviceStance, regimes: readonly RegimeKey[]) =>
      liveTimeline.filter((entry) => entry.stance === stance && entry.reading.kind === "reading" && regimes.includes(entry.reading.regime)).length;
    assert.equal(summary.expand.inSunny, independent("expand", ["EXPANSION"]));
    assert.equal(summary.conserve.inHard, independent("conserve", ["SCARCITY", "VOLATILE"]));
    assert.equal(summary.craft.inSunny, independent("craft", ["EXPANSION"]));
    assert.equal(summary.sunnyMonths, record.filter((entry) => entry.regime === "EXPANSION").length / record.length);
    assert.ok(html.includes(describeCanonBaseRate(baseRate)), "the lead is the builder's sentence");
    for (const sentence of [
      ...describeCapitalAdviceLag(buildCapitalAdviceLag(liveTimeline)),
      ...describeScoreAlignment(buildScoreAlignment(record, liveTimeline)),
      describeAdvicePairs(buildAdvicePairs(liveTimeline)),
    ]) {
      assert.ok(html.includes(sentence), sentence);
    }
    const source = readFileSync("app/concepts/page.tsx", "utf8");
    assert.doesNotMatch(source, /\b(of the|tagged|came out in)\s+\d+\b|\b\d+%/, "the route types no count or share into its copy");
  });

  /* 2026-10-07: each entry's conditions are the regime's stamp, coloured from
     the data-regime tokens, and a strip above the list draws one square per
     essay by year. Both read the timeline the entries print. */
  it("stamps each reading in its regime's colour and draws every essay once in the year strip", async () => {
    const html = await renderPage();
    for (const entry of liveTimeline) {
      const start = html.indexOf(`id="${entry.slug}"`);
      const item = html.slice(start, html.indexOf("</li>", start));
      if (entry.reading.kind === "reading") {
        /* The stamp draws its condition's weather glyph beside the word (`Tag regime`). */
        assert.match(
          item,
          new RegExp(`data-regime="${entry.reading.regime}" class="weather-tag weather-tag-regime type-stamp[^"]*"><svg[^>]*data-concept-icon="condition"[\\s\\S]*?</svg>${entry.reading.conditions}<`),
          entry.slug,
        );
      } else {
        assert.doesNotMatch(item, /weather-tag-regime/, `${entry.slug} has no conditions to stamp`);
      }
    }
    const strip = /<figure[^>]*data-essay-year-strip[^>]*>([\s\S]*?)<\/figure>/.exec(html)?.[1] ?? "";
    assert.ok(strip, "the strip renders");
    assert.equal((strip.match(/<span[^>]*title="/g) ?? []).length, liveTimeline.length, "one square per essay");
    assert.doesNotMatch(strip.replace(/<[^>]+>/g, " "), /SCARCITY|DEFENSIVE|VOLATILE|EXPANSION/, "no engine keys in the key");
  });

  /* Two ways into the rest of the site: each reading opens its year in the
     archive, and "this week" opens the published brief it compares against. */
  it("links readings to archive years that exist, and this week to its published brief", async () => {
    const { postureArchiveYears } = await import("../lib/summary/postureArchiveYears");
    const { latestPublishedBrief } = await import("../lib/report/publishedBriefs");
    const html = await renderPage();
    const years = new Set(postureArchiveYears.map((year) => year.slug));
    const linked = [...html.matchAll(/href="\/history\/(\d{4})"/g)].map(([, year]) => year);
    assert.ok(linked.length > 0, "readings link into the archive");
    for (const year of linked) assert.ok(years.has(year), `/history/${year} is a real archive page`);
    if (latestPublishedBrief) assert.ok(html.includes(`href="/brief/${latestPublishedBrief.slug}"`));
  });

  it("keeps the line that this is a reading list, not evidence for the guidance", async () => {
    assert.match(await renderPage(), /A reading list, not evidence for the guidance\./);
  });
});

describe("product canon: search and the archive", () => {
  it("joins authors the way a byline reads, and bylines a memo to its firm", () => {
    assert.equal(formatCanonAuthors({ authors: ["A"] }), "A");
    assert.equal(formatCanonAuthors({ authors: ["A", "B"] }), "A and B");
    assert.equal(formatCanonAuthors({ authors: ["A", "B", "C"] }), "A, B and C");
    assert.equal(formatCanonAuthors({ authors: [], firm: "Firm" }), "Firm");
    assert.equal(formatCanonAuthors({ authors: ["A"], firm: "Firm" }), "A, Firm");
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
    assert.ok((metadata.description ?? "").length <= 160, `${(metadata.description ?? "").length} characters`);
    const images = metadata.openGraph?.images;
    const first = Array.isArray(images) ? images[0] : images;
    const url = typeof first === "object" && first !== null && "url" in first ? String(first.url) : String(first);
    assert.match(url, /template=reading/, "not the live weekly-guidance card");
  });

  it("marks books as books, each co-author as a person and a firm-signed memo as the firm's", async () => {
    const { buildProductCanonStructuredData } = await import("../lib/seo/pageStructuredData");
    /* Read it the way a crawler does: as JSON, not as the builder's types. */
    const graph = JSON.parse(JSON.stringify(buildProductCanonStructuredData({ essays: canonEssays })));
    const page = graph["@graph"].find((node: { "@type": string }) => node["@type"] === "CollectionPage");
    const items: Array<{ "@type": string; name: string; author: Array<{ "@type": string; name: string }> }> =
      page?.mainEntity.itemListElement.map((element: { item: unknown }) => element.item) ?? [];
    assert.equal(items.length, canonEssays.length);
    assert.equal(items.find((item) => item.name === "The Mom Test")?.["@type"], "Book");
    assert.equal(items.find((item) => item.name === "The Alternative to Roadmaps")?.["@type"], "Article");
    assert.equal(items.find((item) => item.name === "Empowered")?.author.length, 2);
    for (const entry of canonEssays) {
      if (entry.kind !== "investorMemo" || entry.authors.length > 0) continue;
      assert.deepEqual(items.find((item) => item.name === entry.title)?.author, [{ "@type": "Organization", name: entry.firm }], entry.slug);
    }
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

  /* 2024, not 2010: the 2010 and 2011 pages predated the record and are gone. */
  it("leaves the section out of a year with none", async () => {
    const page = await import("../app/history/[period]/page");
    const html = renderToStaticMarkup(await page.default({ params: Promise.resolve({ period: "2024" }) }));
    assert.equal(essaysPublishedIn({ year: 2024 }).length, 0);
    assert.doesNotMatch(html, /From the reading list, published in/);
  });
});
