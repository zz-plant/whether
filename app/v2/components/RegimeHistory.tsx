"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { REGIME_COLORS } from "../viewModel";

type Props = {
  regimes: Array<{ record_date: string; regime: string }>;
  currentRegime: string;
};

function parseYearMonth(dateStr: string): { year: number; month: number } | null {
  const d = new Date(dateStr);
  if (Number.isNaN(d.valueOf())) return null;
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function RegimeHistory({ regimes, currentRegime }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedMonth = searchParams?.get("month");
  const selectedYear = searchParams?.get("year");
  const isViewingHistory = Boolean(selectedMonth && selectedYear);

  const handleSelect = useCallback((entry: { record_date: string }) => {
    const ym = parseYearMonth(entry.record_date);
    if (!ym) return;
    router.push(`/?month=${ym.month}&year=${ym.year}`, { scroll: false });
  }, [router]);

  const isSelectedEntry = useCallback((entry: { record_date: string }) => {
    if (!selectedMonth || !selectedYear) return false;
    const ym = parseYearMonth(entry.record_date);
    return ym?.month === Number(selectedMonth) && ym?.year === Number(selectedYear);
  }, [selectedMonth, selectedYear]);

  if (regimes.length < 2) return null;

  const selectedEntry = regimes.find(isSelectedEntry);
  const selectedLabel = selectedEntry
    ? new Date(selectedEntry.record_date).toLocaleDateString("en", { month: "short", year: "numeric" })
    : null;

  return (
    <div className="weather-card">
      <div className="flex items-center justify-between mb-2">
        <p className="text-fluid-nano font-semibold tracking-[0.06em] text-white/40">
          {isViewingHistory && selectedLabel ? selectedLabel : "Conditions over time"}
        </p>
        {isViewingHistory ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href).catch(() => {});
              }}
              className="text-fluid-nano font-medium text-white/40 hover:text-white/60 transition-colors focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              Copy link
            </button>
            <Link
              href="/"
              className="text-fluid-nano font-medium text-sky-300 hover:text-sky-200 transition-colors no-underline focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              Back to now
            </Link>
          </div>
        ) : null}
      </div>

      <div className="flex h-12 items-end gap-0.5">
        {regimes.map((entry, i) => {
          const height = 20 + (i / Math.max(regimes.length - 1, 1)) * 70;
          const isCurrent = i === regimes.length - 1 && !isViewingHistory;
          const selected = isSelectedEntry(entry);
          return (
            <button
              key={entry.record_date}
              type="button"
              onClick={() => handleSelect(entry)}
              className="group flex h-12 min-h-11 flex-1 cursor-pointer items-end justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              aria-label={`${entry.record_date}: ${entry.regime} regime`}
            >
              <span
                aria-hidden="true"
                className={`block w-full rounded-t-sm transition-[height,opacity] group-hover:opacity-80 ${
                  REGIME_COLORS[entry.regime] ?? "bg-slate-500/40"
                } ${isCurrent ? "ring-1 ring-white/30" : ""} ${selected ? "ring-2 ring-sky-400/80 opacity-100" : "opacity-60"}`}
                style={{ height: `${height}%` }}
              />
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-fluid-nano text-white/30 mt-1">
        <span>{regimes[0].record_date}</span>
        {isViewingHistory ? (
          <span>Selected</span>
        ) : (
          <span>{regimes[regimes.length - 1].record_date}</span>
        )}
      </div>
    </div>
  );
}
