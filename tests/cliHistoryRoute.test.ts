import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { NextRequest } from "next/server";
import { GET } from "../app/api/cli/history/route";
import { loadReportDataSafe } from "../lib/report/reportData";
import { resolvePublishedConfidence } from "../lib/report/confidence";
import { formatConfidencePlainLabel } from "../lib/report/reportFormatting";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";

serveUnreachableUpstreams();

/*
 * /api/cli/history printed this week's margin and trend on every month-end until 2026-10-27:
 * a year of rows all read "Close to the line" and "mixed". Each row is now what that month's
 * own brief publishes. The window is read as of March 2026, so the rows hold still as the
 * record grows; a scoring change that moves a pinned value moves it here too.
 */

type HistoryRow = { recordDate: string; regime: string; confidenceLabel: string; trend: string };

const readHistory = async (query: string) => {
  const response = await GET(new NextRequest(`http://localhost:3000/api/cli/history${query}`));
  assert.equal(response.status, 200);
  const body: { windowWeeks: number; requestedWeeks: number; truncatedToMax: boolean; history: HistoryRow[] } =
    await response.json();
  return body;
};

const rowFor = (rows: HistoryRow[], recordDate: string) => {
  const row = rows.find((candidate) => candidate.recordDate === recordDate);
  assert.ok(row, `a row for ${recordDate}`);
  return row;
};

/* What the brief for that month publishes: `?asOf=` the month, as /api/cli/status reads it. */
const briefFor = async (recordDate: string) => {
  const [year, month] = recordDate.split("-").map(Number);
  const result = await loadReportDataSafe({ year: String(year), month: String(month) }, { route: "test" });
  const data = result.ok ? result.data : result.fallback;
  return {
    regime: data.assessment.regime,
    confidenceLabel: formatConfidencePlainLabel(
      resolvePublishedConfidence({ assessment: data.assessment, record: data.treasury, historical: true }).label,
    ),
    trend: data.reportDynamics.directionLabel,
  };
};

describe("GET /api/cli/history", () => {
  it("gives each month-end its own margin and trend, the ones its month's brief publishes", async () => {
    const { history } = await readHistory("?asOf=2026-03");

    const march = rowFor(history, "2026-03-31");
    const january = rowFor(history, "2026-01-30");
    assert.deepEqual(march, {
      recordDate: "2026-03-31",
      regime: "EXPANSION",
      confidenceLabel: "Within reach of the line where conditions change",
      trend: "deteriorating",
    });
    assert.deepEqual(january, {
      recordDate: "2026-01-30",
      regime: "EXPANSION",
      confidenceLabel: "Clear of the line where conditions change",
      trend: "improving",
    });

    for (const row of [march, january]) {
      const { recordDate, ...published } = row;
      assert.deepEqual(published, await briefFor(recordDate), recordDate);
    }
  });

  it("reads `weeks` as weeks: the month-ends within that many weeks of the newest, newest first", async () => {
    const nineWeeks = await readHistory("?asOf=2026-03&weeks=9");
    assert.deepEqual(
      nineWeeks.history.map((row) => row.recordDate),
      ["2026-03-31", "2026-02-27", "2026-01-30"],
    );
    assert.equal(nineWeeks.windowWeeks, 9);

    // The default is a year, the twelve month-ends it returned when `weeks` counted rows.
    const year = await readHistory("?asOf=2026-03");
    assert.equal(year.windowWeeks, 52);
    assert.equal(year.history.length, 12);
    assert.equal(year.history.at(-1)?.recordDate, "2025-04-30");

    const capped = await readHistory("?asOf=2026-03&weeks=200");
    assert.equal(capped.requestedWeeks, 200);
    assert.equal(capped.windowWeeks, 52);
    assert.equal(capped.truncatedToMax, true);
    assert.deepEqual(capped.history, year.history);
  });
});
