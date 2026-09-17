"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import Link from "next/link";
import { CloseIcon, ChevronLeftIcon, ChevronRightIcon } from "./uiIcons";
import { getTimeMachineMonthsByYear, getAdjacentTimeMachineEntry } from "../../lib/timeMachine/timeMachineCache";

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

  const clearDate = useCallback(() => {
    router.push("/");
    onClose();
  }, [router, onClose]);

  const adjacentPrev = isActive ? getAdjacentTimeMachineEntry(currentYear, currentMonth, "previous") : null;
  const adjacentNext = isActive ? getAdjacentTimeMachineEntry(currentYear, currentMonth, "next") : null;
  return (
    <Dialog.Root open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="weather-slide-panel fixed z-50 mt-14 mr-2 w-[calc(100vw-1.5rem)] sm:w-[20rem] sm:mr-4 top-0 right-0 rounded-lg border border-slate-700/70 bg-slate-950/95 p-4 shadow-xl backdrop-blur-xl" aria-label="Time machine">
          <div className="flex items-center justify-between gap-3">
            <h2 className="type-eyebrow text-slate-300">Historical view</h2>
            <Dialog.Close className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-sm text-slate-400 hover:bg-slate-800/60 hover:text-slate-200" aria-label="Close">
              <CloseIcon />
            </Dialog.Close>
          </div>

          {isActive ? (
            <div className="mt-3 rounded-md border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-xs text-amber-200">
              <div className="flex items-center justify-between gap-2">
                <span>Viewing {currentMonth}/{currentYear}</span>
                <button type="button" onClick={clearDate} className="underline decoration-amber-500/40 hover:decoration-amber-300">Return to current</button>
              </div>
              {adjacentPrev || adjacentNext ? (
                <div className="mt-2 flex items-center gap-2">
                  {adjacentPrev ? (
                    <button type="button" onClick={() => navigateTo(adjacentPrev.year, adjacentPrev.month)}
                      className="flex items-center gap-1 rounded border border-slate-700/60 px-2 py-1 text-fluid-micro hover:bg-slate-800/50">
                      <ChevronLeftIcon className="h-3 w-3" /> {adjacentPrev.month}/{adjacentPrev.year}
                    </button>
                  ) : null}
                  {adjacentNext ? (
                    <button type="button" onClick={() => navigateTo(adjacentNext.year, adjacentNext.month)}
                      className="flex items-center gap-1 rounded border border-slate-700/60 px-2 py-1 text-fluid-micro hover:bg-slate-800/50">
                      {adjacentNext.month}/{adjacentNext.year} <ChevronRightIcon className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {years.length === 0 ? (
            <p className="mt-4 text-xs text-slate-400">No historical data available.</p>
          ) : (
            <div className="mt-4 space-y-3">
              <fieldset>
                <legend className="type-eyebrow">Year</legend>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {years.map((year) => (
                    <button key={year} type="button" onClick={() => setPickedYear(year)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${selectedYear === year ? "bg-sky-500/12 text-sky-100 border border-sky-500/30" : "text-slate-300 border border-slate-800/60 hover:bg-slate-800/50"}`}
                    >{year}</button>
                  ))}
                </div>
              </fieldset>
              {months.length > 0 ? (
                <fieldset>
                  <legend className="type-eyebrow">Month</legend>
                  <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                    {months.map((month) => (
                      <button key={month} type="button" onClick={() => navigateTo(selectedYear, month)}
                        className={`rounded-md px-2 py-1.5 text-center text-xs font-medium transition-colors ${selectedYear === currentYear && month === currentMonth ? "bg-sky-500/18 text-sky-100 border border-sky-400/40" : "text-slate-300 border border-slate-800/60 hover:bg-slate-800/50"}`}
                      >{new Date(selectedYear, month - 1).toLocaleString("en", { month: "short" })}</button>
                    ))}
                  </div>
                </fieldset>
              ) : <p className="mt-2 text-xs text-slate-400">No data for {selectedYear}.</p>}
            </div>
          )}
          <div className="mt-4 border-t border-slate-800/60 pt-3 text-center">
            <Link href="/history" onClick={() => onClose()} className="inline-flex items-center gap-1 text-[0.7rem] font-medium text-sky-200 hover:text-sky-100 hover:underline">
              Go to History Dashboard &rarr;
            </Link>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
