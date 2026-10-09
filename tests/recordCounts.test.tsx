import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as nextNavigation from "next/navigation";

import { buildTrackRecord, countRecord } from "../lib/report/trackRecord";
import { buildRegimeTrackRecord } from "../lib/summary/regimeTrackRecord";
import { confidenceCalibrationTotals } from "../lib/report/confidenceCalibration";
import { describeRecordCadence } from "../lib/report/trackRecordCopy";
import { getTimeMachineRegimeSeries } from "../lib/timeMachine/timeMachineCache";
import { formatMonthYearShortFromValue } from "../lib/formatters";

const mockAny: any = mock;
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
  usePathname: () => "/history",
  useSearchParams: () => new URLSearchParams(),
}));

/*
 * The record's counts, from one function (site review, 2026-10-09). /history said
 * "7 changes" for the whole record and "5 in 60 mo" under the same label;
 * /calibration said "Six changes in conditions in fourteen years", written at the
 * August close; /about said "177 months" and /calibration "176 month-end readings".
 * Seven is right: September 2026 (Sunny to Freezing) is the seventh change, and the
 * six was prose that predates it. 176 is the comparisons, 177 the readings: the
 * newest month has no following month to be held or changed against.
 */

const textOf = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

const full = getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER);
const counts = countRecord(full);
const recent = countRecord(getTimeMachineRegimeSeries(60));

describe("the record's counts", () => {
  it("come from one function, which every derivation agrees with", () => {
    assert.ok(counts && recent);
    assert.equal(counts.comparisons, counts.readings - 1, "a comparison needs a following month");
    const record = buildTrackRecord(full);
    assert.equal(record?.monthsCovered, counts.readings);
    assert.equal(record?.regimeChanges, counts.changes);
    assert.equal(buildRegimeTrackRecord(full).transitions.length, counts.changes, "the grader counts the same changes");
    assert.equal(buildRegimeTrackRecord(getTimeMachineRegimeSeries(60)).transitions.length, recent.changes);
    assert.equal(recent.readings, 60);
  });

  /* The calibration study reads its own extract of the archive. Its pairs are the
     comparisons, and the months that did not hold are the changes; if either
     source moves without the other, this fails before a page can disagree. */
  it("agree with the calibration study's sample", () => {
    assert.ok(counts);
    const totals = confidenceCalibrationTotals();
    assert.equal(totals.months, counts.comparisons);
    assert.equal(totals.months - totals.held, counts.changes);
  });

  it("print with their window on /history, /calibration and /about, and never as written-out stale prose", async () => {
    assert.ok(counts && recent);
    const since = formatMonthYearShortFromValue(counts.firstRecordDate);
    const through = formatMonthYearShortFromValue(counts.latestRecordDate);

    const history = textOf(renderToStaticMarkup(await (await import("../app/history/page")).default({ searchParams: Promise.resolve({}) })));
    /* Once each (2026-10-09): the reading count is the "Months on record" tile, and the
       published-briefs line no longer prints "177 month-end readings, Jan 2012 to Sep
       2026" a second time; the change count is its tile, not also the band's caption. */
    assert.ok(history.includes(`Months on record ${counts.readings} since ${since}`), "the readings tile carries its window");
    assert.ok(!history.includes(`${counts.readings} month-end readings`), "the readings are counted once");
    assert.ok(history.includes(`Changes in conditions ${counts.changes} since ${since}`), "the record tile carries its window");
    assert.ok(!history.includes(`${counts.changes} changes in conditions`), "the band's caption does not repeat the change count");
    assert.ok(history.includes(`Changes in conditions ${recent.changes} in the last ${recent.readings} months`), "the grading tile carries its window");

    const calibration = textOf(renderToStaticMarkup((await import("../app/calibration/page")).default()));
    assert.ok(calibration.includes(`${counts.changes} changes in conditions since ${since}`), "the study counts the record's changes");
    assert.ok(calibration.includes(`The record holds ${counts.readings} readings, ${since} to ${through}`), "the study says why it compares one fewer");

    assert.ok(describeRecordCadence(buildTrackRecord(full)!).startsWith(`Since ${since}, conditions have changed ${counts.changes} times in ${counts.readings} months`));

    for (const [name, text] of [["/history", history], ["/calibration", calibration]] as const) {
      assert.doesNotMatch(text, /\b(five|six|seven|eight) changes\b|fourteen years|\b17[5-7] months of\b/i, `${name} prints a written-out count`);
    }
  });
});
