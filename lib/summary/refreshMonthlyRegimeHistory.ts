/**
 * Cron write path for the monthly regime history.
 *
 * The generator scripts rebuild the whole 2012-onward series from FRED and commit it. This
 * does the one thing that series needs between deploys: record the month currently in
 * progress, from the assessment the read path already computed. It rewrites that month on
 * every run, so the entry converges as the month fills in, and the month key keeps it from
 * doubling an entry the bundled snapshot already carries.
 *
 * It refuses to record a degraded read, on the same principle as the freeze script: a
 * regime derived from a stale fallback is not a month's history, and writing one would put
 * a number into the permanent series that no source backs.
 */
import { loadReportData } from "../report/reportData";
import type { RegimeKey } from "../regimeEngine";
import { getWhetherKv } from "../runtime/kv";
import {
  MONTHLY_REGIME_HISTORY_KV_KEY,
  mergeMonthlyRegimeHistory,
  monthKeyFor,
  parseMonthlyRegimeHistory,
  type MonthlyRegimeHistoryEntry,
} from "./monthlyRegimeHistory";

/** The slice of the report result this needs, narrowed so a test can supply one without
 *  standing up the whole report path. */
export type ReportSnapshotForHistory = {
  assessment: { regime: RegimeKey; scores: { tightness: number; riskAppetite: number } };
  treasury?: { record_date?: string; isLive?: boolean };
};

export type MonthlyRegimeHistoryRefresh = {
  ok: boolean;
  error?: string;
  month?: string;
  wrote: boolean;
};

const readStoredEntries = async (
  kv: NonNullable<ReturnType<typeof getWhetherKv>>,
): Promise<MonthlyRegimeHistoryEntry[]> => {
  try {
    const raw = await kv.get(MONTHLY_REGIME_HISTORY_KV_KEY);
    return raw ? parseMonthlyRegimeHistory(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
};

export const refreshMonthlyRegimeHistory = async (
  deps: { loadReport?: () => Promise<ReportSnapshotForHistory> } = {},
): Promise<MonthlyRegimeHistoryRefresh> => {
  const loadReport = deps.loadReport ?? loadReportData;
  const kv = getWhetherKv();
  if (!kv) {
    return { ok: false, wrote: false, error: "no KV binding" };
  }

  try {
    const report = await loadReport();
    const recordDate = report.treasury?.record_date;

    if (!recordDate) {
      return { ok: false, wrote: false, error: "report data carried no record date" };
    }

    // Degraded reads are skipped, not failed: a fallback snapshot on one run is an
    // ordinary condition, and the next run records the month once live data returns.
    if (report.treasury?.isLive !== true) {
      return { ok: true, wrote: false, month: monthKeyFor(recordDate), error: "degraded read" };
    }

    const entry: MonthlyRegimeHistoryEntry = {
      record_date: recordDate,
      regime: report.assessment.regime,
      tightness: report.assessment.scores.tightness,
      riskAppetite: report.assessment.scores.riskAppetite,
    };

    const stored = await readStoredEntries(kv);
    const next = mergeMonthlyRegimeHistory(stored, [entry]);

    await kv.put(MONTHLY_REGIME_HISTORY_KV_KEY, JSON.stringify(next));

    return { ok: true, wrote: true, month: monthKeyFor(recordDate) };
  } catch (error) {
    return {
      ok: false,
      wrote: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
