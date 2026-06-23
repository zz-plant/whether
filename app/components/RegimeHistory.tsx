"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { REGIME_COLORS } from "../viewModel";
import { findEventAt, findNearestEvent } from "../../lib/summary/regimeEvents";

type RegimeHistoryEntry = {
  record_date: string;
  regime: string;
  tightness?: number;
  riskAppetite?: number;
};

type Props = {
  regimes: RegimeHistoryEntry[];
};

function parseYearMonth(dateStr: string): { year: number; month: number } | null {
  const d = new Date(dateStr);
  if (Number.isNaN(d.valueOf())) return null;
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function formatAxisDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.valueOf())) return dateStr;
  return d.toLocaleDateString("en", { month: "short", year: "2-digit" });
}

export function RegimeHistory({ regimes }: Props) {
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

  const hasEvents = regimes.some((entry) => {
    const ym = parseYearMonth(entry.record_date);
    return ym ? findEventAt(ym.year, ym.month) !== null : false;
  });

  return (
    <div className="weather-card">
      <div className="flex items-center justify-between mb-2">
        <p className="text-fluid-nano font-semibold tracking-[0.06em] text-white/60">
          {isViewingHistory && selectedLabel ? selectedLabel : "Conditions over time"}
        </p>
        {isViewingHistory ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href).catch(() => {});
              }}
              className="text-fluid-nano font-medium text-white/60 hover:text-white/60 transition-colors focus-visible:outline-2 focus-visible:outline-sky-400"
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

      <div className="relative flex h-14 items-end gap-1 overflow-x-auto">
        <div className="absolute left-0 right-0 top-1/2 h-px bg-white/[0.06]" aria-hidden="true" />
        {regimes.map((entry, i) => {
          const isCurrent = i === regimes.length - 1 && !isViewingHistory;
          const selected = isSelectedEntry(entry);
          const boldness = entry.tightness != null && entry.riskAppetite != null
            ? Math.round(entry.riskAppetite * 0.7 + (100 - entry.tightness) * 0.3)
            : null;
          const barHeight = boldness != null ? `${Math.max(20, Math.min(95, boldness))}%` : "85%";
          const ym = parseYearMonth(entry.record_date);
          const event = ym ? findEventAt(ym.year, ym.month) : null;
          const nearest = ym && !event ? findNearestEvent(ym.year, ym.month) : null;
          const tooltipParts = [
            `${new Date(entry.record_date).toLocaleDateString("en", { month: "short", year: "numeric" })}: ${entry.regime}`,
            boldness != null ? `${boldness}/100` : null,
            event ? event.label : null,
            nearest ? `${nearest.monthsDistance === 0 ? "during" : nearest.monthsDistance === 1 ? "1 mo from" : `${nearest.monthsDistance} mo from`} ${nearest.event.label}` : null,
          ].filter(Boolean);
          return (
            <button
                      key={entry.record_date}
              type="button"
              onClick={() => handleSelect(entry)}
              className="group relative flex h-14 min-h-11 min-w-[1rem] flex-1 cursor-pointer items-end justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              aria-label={tooltipParts.join(" · ")}
              title={tooltipParts.join(" · ")}
            >
              {event ? (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[7px] leading-none text-amber-300/70" aria-hidden="true">★</span>
              ) : null}
              <span
                aria-hidden="true"
                className={`block w-full rounded-t-sm transition-[opacity] group-hover:opacity-80 ${
                  REGIME_COLORS[entry.regime] ?? "bg-slate-500/40"
                } ${isCurrent ? "ring-2 ring-white/40" : ""} ${selected ? "ring-2 ring-sky-400/80 opacity-100" : "opacity-60"}`}
                style={{ height: barHeight }}
              />
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-fluid-nano text-white/50 mt-1">
        <span>{formatAxisDate(regimes[0].record_date)}</span>
        {regimes.length >= 8 ? (
          <span className="text-white/20">{formatAxisDate(regimes[Math.floor(regimes.length / 2)].record_date)}</span>
        ) : null}
        {isViewingHistory ? (
          <span>Selected</span>
        ) : (
          <span>{formatAxisDate(regimes[regimes.length - 1].record_date)}</span>
        )}
      </div>
      {hasEvents ? (
        <p className="text-fluid-nano text-white/25 mt-0.5">
          <span className="text-amber-300/60">★</span> = notable event · hover for details
        </p>
      ) : null}
    </div>
  );
}
