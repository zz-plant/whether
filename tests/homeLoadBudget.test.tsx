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
  describeBreaches,
  findBudgetBreaches,
  formatHomeLoadTable,
  HOME_LOAD_BASELINE,
  HOME_LOAD_OUT_ENV,
  measureHomeLoad,
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

  it("tells the table's reader when a cut has not been written down", () => {
    const table = formatHomeLoadTable({ ...baseline, words: baseline.words - 40, numbers: baseline.numbers + 1 }, baseline);

    assert.match(table, new RegExp(`lower the budget to ${(baseline.words - 40).toLocaleString("en-US")}`));
    assert.match(table, /OVER by 1/);
    assert.match(table, /at budget/);
  });
});

describe("the homepage stays inside its load budget", () => {
  it("renders a page whose <main> holds both scores and the areas, so the counts below measure something", async () => {
    const measured = measureHomeLoad(await renderHome(), AREAS_ID);

    assert.ok(measured.words > 500, `only ${measured.words} words in <main>`);
    assert.ok(measured.wordsBeforeAreas > 0 && measured.wordsBeforeAreas < measured.words);
    assert.ok(measured.fundingPressure > 0 && measured.riskAppetite > 0, "a renamed score would zero its count and pass");
    assert.doesNotMatch(await renderHome(), /Live data is late/, "the saved-copy banner means the live path was not rendered");
  });

  it("holds every metric at or under its budget", async () => {
    const measured = measureHomeLoad(await renderHome(), AREAS_ID);
    const outPath = process.env[HOME_LOAD_OUT_ENV];
    if (outPath) writeFileSync(outPath, JSON.stringify(measured));

    const breaches = findBudgetBreaches(measured, HOME_LOAD_BASELINE);
    assert.equal(breaches.length, 0, describeBreaches(breaches));
  });
});
