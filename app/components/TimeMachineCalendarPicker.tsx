"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, ChevronDown, Check, Sparkles } from "lucide-react";
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

export function TimeMachineCalendarPicker({
  currentDateLabel,
  isHistorical,
  history,
}: TimeMachineCalendarPickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedMonth = searchParams?.get("month");
  const selectedYear = searchParams?.get("year");

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (e.target instanceof Node && containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

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
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="group flex items-center gap-2 text-left cursor-pointer rounded-lg px-2 py-1 -ml-2 hover:bg-slate-900/60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
      >
        {/* `text-lg` below `sm`: at `text-xl` the week title and the confidence
            chip beside it ran 4px past a 430px phone's content width, and the
            chip dropped to a row of its own above the call. */}
        <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white group-hover:text-sky-300 transition-colors">
          {currentDateLabel}
        </h2>
        <ChevronDown
          size={18}
          className={`text-slate-400 group-hover:text-sky-300 transition-transform duration-200 ${
            open ? "rotate-180 text-sky-400" : ""
          }`}
        />
      </button>

      {open && (
        <div
          aria-label="Select brief period"
          className="absolute left-0 top-full mt-2 z-50 w-80 max-h-96 overflow-y-auto overscroll-contain rounded-xl border border-slate-800 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.08]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
              <Calendar size={14} className="text-sky-400" />
              <span>Historical Time Machine</span>
            </div>
            {isHistorical && (
              <button
                type="button"
                onClick={handleReturnLive}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-300 hover:text-sky-200 transition-colors bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20"
              >
                <Sparkles size={11} />
                <span>Return to Live</span>
              </button>
            )}
          </div>

          <div className="pb-2.5 mb-2 border-b border-white/[0.08] space-y-1.5">
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Replay a known period
            </span>
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
                    onClick={() => handleSelect(periodDate.toISOString())}
                    className={`flex min-h-[44px] flex-col items-start rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors border ${
                      isSelected
                        ? "border-sky-500/50 bg-sky-500/15 text-white"
                        : "border-white/[0.06] bg-slate-900/50 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <span className="flex w-full items-center justify-between gap-1">
                      <span className="font-semibold tabular-nums">{MONTH_YEAR_LABEL.format(periodDate)}</span>
                      {isSelected && <Check size={12} className="text-sky-400" />}
                    </span>
                    <span className="w-full truncate text-[10px] text-slate-400">
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
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    {year}
                  </span>
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
                          onClick={() => handleSelect(entry.record_date)}
                          className={`flex flex-col items-start rounded-lg p-2 text-left text-xs transition-colors border ${
                            isSelected
                              ? "border-sky-500/50 bg-sky-500/15 text-white"
                              : "border-white/[0.04] bg-slate-900/40 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-semibold">{monthName}</span>
                            {isSelected && <Check size={12} className="text-sky-400" />}
                          </div>
                          <span className="text-[10px] text-slate-400 truncate w-full">
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
        </div>
      )}
    </div>
  );
}
