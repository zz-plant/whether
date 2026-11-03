import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { z } from "zod";

import { buildMonthlyArchive, buildWeeklyArchive } from "../lib/summary/regimeArchiveReplay";
import { REGIME_ARCHIVE_PATHS, writeMonthlyArchive, writeWeeklyArchive, type ArchiveFileStore } from "../lib/summary/regimeArchiveFiles";
import { buildBundledSeries } from "./fixtures/bundledArchiveSeries";

/*
 * The generator stages on their own, as the scripts run them: a partial run
 * (`HISTORY_START_YEAR`, `HISTORY_WEEKS`) merges into the files instead of replacing them.
 */

const NOW = new Date("2026-10-09T18:29:43.682Z");
const bundled = buildBundledSeries();

const memoryStore = (files: Map<string, string>): ArchiveFileStore => ({
  read: async (path) => files.get(path) ?? (path.startsWith("data/") ? readFileSync(path, "utf8") : null),
  write: async (path, content) => {
    files.set(path, content);
  },
});

const RowSchema = z.object({ cadence: z.string(), year: z.number(), asOf: z.string() }).loose();
const rowsOf = (text: string | undefined) => z.array(RowSchema).parse(JSON.parse(text ?? "[]"));
const checkoutArchive = rowsOf(readFileSync(REGIME_ARCHIVE_PATHS.summaryArchive, "utf8"));

describe("archive stages on a partial run", () => {
  it("merges a monthly run from 2025 without moving any earlier month or other cadence", async () => {
    const files = new Map<string, string>();
    const built = buildMonthlyArchive({ ...bundled, now: NOW, scope: { startYear: 2025 } });
    assert.equal(built.mode, "merge");
    assert.ok(built.entries.every((entry) => entry.year >= 2025));
    await writeMonthlyArchive(memoryStore(files), built);

    const archive = rowsOf(files.get(REGIME_ARCHIVE_PATHS.summaryArchive));
    const untouched = (rows: z.infer<typeof RowSchema>[]) => rows.filter((row) => row.cadence !== "monthly" || row.year < 2025);
    assert.deepEqual(untouched(archive), untouched(checkoutArchive));
    assert.equal(
      archive.filter((row) => row.cadence === "monthly").length,
      checkoutArchive.filter((row) => row.cadence === "monthly").length,
    );

    const cache = z.array(z.object({ year: z.number() }).loose()).parse(JSON.parse(files.get(REGIME_ARCHIVE_PATHS.timeMachineCache) ?? "[]"));
    const checkoutCache = z.array(z.object({ year: z.number() }).loose()).parse(
      JSON.parse(readFileSync(REGIME_ARCHIVE_PATHS.timeMachineCache, "utf8")),
    );
    assert.deepEqual(
      cache.filter((entry) => entry.year < 2025),
      checkoutCache.filter((entry) => entry.year < 2025),
    );
  });

  it("writes only the last weeks HISTORY_WEEKS names, and keeps the rest of the weekly archive", async () => {
    const files = new Map<string, string>();
    const built = buildWeeklyArchive({ ...bundled, now: NOW, scope: { historyWeeks: 2 } });
    assert.equal(built.entries.length, 2);
    await writeWeeklyArchive(memoryStore(files), built);

    const weekly = (rows: z.infer<typeof RowSchema>[]) => rows.filter((row) => row.cadence === "weekly");
    const written = new Set(built.entries.map((entry) => entry.asOf));
    assert.deepEqual(
      weekly(rowsOf(files.get(REGIME_ARCHIVE_PATHS.summaryArchive))).filter((row) => !written.has(row.asOf)),
      weekly(checkoutArchive).filter((row) => !written.has(row.asOf)),
    );
  });

  it("refuses a file that is not an array of entries rather than treating it as empty", async () => {
    const built = buildWeeklyArchive({ ...bundled, now: NOW, scope: { historyWeeks: 1 } });
    const broken = new Map([[REGIME_ARCHIVE_PATHS.summaryArchive, "{}\n"]]);
    await assert.rejects(writeWeeklyArchive(memoryStore(broken), built), /data\/summary_archive\.json is not a JSON array/);
    const partial = new Map([[REGIME_ARCHIVE_PATHS.summaryArchive, '[{"cadence":"weekly"}]\n']]);
    await assert.rejects(writeWeeklyArchive(memoryStore(partial), built), /has 1 entries that do not validate/);
  });
});
