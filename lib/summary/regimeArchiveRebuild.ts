/**
 * The whole archive refresh in one pass, against files read from somewhere else: the four
 * generator stages in the order the refresh routine ran them (month-ends, weeks, quarters
 * and years, then the `/history` index), each reading what the stage before it wrote.
 *
 * The Worker runs this against the base branch (`regimeArchivePullRequest.ts`), so nothing
 * here touches a disk: writes stay in memory over the base, and the result is the files whose
 * text differs from it.
 *
 * Memory is the limit that binds in a Worker (128MB per isolate, shared with the app), not
 * CPU (about 1.2s of the 30s default) or subrequests (about 30 of 10,000). The archive holds
 * non-ASCII text, so the engine stores it at two bytes a character: 10MB as a string and
 * several times that parsed. So nothing is held longer than its stage: a base file is kept
 * as a digest once read, each stage's built entries go out of scope when it has written them,
 * and the series are dropped after the last replay. Measured on 2026-11-03 against FRED's full
 * history, under Node's V8 with the old space capped and with two more copies of the archive's
 * rows in the run: it completes at 60MB and fails at 56MB, of which 12MB is the loaded modules,
 * so the rebuild itself needed about 45-48MB. Production isolates of this Worker sat at 53MB (median) and
 * 88MB (p99) that week, so a rebuild on a busy isolate can exceed the limit; the Workflow's
 * step retries land it on another.
 */
import type { ArchiveDatasets } from "./regimeArchiveContext";
import { buildMonthlyArchive, buildQuarterlyYearlyArchive, buildWeeklyArchive } from "./regimeArchiveReplay";
import {
  REGIME_ARCHIVE_PATHS,
  writeMonthlyArchive,
  writePostureArchiveIndex,
  writeQuarterlyYearlyArchive,
  writeWeeklyArchive,
  type ArchiveFileStore,
} from "./regimeArchiveFiles";
import { monthKeyFor, parseMonthlyRegimeHistory } from "./monthlyRegimeHistory";

type RebuiltArchiveFile = { path: string; content: string };

export type RegimeArchiveRebuild = {
  /** Every file whose text differs from the base, in the order the stages first wrote it. */
  files: RebuiltArchiveFile[];
  /** Month-ends (YYYY-MM) the rebuilt month rail has and the base's does not. */
  newMonthEnds: string[];
  /** The newest period of each cadence the rebuild scored. */
  latest: { monthEnd: string | null; week: string | null; quarter: string | null };
};

const digest = async (text: string | null) =>
  text === null ? null : new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))).join(",");

const monthsIn = (text: string | null): Set<string> => {
  if (text === null) return new Set();
  const raw: unknown = JSON.parse(text);
  return new Set(parseMonthlyRegimeHistory(raw).map((entry) => monthKeyFor(entry.record_date)));
};

export const rebuildRegimeArchive = async ({
  loadDatasets,
  now,
  readBase,
}: {
  /** A loader rather than the series themselves, so the rebuild can let go of them after the last replay. */
  loadDatasets: () => Promise<ArchiveDatasets>;
  now: Date;
  /** A file's text on the base, or null where it does not exist. Read at most once per path. */
  readBase: (path: string) => Promise<string | null>;
}): Promise<RegimeArchiveRebuild> => {
  const baseDigests = new Map<string, string | null>();
  const written = new Map<string, string>();
  const readOnce = async (path: string) => {
    if (baseDigests.has(path)) {
      throw new Error(`${path} was read from the base twice; a stage must read what the stage before it wrote`);
    }
    const text = await readBase(path);
    baseDigests.set(path, await digest(text));
    return text;
  };
  const store: ArchiveFileStore = {
    read: async (path) => written.get(path) ?? readOnce(path),
    write: async (path, content) => {
      written.set(path, content);
    },
  };

  const baseMonths = monthsIn(await readOnce(REGIME_ARCHIVE_PATHS.monthlyRegimeHistory));

  /* The stages write in the routine's order. The replays are pure, so the small quarterly one
     runs before the weekly one: the series can then go before the weekly stage, the largest. */
  let inputs: (ArchiveDatasets & { now: Date }) | null = { ...(await loadDatasets()), now };
  const latest: RegimeArchiveRebuild["latest"] = { monthEnd: null, week: null, quarter: null };
  {
    const monthly = buildMonthlyArchive(inputs);
    latest.monthEnd = monthly.entries.at(-1)?.asOf ?? null;
    await writeMonthlyArchive(store, monthly);
  }
  const quarterlyYearly = buildQuarterlyYearlyArchive(inputs);
  latest.quarter = quarterlyYearly.quarterlyEntries.at(-1)?.asOf ?? null;
  {
    const weekly = buildWeeklyArchive(inputs);
    inputs = null;
    latest.week = weekly.entries.at(-1)?.asOf ?? null;
    await writeWeeklyArchive(store, weekly);
  }
  await writeQuarterlyYearlyArchive(store, quarterlyYearly);
  await writePostureArchiveIndex(store);

  const files: RebuiltArchiveFile[] = [];
  for (const [path, content] of written) {
    const base = baseDigests.has(path) ? baseDigests.get(path) : await digest(await readOnce(path));
    if (base !== (await digest(content))) files.push({ path, content });
  }

  const newMonthEnds = [...monthsIn(written.get(REGIME_ARCHIVE_PATHS.monthlyRegimeHistory) ?? null)].filter(
    (month) => !baseMonths.has(month),
  );

  return { files, newMonthEnds, latest };
};
