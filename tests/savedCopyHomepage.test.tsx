import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToReadableStream, renderToStaticMarkup } from "react-dom/server";
import type { unstable_cache } from "next/cache";
import * as nextNavigation from "next/navigation";
import snapshotFallback from "../data/snapshot_fallback.json";
import { TrustStrip } from "../app/components/trustStrip";
import { formatDateUTC } from "../lib/formatters";
import { resetOperatingSnapshotStore } from "../lib/operatingState/snapshotStore";
import { assembleHomePage } from "../lib/report/homePageAssembler";
import * as homePageAssemblyLoader from "../lib/report/homePageAssemblyLoader";
import { createHomePageReportDataLoader } from "../lib/report/homePageData";
import { parseOperatorContextFromCookies } from "../lib/report/operatorContext";
import { buildTrustStripProps } from "../lib/report/evidenceReaderModel";
import { buildHomeAreaRows, describePauseLineCount } from "../lib/report/home/homeSectionModel";
import { describeSavedCopyBanner } from "../lib/report/trustStatus";
import { buildCanonicalBoundedDecisionRules } from "../lib/report/boundedDecisionRules";
import { DEFAULT_THRESHOLDS } from "../lib/regimeEngineCore";
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

/* The route's own loader reads the request's cookies and the data cache, neither of
   which exists outside a request; this is the same assembly with no cookie and no
   cache. Only `app/page` imports the module, and no other suite renders it. */
const uncached: typeof unstable_cache = (load) => load;
mockAny.module("../lib/report/homePageAssemblyLoader", () => ({
  ...homePageAssemblyLoader,
  loadHomePageAssembly: async (searchParams?: Parameters<typeof homePageAssemblyLoader.loadHomePageAssembly>[0]) => {
    const operatorContext = parseOperatorContextFromCookies("");
    const homepage = await assembleHomePage(
      { searchParams, operatorContext },
      { loadHomePageReportData: createHomePageReportDataLoader({ unstableCache: uncached }) },
    );
    return { homepage, reportData: homepage.reportResult.ok ? homepage.reportResult.data : homepage.reportResult.fallback, operatorContext };
  },
}));

/*
 * A saved copy says one thing (2026-11-02).
 *
 * When the report read fails, the homepage serves the bundled reading. Read on
 * Oct 21 that was the Jun 17 copy, and the page said, top to bottom: "Live data
 * is late … hold new hires, spend and vendor contracts until it returns", a
 * call holding "anything you can't undo until the missing inputs return", "No
 * area is on hold.", restart lines "2 pts away" for areas nothing had paused,
 * "Could change next week" about a four-month-old reading, and "No previous
 * week to compare". A reader could not tell whether to hold hiring.
 *
 * Rendered from the route itself while the operating-state store is down, an
 * outage the fallback exists for: every live read asks it for the latest
 * snapshot, so the read fails whatever the binding or the file order. Each
 * assertion is a property that was false.
 */
let rendered: Promise<string> | undefined;
const renderSavedCopy = () =>
  (rendered ??= (async () => {
    Object.assign(resetOperatingSnapshotStore(), {
      readLatest: async () => {
        throw new Error("operating state unavailable");
      },
    });
    try {
      const { default: HomePage } = await import("../app/page");
      const stream = await renderToReadableStream(await HomePage({ searchParams: Promise.resolve({}) }));
      await stream.allReady;
      return await new Response(stream).text();
    } finally {
      resetOperatingSnapshotStore();
    }
  })());

const decode = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const firstMatch = (html: string, pattern: RegExp) => decode(pattern.exec(html)?.[1] ?? "");

const page = async () => {
  const html = await renderSavedCopy();
  return {
    html,
    text: decode(html),
    banner: firstMatch(html, /<p class="weather-caveat-band weather-caveat-mark[^"]*">(.*?)<\/p>/s),
    call: firstMatch(html, /id="weekly-call-title"[^>]*>(.*?)<\/h1>/s),
    strip: /data-trust-strip[^>]*>(.*?)<\/dl>/s.exec(html)?.[1] ?? "",
    /* Each group of areas: its condition, and the areas it holds (`AreaGroups`). */
    areaGroups: [...html.matchAll(/<section aria-label="[^"]*" class="[^"]*py-4">(.*?)<\/section>/gs)].map((match) => ({
      condition: firstMatch(match[1] ?? "", /data-group-condition="true">(.*?)<\/p>/s),
      areas: [...(match[1] ?? "").matchAll(/id="area-([a-z-]+)"/g)].map((area) => area[1] ?? ""),
    })),
  };
};

describe("the saved-copy homepage", () => {
  const readingDate = formatDateUTC(snapshotFallback.record_date);

  it("is the saved copy, so the rest of this file tests something", async () => {
    const { html, banner } = await page();
    assert.match(html, /Saved copy/);
    assert.ok(banner.length > 0, "the banner renders on a failed read");
  });

  it("says how late the data is: the reading's date and its age", async () => {
    const { banner } = await page();
    assert.ok(banner.includes(`the ${readingDate} reading`), banner);
    assert.match(banner, /\d+ (day|week|month)s? old|less than a day old/);
  });

  it("gives the hold once: the held call carries it, and the banner states the facts", async () => {
    const { banner, call } = await page();
    assert.match(call, /hold anything you can't undo/i);
    assert.doesNotMatch(banner, /\bhold\b|keep your current plan/i);
  });

  it("does not say no area is on hold under a hold", async () => {
    const { text } = await page();
    assert.doesNotMatch(text, /No area is on hold/);
    assert.match(text, new RegExp(`(No area was|\\d+ of \\d+ areas (was|were)) on hold on the ${readingDate} reading\\.`));
  });

  it("prints one side per area: its restart line on hold, else its pause line", async () => {
    const { areaGroups } = await page();
    assert.equal(areaGroups.flatMap((group) => group.areas).length, 5);
    for (const { areas, condition } of areaGroups) {
      assert.match(condition, /^(Pauses if|Restarts when) /, `${areas.join(", ")}: ${condition}`);
      // No restart line on an area with nothing to restart, and no pause line it is already past.
      assert.doesNotMatch(condition, /nothing to resume|in effect/, `${areas.join(", ")}: ${condition}`);
    }
  });

  it("says nothing about next week about a reading that is not this week's", async () => {
    const { strip } = await page();
    assert.ok(strip.length > 0);
    assert.doesNotMatch(strip, /data-next-week|next week|Past conditions held/);
  });

  it("states that the reading is old where it has nothing to compare", async () => {
    const { text } = await page();
    assert.doesNotMatch(text, /No previous week to compare/);
    assert.ok(text.includes(`this is the saved ${readingDate} reading`));
  });
});

describe("the age of a saved reading", () => {
  const now = new Date("2026-10-21T12:00:00Z");

  it("is said in the unit a reader would use", () => {
    const age = (recordDate: string) =>
      describeSavedCopyBanner({ recordDate, now, guidanceHeld: true }).match(/reading(?:, (.+))?\.$/)?.[1];
    assert.equal(age("2026-10-21"), "less than a day old");
    assert.equal(age("2026-10-20"), "1 day old");
    assert.equal(age("2026-10-09"), "12 days old");
    assert.equal(age("2026-09-15"), "5 weeks old");
    assert.equal(age("2026-06-17"), "4 months old");
    assert.equal(age("not a date"), undefined);
  });

  it("carries the hold in the banner only where the call does not", () => {
    assert.equal(
      describeSavedCopyBanner({ recordDate: "2026-06-17", now, guidanceHeld: true }),
      "Live data is late, so this is the Jun 17, 2026 reading, 4 months old.",
    );
    assert.match(
      describeSavedCopyBanner({ recordDate: "2026-06-17", now, guidanceHeld: false }),
      /4 months old\. Keep your current plan; hold new hires, spend and vendor contracts until live data returns\.$/,
    );
  });
});

describe("a saved copy's lines are the reading's", () => {
  const rowsAt = (riskAppetite: number) => {
    const scores = { tightness: 30, riskAppetite };
    return buildHomeAreaRows({
      decisionRules: buildCanonicalBoundedDecisionRules({ regime: "EXPANSION", thresholds: DEFAULT_THRESHOLDS, scores }),
      movement: null,
      scores,
    });
  };
  const hiring = (rows: ReturnType<typeof rowsAt>) => rows.find((row) => row.area === "hiring");

  it("prints a restart line between the two lines as nothing to resume, and a held one as a distance", () => {
    const between = hiring(rowsAt(52));
    assert.equal(between?.pause?.met, false);
    assert.equal(between?.resume?.distance, "nothing to resume");
    assert.equal(between?.resume?.points, 2, "the distance stays a fact of the row");
    const held = hiring(rowsAt(40));
    assert.equal(held?.pause?.met, true);
    assert.equal(held?.resume?.distance, "14 pts away");
  });

  it("dates the count over the areas", () => {
    const rows = rowsAt(40);
    const live = describePauseLineCount(rows);
    assert.match(live ?? "", /^\d of 5 areas are on hold\.$/);
    assert.equal(
      describePauseLineCount(rows, "Jun 17, 2026"),
      live?.replace("are on hold.", "were on hold on the Jun 17, 2026 reading."),
    );
    assert.equal(describePauseLineCount(rowsAt(52), "Jun 17, 2026"), "No area was on hold on the Jun 17, 2026 reading.");
  });

  it("keeps a live reading's next-week forecast", () => {
    const base = {
      recordDateLabel: "Oct 30, 2026",
      confidenceLabel: "MED" as const,
      assessment: {
        diagnostics: { transitionWatch: true },
        scores: { tightness: 30, riskAppetite: 52 },
        thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
      },
    };
    const live = renderToStaticMarkup(<TrustStrip {...buildTrustStripProps({ ...base, isFallback: false })} />);
    const saved = renderToStaticMarkup(<TrustStrip {...buildTrustStripProps({ ...base, isFallback: true })} />);
    assert.match(live, /Could change next week/);
    assert.doesNotMatch(saved, /next week|Past conditions held/);
    assert.ok(saved.includes("A common risk-appetite move"), "a saved copy still states its distance");
  });
});
