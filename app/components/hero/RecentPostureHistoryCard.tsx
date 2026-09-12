import Link from "next/link";
import { formatMonthShortUtc } from "../../../lib/formatters";
import { getRegimePublicLabel } from "../../../lib/regimePresentation";

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

export function RecentPostureHistoryCard({
  history,
  historyHref = "/history",
  className = "",
}: RecentPostureHistoryCardProps) {
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

        <div className="flex items-center gap-4 self-start sm:self-auto">
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
    </section>
  );
}
