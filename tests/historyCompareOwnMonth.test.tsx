import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as nextNavigation from "next/navigation";
import { loadReportData } from "../lib/report/reportData";
import type { MacroSeriesId } from "../lib/types";

const mockAny: any = mock;

/* The period pickers reach the router through next/navigation, which
   renderToStaticMarkup never mounts. Spread, not replaced: `mock.module` is
   process-wide. */
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

/*
 * /history/compare prints two months side by side, and each column has to be
 * that month's. It printed this week's borrowing premium, inflation and
 * unemployment under Mar 31, 2020 (the report returned the macro series fetched
 * today for every selection), and "0.00%" for the change between them. Every
 * check here reads a value against the thing it claims to be, so a reword cannot
 * pass by accident.
 *
 * Offline: the replayed months read the bundled archive, the current week the
 * bundled snapshot.
 */

const MACRO_IDS: MacroSeriesId[] = ["BBB_CREDIT_SPREAD", "CPI_YOY", "UNEMPLOYMENT_RATE"];

const plainText = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

const renderCompare = async (searchParams: Record<string, string>) => {
  const page = await import("../app/history/compare/page");
  const html = renderToStaticMarkup(await page.default({ searchParams: Promise.resolve(searchParams) }));
  const text = plainText(html);
  /* The side-by-side grid is the last thing on the page before the footer, and
     its second column opens with the "Period B" eyebrow. */
  const grid = plainText(html.slice(html.indexOf('id="ops-compare-grid"')));
  const split = grid.indexOf("Period B");
  return { text, columnA: grid.slice(0, split), columnB: grid.slice(split) };
};

describe("a replayed month carries its own macro readings, or none", () => {
  it("returns the series as of the selected month-end, never today's values", async () => {
    const historical = await loadReportData({ month: "3", year: "2020" });
    assert.ok(historical.historicalSelection);
    const asOf = historical.treasury.record_date;

    for (const id of MACRO_IDS) {
      const reading = historical.macroSeries.find((entry) => entry.id === id);
      assert.ok(reading, `${id} is still listed`);
      assert.equal(reading.value, null, `${id} has no observation on record for ${asOf}; it printed today's`);
    }
    for (const reading of historical.macroSeries) {
      assert.ok(
        reading.value === null || reading.record_date <= asOf,
        `${reading.id} carries ${reading.value} from ${reading.record_date}, after the month it is printed under (${asOf})`,
      );
    }
  });
});

describe("/history/compare draws each period from its own month", () => {
  it("prints 'not on record' for a past month's missing inputs, and no invented zero between the two", async () => {
    const { text, columnA, columnB } = await renderCompare({ yearB: "2020", monthB: "3" });

    const notOnRecord = columnB.match(/Not on record for this month/g) ?? [];
    assert.equal(notOnRecord.length, MACRO_IDS.length, "Mar 2020's three macro rows say the record has none");
    assert.match(columnA, /Corporate borrowing premium Extra interest[^.]*\. \d+\.\d{2}%/, "the current week keeps its own figure");

    assert.doesNotMatch(text, /0\.00%/, "a missing side was read as zero");
    assert.match(text, /Not on record for Period B \(Mar 31, 2020\)\./);
  });
});
