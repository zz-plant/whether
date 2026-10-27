/**
 * Monthly regime history for forecast-history assembly.
 *
 * Two sources, merged by month: the snapshot bundled from data/, and the months the cron
 * has since written to KV. The bundled copy is the floor — it is the canonical month-end
 * series the generator scripts produce, and it renders whether or not KV answers, so an
 * empty or unreachable namespace costs freshness rather than the whole chart.
 *
 * Reads are synchronous on purpose. getMonthlyRegimeHistory() is called from
 * buildHomeBriefModelInternal, which is sync and sits under the report read path's 10s
 * deadline; making it async would turn that entire chain async for data that changes
 * monthly. The async report path primes the KV copy instead, and every sync reader after
 * that sees it. A page that reads the history itself primes first
 * (`primeMonthlyRegimeHistoryForRead`): a cached report is served without running the
 * report path, so its prime cannot be counted on.
 */
import { z } from "zod";

import type { RegimeKey } from "../regimeEngine";
import { getWhetherKv } from "../runtime/kv";
import { withDeadline } from "../withDeadline";
import rawMonthlyRegimeHistory from "../../data/summary_monthly_regime_history.json";

export const MONTHLY_REGIME_HISTORY_KV_KEY = "summary:monthly-regime-history";

/** How long a primed copy is trusted before the next read path re-reads KV. The series
 *  gains at most one entry a month, so re-reading more often buys nothing. */
const PRIME_TTL_MS = 6 * 60 * 60 * 1000;

const MonthlyRegimeHistoryEntrySchema = z.object({
  record_date: z.string(),
  regime: z.enum(["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"]) as z.ZodType<RegimeKey>,
  tightness: z.number().optional(),
  riskAppetite: z.number().optional(),
});

const MonthlyRegimeHistorySchema = z.array(MonthlyRegimeHistoryEntrySchema);

export type MonthlyRegimeHistoryEntry = z.infer<typeof MonthlyRegimeHistoryEntrySchema>;

export const parseMonthlyRegimeHistory = (input: unknown): MonthlyRegimeHistoryEntry[] => {
  const parsed = MonthlyRegimeHistorySchema.safeParse(input);

  if (parsed.success) {
    return parsed.data;
  }

  console.error("Monthly regime history failed validation.", parsed.error.format());
  return [];
};

const byRecordDateAscending = (left: MonthlyRegimeHistoryEntry, right: MonthlyRegimeHistoryEntry) =>
  new Date(left.record_date).getTime() - new Date(right.record_date).getTime();

/** Month key, so a later entry for a month the bundle already carries replaces it rather
 *  than doubling it — the current month is rewritten as the month fills in. */
export const monthKeyFor = (recordDate: string) => recordDate.slice(0, 7);

export const mergeMonthlyRegimeHistory = (
  base: MonthlyRegimeHistoryEntry[],
  overlay: MonthlyRegimeHistoryEntry[],
): MonthlyRegimeHistoryEntry[] => {
  const byMonth = new Map<string, MonthlyRegimeHistoryEntry>();
  for (const entry of [...base, ...overlay]) {
    byMonth.set(monthKeyFor(entry.record_date), entry);
  }
  return [...byMonth.values()].sort(byRecordDateAscending);
};

const bundledMonthlyRegimeHistory = parseMonthlyRegimeHistory(rawMonthlyRegimeHistory).sort(
  byRecordDateAscending,
);

let primedHistory: MonthlyRegimeHistoryEntry[] | null = null;
let primedAt = 0;

type MonthlyRegimeHistorySource = "kv" | "bundled";

/**
 * Pull the cron-written months into the module so the sync readers can see them. Safe to
 * call on every request: it re-reads KV at most once per TTL per isolate, and any failure
 * leaves the bundled floor in place.
 */
export const primeMonthlyRegimeHistory = async (): Promise<MonthlyRegimeHistorySource> => {
  if (primedHistory && Date.now() - primedAt < PRIME_TTL_MS) {
    return "kv";
  }

  const kv = getWhetherKv();
  if (!kv) return "bundled";

  try {
    const raw = await kv.get(MONTHLY_REGIME_HISTORY_KV_KEY);
    if (!raw) return "bundled";

    const entries = parseMonthlyRegimeHistory(JSON.parse(raw));
    if (entries.length === 0) return "bundled";

    primedHistory = mergeMonthlyRegimeHistory(bundledMonthlyRegimeHistory, entries);
    primedAt = Date.now();
    return "kv";
  } catch {
    return "bundled";
  }
};

/** Bound on the prime. It is one KV read, cached per isolate for hours, and the bundled
 *  snapshot covers a miss — so it is never worth making a page wait on it. */
const PRIME_DEADLINE_MS = 1_000;

/** The prime as a read path takes it: bounded, and never failing the read. */
export const primeMonthlyRegimeHistoryForRead = async (): Promise<void> => {
  try {
    await withDeadline(primeMonthlyRegimeHistory(), PRIME_DEADLINE_MS, "monthly-regime-history-prime");
  } catch {
    /* The bundled floor stands; freshness is the only thing lost. */
  }
};

/** Test seam: drop the primed copy so the next prime re-reads KV. */
export const resetPrimedMonthlyRegimeHistory = () => {
  primedHistory = null;
  primedAt = 0;
};

export const getMonthlyRegimeHistory = (): MonthlyRegimeHistoryEntry[] =>
  primedHistory ?? bundledMonthlyRegimeHistory;

export const getBundledMonthlyRegimeHistory = (): MonthlyRegimeHistoryEntry[] =>
  bundledMonthlyRegimeHistory;
