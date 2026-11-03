import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { afterEach, beforeEach, describe, it, mock, setSystemTime } from "bun:test";
import { renderToReadableStream } from "react-dom/server";
import type { unstable_cache } from "next/cache";
import * as nextNavigation from "next/navigation";
import snapshotFallback from "../data/snapshot_fallback.json";
import { resetOperatingSnapshotStore } from "../lib/operatingState/snapshotStore";
import { HOME_SECTIONS } from "../lib/report/home/homeSectionModel";
import { assembleHomePage } from "../lib/report/homePageAssembler";
import * as homePageAssemblyLoader from "../lib/report/homePageAssemblyLoader";
import { createHomePageReportDataLoader } from "../lib/report/homePageData";
import { parseOperatorContextFromCookies } from "../lib/report/operatorContext";
import { loadReportDataSafe } from "../lib/report/reportData";
import {
  countSyllables,
  describeBreaches,
  findBudgetBreaches,
  fleschKincaidGrade,
  formatHomeLoadDetail,
  formatHomeLoadTable,
  HOME_LOAD_BASELINE,
  HOME_LOAD_OUT_ENV,
  measureHomeLoad,
  readHomeLoad,
  splitSentences,
  type HomeLoadMeasure,
} from "../scripts/check-home-load";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";

serveUnreachableUpstreams();

const mockAny: any = mock;

/* Spread the real modules and override only what a render outside a request
   needs: `mock.module` is process-wide, and a narrower stub breaks other suites. */
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
}));

/*
 * The page a reader gets from a healthy week, rendered offline (2026-11-03).
 *
 * Nothing is served here, so the real read falls back to the bundled reading and marks it a
 * saved copy; `/` then draws the saved-copy page (a banner, no line-state band), which
 * `savedCopyHomepage.test.tsx` pins and which is not the page production serves. The marks
 * come off, so the route takes its live path over the bundled numbers. The clock stands at
 * the bundled reading's own fetch time, so nothing about its age moves the page as the
 * weeks go by. The route's loader reads the request's cookies and the data cache, neither
 * of which exists outside a request; this is the same assembly with no cookie and no cache.
 */
const asLiveRead: typeof loadReportDataSafe = async (...args) => {
  const result = await loadReportDataSafe(...args);
  if (!result.ok) return result;
  return { ...result, data: { ...result.data, treasury: { ...result.data.treasury, fallback_at: null, fallback_reason: null } } };
};

const uncached: typeof unstable_cache = (load) => load;
mockAny.module("../lib/report/homePageAssemblyLoader", () => ({
  ...homePageAssemblyLoader,
  loadHomePageAssembly: async (searchParams?: Parameters<typeof homePageAssemblyLoader.loadHomePageAssembly>[0]) => {
    const operatorContext = parseOperatorContextFromCookies("");
    const homepage = await assembleHomePage(
      { searchParams, operatorContext },
      { loadHomePageReportData: createHomePageReportDataLoader({ unstableCache: uncached, loadReportDataSafe: asLiveRead }) },
    );
    return { homepage, reportData: homepage.reportResult.ok ? homepage.reportResult.data : homepage.reportResult.fallback, operatorContext };
  },
}));

let rendered: Promise<string> | undefined;
const renderHome = () =>
  (rendered ??= (async () => {
    resetOperatingSnapshotStore();
    try {
      const { default: HomePage } = await import("../app/page");
      const stream = await renderToReadableStream(await HomePage({ searchParams: Promise.resolve({}) }));
      await stream.allReady;
      return await new Response(stream).text();
    } finally {
      resetOperatingSnapshotStore();
    }
  })());

beforeEach(() => setSystemTime(new Date(snapshotFallback.fetched_at)));
afterEach(() => setSystemTime());

const AREAS_ID = HOME_SECTIONS.areas.id;

const page = (inner: string, beforeAreas = "") =>
  `<html><body><header>Skip this</header><main id="main-content" class="x">${beforeAreas}<section id="${AREAS_ID}">${inner}</section></main><footer>Or this</footer></body></html>`;

describe("the homepage load census counts what a reader meets", () => {
  it("counts words, numbers and the words ahead of the areas, once each", () => {
    const measured = measureHomeLoad(
      page("<h2>Your decisions this week</h2><p>Hiring is 8 pts away: 12–24 mo.</p>", "<h1>Hold hiring.</h1><p>Funding pressure 32 &amp; risk appetite 52.</p>"),
      AREAS_ID,
    );

    assert.equal(measured.wordsBeforeAreas, 8, "Hold hiring. Funding pressure 32 & risk appetite 52.");
    assert.equal(measured.words, 8 + 4 + 7, "ahead of the areas, the heading, then the paragraph; the header and footer are outside <main>");
    assert.equal(measured.numbers, 2 + 3, "32 and 52 ahead; 8, 12 and 24 after");
  });

  it("counts a fold, a button and each kind of field, and ignores scripts, styles and comments", () => {
    const measured = measureHomeLoad(
      page(
        `<details><summary>How</summary>Because.</details><details open="">One more</details>
         <button type="button">Copy</button><button>Share</button><button class="a">Get</button>
         <input type="radio"/><input type="text" value=""/><select><option>a</option></select><textarea></textarea>
         <script>var details = "<details><button><input>";</script><style>.button { content: "10 11 12" }</style><!-- <details> 99 -->`,
      ),
      AREAS_ID,
    );

    assert.deepEqual(
      { folds: measured.folds, buttons: measured.buttons, fields: measured.fields, numbers: measured.numbers },
      { folds: 2, buttons: 3, fields: 4, numbers: 0 },
    );
  });

  it("counts each score name in any case, across the tags and comments that split it", () => {
    const measured = measureHomeLoad(
      page("<p>Funding pressure 32. <b>Funding</b> <i>pressure</i> fell; funding pressure<!-- -->, then FUNDING PRESSURE.</p><p>Risk appetite rose. Then risk&nbsp;appetite fell; risk appetite held.</p>"),
      AREAS_ID,
    );

    assert.equal(measured.fundingPressure, 4);
    assert.equal(measured.riskAppetite, 3);
  });

  it("does not count the arrows and dots between words", () => {
    const measured = measureHomeLoad(page("<p>Risk appetite → Funding pressure ↑ · 52 of 100</p>"), AREAS_ID);

    assert.equal(measured.words, 7);
  });

  it("refuses a page it cannot measure, so a renamed section cannot pass as zero", () => {
    assert.throws(() => measureHomeLoad("<html><body><p>No main.</p></body></html>", AREAS_ID), /no <main id="main-content">/);
    assert.throws(
      () => measureHomeLoad(`<main id="main-content"><section id="renamed">Hold.</section></main>`, AREAS_ID),
      /no element with id="what-it-changes"/,
    );
  });
});

describe("the jargon census counts the terms a reader without macro background will not know", () => {
  const found = (inner: string) =>
    Object.fromEntries(Object.entries(readHomeLoad(page(inner), AREAS_ID).detail.jargonTerms).filter(([, hits]) => hits > 0));

  it("counts each term once, the longer term claiming its words, and totals them", () => {
    const inner =
      "<p>The 1-month Treasury bill rate and the yield curve. A High-Yield spread beside a credit spread; VIX, FRED, the 10Y−2Y, the 10Y-2Y, 10Y and 2Y. " +
      "Basis points, one percentage point. T-bills and Treasuries. Inverted: an inversion. Base rate, policy rate, hysteresis.</p>";

    assert.deepEqual(found(inner), {
      Treasury: 2,
      "T-bill": 1,
      "bill rate": 1,
      "yield curve": 1,
      "10Y": 1,
      "2Y": 1,
      "10Y−2Y": 2,
      spread: 1,
      "credit spread": 1,
      "high-yield": 1,
      "basis point(s)": 1,
      "percentage point(s)": 1,
      VIX: 1,
      FRED: 1,
      "inverted/inversion": 2,
      "base rate": 1,
      "policy rate": 1,
      hysteresis: 1,
    });
    assert.equal(measureHomeLoad(page(inner), AREAS_ID).jargon, 21, "the budget is every occurrence; a bare 'yield' is not counted inside 'yield curve'");
  });

  it("counts a word only as a whole word, in any case", () => {
    assert.deepEqual(found("<p>Fredrick read a spreadsheet, a yielding field, the Treasurer's notes, 12Y, 2Years and an inverter.</p>"), {});
    assert.deepEqual(found("<p>TREASURY, vix, Hysteresis and Yields.</p>"), { Treasury: 1, VIX: 1, hysteresis: 1, yield: 1 });
  });

  it("counts across the tags that split a term, and not in a script", () => {
    assert.deepEqual(found("<p>The <b>yield</b> <i>curve</i><script>var vix = 1;</script></p>"), { "yield curve": 1 });
  });
});

describe("the reading-level census grades the sentences a reader parses", () => {
  const HARD = "Treasury yields signal that institutional borrowers anticipate contractionary monetary policy implementation.";
  const EASY = "Hold hiring until runway is clear.";
  const read = (inner: string) => readHomeLoad(page(inner), AREAS_ID);

  it("counts syllables as vowel groups, less a silent ending, one for a number, by part for a compound", () => {
    const cases: [string, number][] = [
      ["the", 1],
      ["yield", 1],
      ["spread", 1],
      ["rates", 1],
      ["closed", 1],
      ["needed", 2],
      ["table", 2],
      ["Treasury", 3],
      ["inversion", 3],
      ["percentage", 3],
      ["hysteresis", 4],
      ["52", 1],
      ["$2.1M", 1],
      ["T-bill", 2],
      ["year-over-year", 4],
      ["10Y−2Y", 2],
    ];
    for (const [word, syllables] of cases) assert.equal(countSyllables(word), syllables, word);
  });

  it("grades a sentence with Flesch-Kincaid: long words raise it, length alone does not", () => {
    const grade = (sentence: string) => Math.round(fleschKincaidGrade(sentence) * 100) / 100;

    assert.equal(grade("The cat sat on the mat."), -1.45, "6 words, 6 syllables: 0.39 x 6 + 11.8 x 1 - 15.59");
    assert.equal(grade(EASY), 4.45);
    assert.ok(fleschKincaidGrade(HARD) > 12, HARD);
    assert.ok(
      fleschKincaidGrade("The cat sat on the mat and the dog sat on the log and the cow ate hay in the barn.") < 6,
      "20 short words stay easy",
    );
    assert.ok(fleschKincaidGrade("Funding pressure rises 38 pts from 32 to clear 70, or risk appetite falls 2 pts from 52 to 50 or below.") < 12, "figures do not make a sentence hard");
    assert.equal(fleschKincaidGrade(""), 0);
  });

  it("splits sentences at . ! ? and not inside a number, an abbreviation or a lowercase run-on", () => {
    assert.deepEqual(splitSentences("Hold hiring. Pause spending! Why now? Because rates rose."), ["Hold hiring.", "Pause spending!", "Why now?", "Because rates rose."]);
    assert.deepEqual(splitSentences("The rate rose 0.22 percentage points. Then it fell."), ["The rate rose 0.22 percentage points.", "Then it fell."]);
    assert.deepEqual(splitSentences("Use e.g. spreads, not levels. Then wait."), ["Use e.g. spreads, not levels.", "Then wait."]);
    assert.deepEqual(splitSentences("U.S. companies borrow less. Fewer hire."), ["U.S. companies borrow less.", "Fewer hire."]);
    assert.deepEqual(splitSentences("It is 8 pts. Roadmap is next."), ["It is 8 pts. Roadmap is next."], "pts. is an abbreviation here");
    assert.deepEqual(splitSentences('He said "hold." Then he left. (Risk is 52.) Hold.'), ['He said "hold."', "Then he left.", "(Risk is 52.)", "Hold."]);
    assert.deepEqual(splitSentences("Prices rose... then fell. Stay put."), ["Prices rose... then fell.", "Stay put."]);
    assert.deepEqual(splitSentences("A heading with no end mark"), ["A heading with no end mark"]);
    assert.deepEqual(splitSentences("   "), []);
  });

  it("counts the sentences above grade 12 and the longest sentence in words", () => {
    const measured = read(`<p>${HARD} ${EASY}</p><p>${EASY}</p>`).measure;

    assert.equal(measured.hardSentences, 1);
    assert.equal(measured.longestSentence, 11, "the hard sentence has 11 words; the easy one, 6");
    assert.equal(read(`<p>${EASY}</p>`).measure.hardSentences, 0);
  });

  it("ends a sentence at a block, a table cell, a middle dot and an element that touches the next", () => {
    assert.equal(read("<p>Hold hiring until runway is clear</p><p>Pause new bets until cash is safe</p>").measure.longestSentence, 7);
    assert.deepEqual(
      read("<p>Hold hiring until runway is clear</p><p>Pause new bets until cash is safe</p>").detail.longestSentence,
      { text: "Pause new bets until cash is safe", words: 7 },
    );
    assert.equal(read("<p>Hold.</p>").detail.longestSentence, null, "a page with no sentence reads as none, not as an empty one");
    assert.equal(read("<ul><li>Hold hiring until runway is clear</li><li>Pause new bets until cash is safe</li></ul>").measure.longestSentence, 7);
    assert.equal(read("<p>Hold hiring until runway is clear · Pause new bets until cash is safe</p>").measure.longestSentence, 7);
    assert.equal(read("<table><tr><td>Hold hiring until runway is clear</td><td>Pause new bets until cash is safe</td></tr></table>").measure.longestSentence, 7);
    assert.equal(read("<p>Hold <b>hiring</b> until <a href=\"/x\">runway</a> is clear.</p>").measure.longestSentence, 6, "inline tags run on inside the sentence");
    assert.equal(read("<p>Hold hiring<br/>until runway is clear</p>").measure.longestSentence, 0, "a break ends a block; neither half is five words");
  });

  it("skips labels and figures: under five words with a letter, a row of values, a chart's text", () => {
    assert.equal(read("<h2>Your decisions this week</h2><p>Range 0–1.85</p><p>52 100 12 24 8 70 44 pts</p>").measure.longestSentence, 0);
    assert.equal(read("<span>Seed</span><span>Pre-revenue or early revenue</span>").measure.longestSentence, 0, "a name and its description are two labels");
    assert.equal(read("<table><tr><th>Metric</th><th>Range</th></tr><tr><td>BBB spread</td><td>Range 0–1.85</td><td>2.63–3.46</td></tr></table>").measure.longestSentence, 0);
    assert.equal(read("<svg><svg><path d=\"M0 0\"/></svg><title>Funding pressure change line at 70</title><text>Jan Feb Mar Apr May</text></svg>").measure.longestSentence, 0);
    assert.equal(read("<script>var line = 'Hold hiring until runway is clear.';</script><style>.a { content: 'Pause new bets until cash is safe' }</style>").measure.longestSentence, 0);
  });

  it("lists the hardest distinct sentences, hardest first, with how many times the page says each", () => {
    const { hardestSentences } = read(`<p>${EASY}</p><p>${HARD}</p><p>${HARD}</p><p>Pause new bets until cash is safe.</p>`).detail;

    assert.deepEqual(
      hardestSentences.map(({ text, times }) => [text, times]),
      [
        [HARD, 2],
        [EASY, 1],
        ["Pause new bets until cash is safe.", 1],
      ],
    );
    assert.ok(hardestSentences[0] !== undefined && hardestSentences[0].grade > 12);
    assert.equal(read(Array.from({ length: 7 }, (_, at) => `<p>${HARD.slice(0, -1)} ${at}.</p>`).join("")).detail.hardestSentences.length, 5, "five are listed, however many are hard");
  });
});

describe("the budget only falls", () => {
  const baseline: HomeLoadMeasure = { ...HOME_LOAD_BASELINE };

  it("passes at the budget and below it, and names each metric that rose", () => {
    assert.deepEqual(findBudgetBreaches(baseline, baseline), []);
    assert.deepEqual(findBudgetBreaches({ ...baseline, words: baseline.words - 1, folds: 0 }, baseline), []);

    const breaches = findBudgetBreaches({ ...baseline, folds: baseline.folds + 1, riskAppetite: baseline.riskAppetite + 3 }, baseline);
    assert.deepEqual(
      breaches.map(({ metric, measured, baseline: budget }) => [metric, measured, budget]),
      [
        ["folds", baseline.folds + 1, baseline.folds],
        ["riskAppetite", baseline.riskAppetite + 3, baseline.riskAppetite],
      ],
    );
  });

  it("says which metric, its value and the budget, and how a cut lowers the budget", () => {
    const message = describeBreaches(findBudgetBreaches({ ...baseline, buttons: baseline.buttons + 2 }, baseline));

    assert.ok(message.includes(`<button>s: ${baseline.buttons + 2}, budget ${baseline.buttons} (+2)`), message);
    assert.match(message, /bun run check:home-load/);
    assert.match(message, /HOME_LOAD_BASELINE \(scripts\/check-home-load\.ts\)/);
    assert.match(message, /lower only/);
  });

  it("names the way down for a reading metric, and for no other", () => {
    const message = describeBreaches(
      findBudgetBreaches({ ...baseline, jargon: baseline.jargon + 1, hardSentences: baseline.hardSentences + 2, longestSentence: baseline.longestSentence + 4, words: baseline.words + 1 }, baseline),
    );

    assert.ok(message.includes(`Jargon terms: ${baseline.jargon + 1}, budget ${baseline.jargon} (+1)`), message);
    assert.ok(message.includes(`Sentences above grade 12: ${baseline.hardSentences + 2}, budget ${baseline.hardSentences} (+2)`), message);
    assert.ok(message.includes(`Longest sentence (words): ${baseline.longestSentence + 4}, budget ${baseline.longestSentence} (+4)`), message);
    assert.match(message, /To lower "Jargon terms": say the plain thing/);
    assert.match(message, /To lower "Sentences above grade 12": split the sentence/);
    assert.match(message, /To lower "Longest sentence \(words\)": split the longest sentence/);
    assert.doesNotMatch(message, /To lower "Words in main"/);
  });

  it("prints the jargon per term and the hardest sentences beside the table", () => {
    const detail = formatHomeLoadDetail({
      jargonTerms: { Treasury: 1, yield: 4, spread: 0, VIX: 0 },
      longestSentence: { text: "The longest one of all.", words: 23 },
      hardestSentences: [
        { text: "A very long sentence.", words: 1234, grade: 17.25, times: 3 },
        { text: "A shorter one.", words: 9, grade: 12.4, times: 1 },
      ],
    });

    assert.match(detail, /yield: 4\n {2}Treasury: 1\n {2}not on the page: spread, VIX/, "most-used first, the absent on one line");
    assert.match(detail, /The 2 hardest sentences/);
    assert.match(detail, /1\. grade 17\.3, 1,234 words, said 3 times: A very long sentence\./);
    assert.match(detail, /2\. grade 12\.4, 9 words: A shorter one\./);
    assert.match(detail, /The longest sentence \(23 words\): The longest one of all\./);
  });

  it("tells the table's reader when a cut has not been written down", () => {
    const table = formatHomeLoadTable({ ...baseline, words: baseline.words - 40, numbers: baseline.numbers + 1 }, baseline);

    assert.match(table, new RegExp(`lower the budget to ${(baseline.words - 40).toLocaleString("en-US")}`));
    assert.match(table, /OVER by 1/);
    assert.match(table, /at budget/);
    assert.match(table, /Jargon terms\s+\d+\s+\d+\s+at budget/);
    assert.match(table, /Sentences above grade 12\s+\d+\s+\d+\s+at budget/);
    assert.match(table, /Longest sentence \(words\)\s+\d+\s+\d+\s+at budget/);
  });
});

describe("the homepage stays inside its load budget", () => {
  it("renders a page whose <main> holds both scores and the areas, so the counts below measure something", async () => {
    const measured = measureHomeLoad(await renderHome(), AREAS_ID);

    assert.ok(measured.words > 500, `only ${measured.words} words in <main>`);
    assert.ok(measured.wordsBeforeAreas > 0 && measured.wordsBeforeAreas < measured.words);
    assert.ok(measured.fundingPressure > 0 && measured.riskAppetite > 0, "a renamed score would zero its count and pass");
    assert.ok(measured.longestSentence >= 5, "no sentence read means the reading metrics would pass on nothing");
    assert.doesNotMatch(await renderHome(), /Live data is late/, "the saved-copy banner means the live path was not rendered");
  });

  it("holds every metric at or under its budget", async () => {
    const reading = readHomeLoad(await renderHome(), AREAS_ID);
    const outPath = process.env[HOME_LOAD_OUT_ENV];
    if (outPath) writeFileSync(outPath, JSON.stringify(reading));

    const breaches = findBudgetBreaches(reading.measure, HOME_LOAD_BASELINE);
    assert.equal(breaches.length, 0, describeBreaches(breaches));
  });
});
