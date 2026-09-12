"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatMonthShortUtc } from "../../../lib/formatters";
import { getRegimePublicLabel } from "../../../lib/regimePresentation";
import { REGIME_COLORS } from "../../viewModel";
import { TrendGlyph, describeTrend, trendDirectionFromDelta, trendToneClass } from "../illustrations/TrendGlyph";

export interface PostureHistoryEntry {
  record_date: string;
  regime: string;
  tightness?: number | null;
  riskAppetite?: number | null;
}

export interface RecentPostureHistoryCardProps {
  history: PostureHistoryEntry[];
  historyHref?: string;
  className?: string;
  currentRegime?: string;
  currentTightness?: number;
  tightnessDelta?: number;
  riskAppetite?: number;
  riskAppetiteDelta?: number;
  serverPrevious?: { regime: string; recordDate: string } | null;
  currentRecordDate?: string;
}

const getRegimeColorClass = (regime: string) => {
  const norm = regime.toUpperCase();
  if (norm.includes("EXPANSION") || norm.includes("SUNNY")) {
    return "bg-teal-400/90 hover:bg-teal-300";
  }
  if (norm.includes("DEFENSIVE") || norm.includes("CLOUDY")) {
    return "bg-amber-400/90 hover:bg-amber-300";
  }
  return "bg-rose-400/90 hover:bg-rose-300";
};

function DeltaChip({
  label,
  delta,
  increaseIsPositive,
  unit = "pts",
}: {
  label: string;
  delta: number | null | undefined;
  increaseIsPositive: boolean;
  unit?: string;
}) {
  const direction = trendDirectionFromDelta(delta);
  const notable = typeof delta === "number" && Math.abs(delta) >= 3;

  if (direction === "flat" || delta == null) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm bg-white/[0.04] px-2 py-0.5 text-white/60 text-xs">
        <TrendGlyph direction="flat" className="h-3 w-3 shrink-0" />
        <span aria-hidden="true">{label}: unchanged</span>
        <span className="sr-only">{describeTrend({ label, delta: 0 })}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm bg-white/[0.04] px-2 py-0.5 text-xs ${trendToneClass(direction, increaseIsPositive)}`}
    >
      <TrendGlyph direction={direction} className="h-3 w-3 shrink-0" />
      <span aria-hidden="true">
        {label}: {delta > 0 ? "+" : "−"}
        {Math.abs(delta).toFixed(0)} {unit}
        {notable ? " · notable shift" : ""}
      </span>
      <span className="sr-only">
        {describeTrend({ label, delta, unit })}
        {notable ? " Notable shift." : ""}
      </span>
    </span>
  );
}

export function RecentPostureHistoryCard({
  history,
  historyHref = "/history",
  className = "",
  currentRegime,
  currentTightness,
  tightnessDelta,
  riskAppetite,
  riskAppetiteDelta,
  serverPrevious,
  currentRecordDate,
}: RecentPostureHistoryCardProps) {
  const [isComparing, setIsComparing] = useState(false);
  const panelId = useId();

  // Take trailing 24 entries (or whatever is available, minimum 6)
  const entries = history.slice(-24);
  const displayEntries = entries.length > 0 ? entries : [
    { record_date: "2026-04-01", regime: "EXPANSION" },
    { record_date: "2026-05-01", regime: "EXPANSION" },
    { record_date: "2026-06-01", regime: "DEFENSIVE" },
    { record_date: "2026-07-01", regime: "DEFENSIVE" },
    { record_date: "2026-08-01", regime: "EXPANSION" },
    { record_date: "2026-09-01", regime: "EXPANSION" },
  ];

  // Pick ~6 evenly spaced indices for month labels across the timeline
  const labelIndices = new Set<number>();
  const total = displayEntries.length;
  if (total <= 6) {
    for (let i = 0; i < total; i += 1) labelIndices.add(i);
  } else {
    const step = Math.floor(total / 5);
    for (let i = 0; i < total; i += step) {
      labelIndices.add(i);
    }
    labelIndices.add(total - 1);
  }

  const previous = serverPrevious ?? (entries.length >= 2 ? {
    regime: entries[entries.length - 2].regime,
    recordDate: entries[entries.length - 2].record_date,
  } : null);

  const previousTightness = currentTightness != null && tightnessDelta != null
    ? currentTightness - tightnessDelta
    : null;
  const previousRiskAppetite =
    typeof riskAppetite === "number" && typeof riskAppetiteDelta === "number"
      ? riskAppetite - riskAppetiteDelta
      : null;

  return (
    <section
      aria-labelledby="recent-posture-history-heading"
      className={`weather-brief-card p-5 sm:p-6 ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h3
            id="recent-posture-history-heading"
            className="text-sm font-semibold tracking-tight text-white"
          >
            Recent posture history
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Weekly outlook over time
          </p>
        </div>

        <div className="flex items-center gap-4 self-start sm:self-auto flex-wrap">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs text-slate-400" aria-label="Regime legend">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-teal-400" aria-hidden="true" />
              <span>Sunny</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />
              <span>Cloudy</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-400" aria-hidden="true" />
              <span>Stormy</span>
            </span>
          </div>

          {/* View history link */}
          <Link
            href={historyHref}
            className="inline-flex items-center gap-1 text-xs font-medium text-teal-300 hover:text-teal-200 transition-colors rounded-md px-2.5 py-1 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 no-underline"
          >
            <span>View history</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      {/* Segmented Timeline Bar */}
      <div className="space-y-1.5">
        <div
          aria-label="Recent weekly posture history bar"
          className="flex h-4 w-full gap-0.5 rounded-sm overflow-hidden bg-slate-800/60 p-0.5"
        >
          {displayEntries.map((entry, idx) => {
            const publicLabel = getRegimePublicLabel(entry.regime);
            const dateStr = entry.record_date.slice(0, 10);
            return (
              <div
                key={`${entry.record_date}-${idx}`}
                className={`flex-1 h-full rounded-[1px] transition-colors ${getRegimeColorClass(entry.regime)}`}
                title={`${dateStr}: ${publicLabel} (${entry.regime})`}
              />
            );
          })}
        </div>

        {/* Date Labels below Bar */}
        <div className="flex justify-between text-[11px] text-slate-500 tabular-nums px-0.5" aria-hidden="true">
          {displayEntries.map((entry, idx) => {
            if (!labelIndices.has(idx)) return null;
            const d = new Date(entry.record_date);
            const label = idx === 0 || idx === total - 1
              ? `${formatMonthShortUtc(d.getUTCMonth() + 1)} ${d.getUTCFullYear()}`
              : formatMonthShortUtc(d.getUTCMonth() + 1);
            return (
              <span key={`lbl-${entry.record_date}-${idx}`}>
                {label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Prior Read Delta Strip & Expandable Comparison */}
      {(tightnessDelta !== undefined || riskAppetiteDelta !== undefined) && (
        <div className="mt-4 pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">vs. Prior Read:</span>
            <DeltaChip label="Funding pressure" delta={tightnessDelta} increaseIsPositive={false} />
            {typeof riskAppetite === "number" && (
              <DeltaChip label="Risk appetite" delta={riskAppetiteDelta} increaseIsPositive />
            )}
          </div>

          {previous && (
            <button
              type="button"
              aria-expanded={isComparing}
              aria-controls={panelId}
              onClick={() => setIsComparing((val) => !val)}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              <ChevronRight
                className={`size-3.5 shrink-0 transition-transform duration-200 ${isComparing ? "rotate-90 text-teal-400" : "text-slate-400"}`}
                aria-hidden="true"
              />
              <span className={isComparing ? "text-teal-300" : undefined}>
                {isComparing ? "Hide comparison" : "Compare to last week"}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Expanded Side-by-Side Comparison */}
      {isComparing && previous && (
        <div id={panelId} className="mt-4 rounded-xl border border-white/[0.06] bg-slate-950/40 p-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-xs text-slate-400 font-medium">Previous Period ({previous.recordDate})</p>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${REGIME_COLORS[previous.regime] ?? 'bg-slate-400/60'}`} />
                  <span className="text-xs text-slate-200 font-medium">{getRegimePublicLabel(previous.regime)}</span>
                </span>
                {previousTightness !== null && (
                  <span className="text-xs text-slate-400 font-mono">{previousTightness.toFixed(0)} pts</span>
                )}
              </div>
              {previousRiskAppetite !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-medium">Risk appetite</span>
                  <span className="text-xs text-slate-400 font-mono">{previousRiskAppetite.toFixed(0)}/100</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-slate-400 font-medium">Current Read ({currentRecordDate ?? "Today"})</p>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${currentRegime ? REGIME_COLORS[currentRegime] : 'bg-teal-400'}`} />
                  <span className="text-xs text-white font-medium">{currentRegime ? getRegimePublicLabel(currentRegime) : "Sunny"}</span>
                </span>
                {currentTightness !== undefined && (
                  <span className="text-xs text-white font-mono">{currentTightness} pts</span>
                )}
              </div>
              {typeof riskAppetite === "number" && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-200 font-medium">Risk appetite</span>
                  <span className="text-xs text-white font-mono">{riskAppetite}/100</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
