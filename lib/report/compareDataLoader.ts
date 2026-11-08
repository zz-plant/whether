import { loadWeeklyBriefSnapshot, type WeeklyBriefSnapshotResult } from "./weeklyBriefSnapshot";

export type CompareSearchParams = {
  yearA?: string;
  monthA?: string;
  yearB?: string;
  monthB?: string;
};

type CompareDataSuccess = {
  ok: true;
  yearA?: number;
  monthA?: number;
  yearB: number;
  monthB: number;
  snapshotResultA: WeeklyBriefSnapshotResult;
  snapshotResultB: WeeklyBriefSnapshotResult;
};

type CompareDataFailure = {
  ok: false;
  error: string;
  yearA?: number;
  monthA?: number;
  yearB: number;
  monthB: number;
  snapshotResultA?: WeeklyBriefSnapshotResult;
  snapshotResultB?: WeeklyBriefSnapshotResult;
};

export type CompareDataResult = CompareDataSuccess | CompareDataFailure;

/**
 * Single unified loader for comparing two periods.
 * Loads both periods once, handling errors safely so the page
 * and panel can render selectors and a visible error state without crashing.
 */
export async function loadCompareData(
  searchParams?: Partial<CompareSearchParams>,
): Promise<CompareDataResult> {
  const yearA = searchParams?.yearA ? Number(searchParams.yearA) : undefined;
  const monthA = searchParams?.monthA ? Number(searchParams.monthA) : undefined;

  const yearB = searchParams?.yearB ? Number(searchParams.yearB) : 2020;
  const monthB = searchParams?.monthB ? Number(searchParams.monthB) : 3;

  const searchA = yearA && monthA ? { year: String(yearA), month: String(monthA) } : undefined;
  const searchB = { year: String(yearB), month: String(monthB) };

  try {
    const [snapshotResultA, snapshotResultB] = await Promise.all([
      loadWeeklyBriefSnapshot(searchA, { route: "/history/compare" }),
      loadWeeklyBriefSnapshot(searchB, { route: "/history/compare" }),
    ]);

    return {
      ok: true,
      yearA,
      monthA,
      yearB,
      monthB,
      snapshotResultA,
      snapshotResultB,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: message,
      yearA,
      monthA,
      yearB,
      monthB,
    };
  }
}
