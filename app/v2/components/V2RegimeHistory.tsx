"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { WeeklyLeadershipSummary } from "../../../lib/report/homeBriefModel";
import { REGIME_COLORS } from "../viewModel";

type Props = {
  regimes: Array<{ record_date: string; regime: string }>;
  currentRegime: string;
  weeklyLeadershipSummary: WeeklyLeadershipSummary;
};

function parseYearMonth(dateStr: string): { year: number; month: number } | null {
  const d = new Date(dateStr);
  if (Number.isNaN(d.valueOf())) return null;
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

const normalizeFourPointSeries = (series: number[], current: number) => {
  const compact = series.slice(-4);
  if (compact.length === 4) return compact;

  return [current - 3, current - 2, current - 1, current].slice(-4).map((value) => Math.max(0, Math.min(100, value)));
};

export function V2RegimeHistory({ regimes, currentRegime, weeklyLeadershipSummary }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedMonth = searchParams?.get("month");
  const selectedYear = searchParams?.get("year");
  const isViewingHistory = Boolean(selectedMonth && selectedYear);
  const boldnessSeries = normalizeFourPointSeries(weeklyLeadershipSummary.last4Boldness, weeklyLeadershipSummary.boldnessScore);

  if (regimes.length < 2) return null;

  const handleSelect = (entry: { record_date: string }) => {
    const ym = parseYearMonth(entry.record_date);
    if (!ym) return;
    router.push(`/?month=${ym.month}&year=${ym.year}`, { scroll: false });
  };

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
    <section className="weather-card lg:col-span-4" aria-labelledby="memory-rail-heading">
      <div className="flex items-center justify-between gap-3">
        <p className="text-fluid-nano font-semibold tracking-[0.14em] text-white/40" id="memory-rail-heading">
          memory rail
        </p>
        {isViewingHistory ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href).catch(() => {});
              }}
              className="text-fluid-nano font-medium text-white/40 transition-colors hover:text-white/60 focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              Copy link
            </button>
            <Link
              href="/"
              className="text-fluid-nano font-medium text-sky-300 no-underline transition-colors hover:text-sky-200 focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              Back to now
            </Link>
          </div>
        ) : null}
      </div>

      <div className="mt-3 space-y-2 text-fluid-micro">
        <p className="text-white/65">Last 4 weeks: Boldness {boldnessSeries.join(" → ")}</p>
        <p className="text-white/55">Hiring window trend: <strong className="text-white">{weeklyLeadershipSummary.hiringTrend}</strong></p>
        <p className="text-white/35">{isViewingHistory && selectedLabel ? selectedLabel : `Current regime: ${currentRegime}`}</p>
      </div>

      <div className="mt-4 flex h-10 items-end gap-0.5">
        {regimes.map((entry, i) => {
          const height = 20 + (i / Math.max(regimes.length - 1, 1)) * 70;
          const isCurrent = i === regimes.length - 1 && !isViewingHistory;
          const selected = isSelectedEntry(entry);
          return (
            <button
              key={entry.record_date}
              type="button"
              onClick={() => handleSelect(entry)}
              className={`flex-1 cursor-pointer rounded-t-sm transition-[height,opacity] hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-400 ${
                REGIME_COLORS[entry.regime] ?? "bg-slate-500/40"
              } ${isCurrent ? "ring-1 ring-white/30" : ""} ${selected ? "opacity-100 ring-2 ring-sky-400/80" : "opacity-60"}`}
              style={{ height: `${height}%` }}
              aria-label={`${entry.record_date}: ${entry.regime} regime`}
            />
          );
        })}
      </div>
    </section>
  );
}
