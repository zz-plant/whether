"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Popover } from "@base-ui/react/popover";
import { ChevronDownIcon } from "./uiIcons";
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
      {/* A label, not a heading (2026-10-09): it printed as an h2 above the page's
          h1, so the outline opened on the week's date rather than its verdict, and
          at title size it competed with the verdict under it. It names the week
          the verdict is for, by its Monday. */}
      <p className="text-fluid-sm font-semibold tracking-tight text-slate-200">
        <Popover.Trigger className="group inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-left transition-colors hover:text-[color:var(--app-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400">
          {currentDateLabel}
          <ChevronDownIcon
            className={`h-[18px] w-[18px] text-slate-400 transition-transform duration-200 group-hover:text-[color:var(--app-text)] ${
              open ? "rotate-180 text-sky-400" : ""
            }`}
          />
        </Popover.Trigger>
      </p>

      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={8} className="z-[var(--z-menu)]">
          <Popover.Popup
            aria-label="Select brief period"
            className="max-h-96 w-80 overflow-y-auto overscroll-contain rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--bg-raised)] p-3 shadow-2xl"
          >
            <div className="mb-2 flex items-center justify-between border-b border-[color:var(--border-subtle)] pb-2">
              <span className="text-xs font-semibold text-slate-50">Past weeks</span>
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

            <div className="mb-2 space-y-1.5 border-b border-[color:var(--border-subtle)] pb-2.5">
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
                      className="weather-key flex min-h-[44px] flex-col items-start px-2.5 py-1.5 text-left text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                    >
                      <span className="flex w-full items-center justify-between gap-1">
                        <span className="font-semibold tabular-nums">{MONTH_YEAR_LABEL.format(periodDate)}</span>
                        <span className="weather-segment-lamp" aria-hidden="true" />
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
                            className="weather-key flex min-h-[44px] flex-col items-start p-2 text-left text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                          >
                            <span className="flex w-full items-center justify-between">
                              <span className="font-semibold">{monthName}</span>
                              <span className="weather-segment-lamp" aria-hidden="true" />
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
