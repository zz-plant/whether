"use client";

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

export function V2RegimeHistory({ regimes, currentRegime }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedMonth = searchParams?.get("month");
  const selectedYear = searchParams?.get("year");
  const isViewingHistory = Boolean(selectedMonth && selectedYear);

  if (regimes.length < 2) return null;

  const handleSelect = (entry: { record_date: string }) => {
    const ym = parseYearMonth(entry.record_date);
    if (!ym) return;
    router.push(`/?month=${ym.month}&year=${ym.year}`, { scroll: false });
  };

  const lastEntry = regimes[regimes.length - 1];
  const lastYM = parseYearMonth(lastEntry.record_date);
  const isSelectedEntry = (entry: { record_date: string }) => {
    if (!selectedMonth || !selectedYear) return false;
    const ym = parseYearMonth(entry.record_date);
    return ym?.month === Number(selectedMonth) && ym?.year === Number(selectedYear);
  };

  const selectedEntry = regimes.find(isSelectedEntry);
  const selectedLabel = selectedEntry
    ? new Date(selectedEntry.record_date).toLocaleDateString("en", { month: "short", year: "numeric" })
    : null;

  return (
    <div className="weather-card shadow-[0_2px_8px_rgba(0,0,0,0.2),0_8px_24px_rgba(0,0,0,0.12)]">
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
              className="text-fluid-nano font-medium text-white/30 hover:text-white/50 transition-colors focus-visible:outline-2 focus-visible:outline-sky-400"
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

      <div className="flex items-end gap-0.5 h-12">
        {regimes.map((entry, i) => {
          const height = 20 + (i / Math.max(regimes.length - 1, 1)) * 70;
          const isCurrent = i === regimes.length - 1 && !isViewingHistory;
          const selected = isSelectedEntry(entry);
          return (
            <button
              key={entry.record_date}
              type="button"
              onClick={() => handleSelect(entry)}
              className={`flex-1 rounded-t-sm cursor-pointer transition-[height,opacity] hover:opacity-80 focus-visible:outline-2 focus-visible:outline-sky-400 focus-visible:outline-offset-1 ${
                REGIME_COLORS[entry.regime] ?? "bg-slate-500/40"
              } ${isCurrent ? "ring-1 ring-white/30" : ""} ${selected ? "ring-2 ring-sky-400/80 opacity-100" : "opacity-60"}`}
              style={{ height: `${height}%` }}
              aria-label={`${entry.record_date}: ${entry.regime} regime`}
            />
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
