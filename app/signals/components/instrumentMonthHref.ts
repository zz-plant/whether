import { buildTimeMachineHref } from "../../../lib/timeMachine/timeMachineSelection";
import { hasTimeMachineEntry } from "../../../lib/timeMachine/timeMachineCache";
import { formatMonthShortLabel } from "../../../lib/timeMachine/monthFormatting";

/** The selection's own keys, which the month being opened replaces. */
const SELECTION_KEYS = new Set(["month", "year", "draftMonth", "draftYear"]);

/**
 * Where a month in an opened instrument goes: this page as it read that month
 * (the time machine), with the reader's other settings kept and the same panel
 * open at its anchor, so the month opens where the reader pointed at it. Null
 * for a month the time machine does not hold.
 */
export const instrumentMonthHref =
  ({
    searchParams,
    panelKey,
    anchor,
  }: {
    searchParams?: Record<string, string | undefined>;
    panelKey: string;
    anchor: string;
  }) =>
  ({ year, month }: { year: number; month: number }): string | null => {
    if (!hasTimeMachineEntry(year, month)) return null;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams ?? {})) {
      if (value && !SELECTION_KEYS.has(key)) params.set(key, value);
    }
    params.set(panelKey, "1");
    return buildTimeMachineHref(`/signals?${params.toString()}#${anchor}`, { year, month });
  };

/** The year under a month's column: under the first month, and under each January. */
export const columnYearLabel = (year: number, month: number, index: number) => (index === 0 || month === 1 ? String(year) : null);

/** "Mar", under a month's column. */
export const columnMonthLabel = (year: number, month: number) => formatMonthShortLabel(year, month);
