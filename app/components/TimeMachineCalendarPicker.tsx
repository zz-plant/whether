"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Popover } from "@base-ui/react/popover";
import { CheckIcon, ChevronDownIcon } from "./uiIcons";
import { getRegimePublicLabel } from "../../lib/regimePresentation";

/**
 * Four months a reader already has a memory of, offered above the trailing
 * three-year grid. The grid shows the record exists; these show it reaching
 * back through weeks the reader can check against their own — which is the
 * only answer to "this is a two-number model" that does not require reading
 * the method. Each is described by what happened, not by how it felt, and the
 * chip prints the call the record holds for that month rather than a verdict
 * written here. Every one sits inside the snapshot store's coverage
 * (`getTimeMachineCoverage`), so the selection resolves to an archived brief
 * rather than falling back to the live one.
 */
export const KNOWN_PERIODS: readonly { year: number; month: number; label: string }[] = [
  { year: 2020, month: 3, label: "Pandemic shutdown" },
  { year: 2021, month: 11, label: "Zero-rate peak" },
  { year: 2022, month: 6, label: "Rate hikes" },
  { year: 2023, month: 3, label: "Bank failures" },
];

const MONTH_YEAR_LABEL = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

interface TimeMachineCalendarPickerProps {
  currentDateLabel: string;
  isHistorical: boolean;
  history: Array<{
    record_date: string;
    regime: string;
  }>;
}

/**
 * The week title, and behind it the archive of past briefs.
 *
 * The popover is Base UI's (`thresholdsPanel` and `dataProvenanceStrip` use the
 * same one); this file used to carry its own outside-click and Escape
 * listeners, the fourth copy of that pair on the site. Open state is held here
 * only so that picking a week closes the panel before the route changes. The
 * title is an `h2` wrapping the trigger rather than a button wrapping a
 * heading, which is the order HTML allows.
 */
export function TimeMachineCalendarPicker({
  currentDateLabel,
  isHistorical,
  history,
}: TimeMachineCalendarPickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const selectedMonth = searchParams?.get("month");
  const selectedYear = searchParams?.get("year");

  // Group history entries by year
  const entriesByYear = history.slice(-36).reduce<Record<string, typeof history>>((acc, entry) => {
    const year = new Date(entry.record_date).getUTCFullYear().toString();
    if (!acc[year]) acc[year] = [];
    acc[year].push(entry);
    return acc;
  }, {});

  const sortedYears = Object.keys(entriesByYear).sort((a, b) => Number(b) - Number(a));

  const handleSelect = (entryDate: string) => {
    const d = new Date(entryDate);
    const m = d.getUTCMonth() + 1;
    const y = d.getUTCFullYear();
    setOpen(false);
    router.push(`/?month=${m}&year=${y}`);
  };

  const handleReturnLive = () => {
    setOpen(false);
    router.push("/");
  };

  return (
    <Popover.Root open={open} onOpenChange={(next) => setOpen(next)}>
      {/* `text-lg` below `sm`: at `text-xl` the week title and the confidence
          chip beside it ran 4px past a 430px phone's content width, and the
          chip dropped to a row of its own above the call. */}
      <h2 className="text-lg font-bold tracking-tight text-white sm:text-2xl">
        <Popover.Trigger className="group -ml-2 inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors hover:bg-slate-900/60 hover:text-sky-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400">
          {currentDateLabel}
          <ChevronDownIcon
            className={`h-[18px] w-[18px] text-slate-400 transition-transform duration-200 group-hover:text-sky-300 ${
              open ? "rotate-180 text-sky-400" : ""
            }`}
          />
        </Popover.Trigger>
      </h2>

      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={8} className="z-50">
          <Popover.Popup
            aria-label="Select brief period"
            className="max-h-96 w-80 overflow-y-auto overscroll-contain rounded-xl border border-slate-800 bg-slate-950/95 p-3 shadow-2xl"
          >
            <div className="mb-2 flex items-center justify-between border-b border-white/[0.08] pb-2">
              <span className="text-xs font-semibold text-white">Past weeks</span>
              {isHistorical && (
                <button
                  type="button"
                  onClick={handleReturnLive}
                  className="weather-chip inline-flex min-h-[44px] items-center text-sky-300 hover:text-sky-200"
                >
                  Back to this week
                </button>
              )}
            </div>

            <div className="mb-2 space-y-1.5 border-b border-white/[0.08] pb-2.5">
              <span className="type-eyebrow block px-1">Replay a known period</span>
              <div className="grid grid-cols-2 gap-1.5">
                {KNOWN_PERIODS.map((period) => {
                  const isSelected =
                    selectedMonth === String(period.month) && selectedYear === String(period.year);
                  const entry = history.find((candidate) => {
                    const d = new Date(candidate.record_date);
                    return d.getUTCFullYear() === period.year && d.getUTCMonth() + 1 === period.month;
                  });
                  const periodDate = new Date(Date.UTC(period.year, period.month - 1, 1));
                  return (
                    <button
                      key={`${period.year}-${period.month}`}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => handleSelect(periodDate.toISOString())}
                      className={`flex min-h-[44px] flex-col items-start rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
                        isSelected
                          ? "border-sky-500/50 bg-sky-500/15 text-white"
                          : "border-white/[0.06] bg-slate-900/50 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                      }`}
                    >
                      <span className="flex w-full items-center justify-between gap-1">
                        <span className="font-semibold tabular-nums">{MONTH_YEAR_LABEL.format(periodDate)}</span>
                        {isSelected && <CheckIcon className="h-3 w-3 text-sky-400" />}
                      </span>
                      <span className="w-full truncate text-fluid-nano text-slate-400">
                        {period.label}
                        {entry ? ` · ${getRegimePublicLabel(entry.regime)}` : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              {sortedYears.map((year) => {
                const yearEntries = entriesByYear[year] ?? [];
                return (
                  <div key={year} className="space-y-1">
                    <span className="type-eyebrow px-1">{year}</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {yearEntries.map((entry) => {
                        const d = new Date(entry.record_date);
                        const monthNum = d.getUTCMonth() + 1;
                        const monthName = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
                        const isSelected = selectedMonth === monthNum.toString() && selectedYear === year;
                        const publicLabel = getRegimePublicLabel(entry.regime);

                        return (
                          <button
                            key={entry.record_date}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => handleSelect(entry.record_date)}
                            className={`flex min-h-[44px] flex-col items-start rounded-lg border p-2 text-left text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
                              isSelected
                                ? "border-sky-500/50 bg-sky-500/15 text-white"
                                : "border-white/[0.04] bg-slate-900/40 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                            }`}
                          >
                            <span className="flex w-full items-center justify-between">
                              <span className="font-semibold">{monthName}</span>
                              {isSelected && <CheckIcon className="h-3 w-3 text-sky-400" />}
                            </span>
                            <span className="w-full truncate text-fluid-nano text-slate-400">
                              {publicLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
