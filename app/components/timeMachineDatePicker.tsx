"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import Link from "next/link";
import { CloseIcon, ChevronLeftIcon, ChevronRightIcon } from "./uiIcons";
import { MonthGrid } from "./history/monthGrid";
import { getTimeMachineMonthsByYear, getAdjacentTimeMachineEntry } from "../../lib/timeMachine/timeMachineCache";
import { CLOSE_CONTROL_CLASS } from "./ui/closeControl";
import { SegmentedControl } from "./ui/segmentedControl";

type CoverageMap = Record<number, number[]>;

export function TimeMachineDatePicker({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentMonth = Number(searchParams?.get("month")) || 0;
  const currentYear = Number(searchParams?.get("year")) || 0;
  const isActive = currentMonth > 0 && currentYear > 0;

  /* The coverage map is bundled JSON read synchronously, so it is there on the
     first render. Loading it into state from an effect bought nothing but a
     "Loading historical data..." frame the reader saw on every open, and a
     second effect to pick a default year once it had "arrived". */
  const coverage: CoverageMap = getTimeMachineMonthsByYear();
  const years = useMemo(() => Object.keys(coverage).map(Number).sort((a, b) => b - a), [coverage]);

  // Null until the reader picks one: the default is the year in the URL, or the
  // newest on record, and both are already known here.
  const [pickedYear, setPickedYear] = useState<number | null>(null);
  const selectedYear = pickedYear ?? (currentYear || years[0] || 0);
  const months = selectedYear ? (coverage[selectedYear] ?? []) : [];

  const navigateTo = useCallback((year: number, month: number) => {
    const params = new URLSearchParams();
    params.set("month", String(month));
    params.set("year", String(year));
    router.push(`/?${params.toString()}`);
    onClose();
  }, [router, onClose]);

  const monthHref = (year: number, month: number) => `/?month=${month}&year=${year}`;

  const adjacentPrev = isActive ? getAdjacentTimeMachineEntry(currentYear, currentMonth, "previous") : null;
  const adjacentNext = isActive ? getAdjacentTimeMachineEntry(currentYear, currentMonth, "next") : null;
  return (
    <Dialog.Root open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[var(--z-overlay)] bg-black/40" />
        <Dialog.Popup className="weather-slide-panel fixed z-[var(--z-modal)] mt-14 mr-2 w-[calc(100vw-1.5rem)] sm:w-[20rem] sm:mr-4 top-0 right-0 rounded-lg border border-[color:var(--border-strong)] bg-[color:var(--bg-panel)] p-4 shadow-xl" aria-label="Time machine">
          <div className="flex items-center justify-between gap-3">
            <h2 className="type-eyebrow text-slate-300">Historical view</h2>
            <Dialog.Close className={CLOSE_CONTROL_CLASS} aria-label="Close">
              <CloseIcon />
            </Dialog.Close>
          </div>

          {isActive ? (
            <div className="weather-caveat-band mt-3 px-3 py-2 text-xs">
              {/* Links, not buttons that push the router (2026-11-06): each goes to an
                  address, so it can open in a new tab, and each is a 44px key. "Back to
                  this week" is the phrase the calendar picker and the archived banner use;
                  this said "Return to current" in 16px of underlined text. */}
              <div className="flex items-center justify-between gap-2">
                <span className="weather-caveat-mark">Viewing {currentMonth}/{currentYear}</span>
                <Link href="/" onClick={onClose} className="weather-hit underline decoration-slate-600 underline-offset-4 hover:decoration-current">
                  Back to this week
                </Link>
              </div>
              {adjacentPrev || adjacentNext ? (
                <div className="mt-2 flex items-center gap-2">
                  {adjacentPrev ? (
                    <Link href={monthHref(adjacentPrev.year, adjacentPrev.month)} onClick={onClose} className="weather-button inline-flex min-h-11 items-center gap-1 px-3 text-fluid-nano font-medium">
                      <ChevronLeftIcon className="h-3 w-3" /> {adjacentPrev.month}/{adjacentPrev.year}
                    </Link>
                  ) : null}
                  {adjacentNext ? (
                    <Link href={monthHref(adjacentNext.year, adjacentNext.month)} onClick={onClose} className="weather-button inline-flex min-h-11 items-center gap-1 px-3 text-fluid-nano font-medium">
                      {adjacentNext.month}/{adjacentNext.year} <ChevronRightIcon className="h-3 w-3" />
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {years.length === 0 ? (
            <p className="mt-4 text-xs text-slate-400">No historical data available.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {/* The site's one segmented control (2026-11-06): these were 28px buttons on the
                  data radius, sky-tinted when chosen, with no pressed state for a screen reader. */}
              <div>
                <p className="type-eyebrow" aria-hidden="true">Year</p>
                <SegmentedControl
                  className="mt-1.5"
                  ariaLabel="Year"
                  options={years.map((year) => ({ key: String(year), label: String(year) }))}
                  value={String(selectedYear)}
                  onSelect={(year) => setPickedYear(Number(year))}
                />
              </div>
              {months.length > 0 ? (
                <div>
                  <p className="type-eyebrow">Month</p>
                  <div className="mt-1.5">
                    <MonthGrid
                      months={months}
                      selectedMonth={selectedYear === currentYear ? currentMonth : undefined}
                      onSelect={(month) => navigateTo(selectedYear, month)}
                    />
                  </div>
                </div>
              ) : <p className="mt-2 text-xs text-slate-400">No data for {selectedYear}.</p>}
            </div>
          )}
          <div className="mt-4 border-t border-slate-800/60 pt-3 text-center">
            {/* The page's own name: there is no "History Dashboard". */}
            <Link href="/history" onClick={() => onClose()} className="weather-hit inline-flex items-center gap-1 text-fluid-nano font-medium text-sky-200 hover:text-sky-100 hover:underline">
              Open History &rarr;
            </Link>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
