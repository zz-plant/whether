"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type CoverageMap = Record<number, number[]>; // year -> months[]

export function TimeMachineDatePicker({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentMonth = Number(searchParams?.get("month")) || 0;
  const currentYear = Number(searchParams?.get("year")) || 0;
  const isActive = currentMonth > 0 && currentYear > 0;

  const [coverage, setCoverage] = useState<CoverageMap>({});
  const [selectedYear, setSelectedYear] = useState(currentYear || 0);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth || 0);

  useEffect(() => {
    import("../../lib/timeMachine/timeMachineCache").then((mod) => {
      const monthsByYear = mod.getTimeMachineMonthsByYear();
      setCoverage(monthsByYear);
      const years = Object.keys(monthsByYear).map(Number).sort((a, b) => b - a);
      if (!selectedYear && years.length > 0) {
        setSelectedYear(years[0]);
      }
    });
  }, [selectedYear]);

  const years = useMemo(
    () => Object.keys(coverage).map(Number).sort((a, b) => b - a),
    [coverage],
  );
  const months = selectedYear ? (coverage[selectedYear] ?? []) : [];

  const navigateToDate = useCallback(
    (year: number, month: number) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("month", String(month));
      params.set("year", String(year));
      router.push(`/?${params.toString()}`);
      onClose();
    },
    [router, searchParams, onClose],
  );

  const clearDate = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("month");
    params.delete("year");
    router.push(`/?${params.toString()}`);
    onClose();
  }, [router, searchParams, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end sm:items-start">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <aside
        className="weather-slide-panel relative z-10 mt-14 mr-2 w-[calc(100vw-1.5rem)] sm:w-[18rem] rounded-lg border border-slate-700/70 bg-slate-950/95 p-4 shadow-xl backdrop-blur-xl sm:mr-4"
        role="dialog"
        aria-label="Time machine"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
            Historical view
          </h2>
          <button
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-sm text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {isActive ? (
          <div className="mt-3 rounded-md border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-xs text-amber-200">
            Viewing {currentMonth}/{currentYear}
            <button
              type="button"
              onClick={clearDate}
              className="ml-2 underline decoration-amber-500/40"
            >
              Return to current
            </button>
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-500">
              Year
            </label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => {
                    setSelectedYear(year);
                    setSelectedMonth(0);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedYear === year
                      ? "bg-sky-500/12 text-sky-100 border border-sky-500/30"
                      : "text-slate-300 border border-slate-800/60 hover:bg-slate-800/50"
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          {months.length > 0 ? (
            <div>
              <label className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-500">
                Month
              </label>
              <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                {months.map((month) => (
                  <button
                    key={month}
                    type="button"
                    onClick={() => navigateToDate(selectedYear, month)}
                    className={`rounded-md px-2 py-1.5 text-center text-xs font-medium transition-colors ${
                      selectedYear === currentYear && month === currentMonth
                        ? "bg-sky-500/18 text-sky-100 border border-sky-400/40"
                        : "text-slate-300 border border-slate-800/60 hover:bg-slate-800/50"
                    }`}
                  >
                    {new Date(selectedYear, month - 1).toLocaleString("en", { month: "short" })}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {years.length === 0 ? (
            <p className="text-xs text-slate-500">No historical data available.</p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
