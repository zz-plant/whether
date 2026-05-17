import type { SourceHealthRow } from "../../lib/report/sourceHealth";
import { formatSourceFreshnessLabel, formatSourceModeLabel } from "../../lib/report/sourceHealth";

const modeStyles: Record<string, string> = {
  live: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  snapshot: "border-sky-400/40 bg-sky-500/10 text-sky-200",
  fallback: "border-amber-400/40 bg-amber-500/10 text-amber-200",
};

const freshnessStyles: Record<string, string> = {
  fresh: "text-emerald-300",
  stale: "text-amber-300",
  unknown: "text-slate-400",
};

const formatSla = (hours: number): string => {
  if (hours >= 24) return `${Math.round(hours / 24)}d SLA`;
  return `${hours}h SLA`;
};

const formatLastFetch = (timestamp: string | null): string => {
  if (!timestamp) return "Never";
  const date = new Date(timestamp);
  const now = new Date();
  const diffHours = (now.getTime() - date.getTime()) / 3_600_000;
  if (diffHours < 1) return `${Math.round(diffHours * 60)}m ago`;
  if (diffHours < 24) return `${Math.round(diffHours)}h ago`;
  return `${Math.round(diffHours / 24)}d ago`;
};

export function SourceHealthPanel({ rows }: { rows: SourceHealthRow[] }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3">
        {rows.map((row) => {
          const freshnessLabel = formatSourceFreshnessLabel(row);
          const modeLabel = formatSourceModeLabel(row.mode);
          const modeStyle = modeStyles[row.mode] ?? modeStyles.fallback;
          const freshnessStyle = freshnessStyles[row.freshnessStatus] ?? freshnessStyles.unknown;

          return (
            <div
              key={row.sourceName}
              className="weather-surface rounded-md border border-slate-800/80 px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-100">{row.sourceName}</p>
                  <p className="mt-0.5 text-fluid-xs text-slate-400">{row.cadenceLabel}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className={`rounded-full border px-2 py-0.5 text-fluid-micro font-semibold uppercase tracking-[0.12em] ${modeStyle}`}>
                    {modeLabel}
                  </span>
                  <span className={`rounded-full border border-slate-700/70 bg-slate-900/70 px-2 py-0.5 text-fluid-micro font-semibold uppercase tracking-[0.12em] ${freshnessStyle}`}>
                    {freshnessLabel}
                  </span>
                  <span className="rounded-full border border-slate-700/70 bg-slate-900/70 px-2 py-0.5 text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {formatSla(row.freshnessSlaHours)}
                  </span>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-fluid-xs text-slate-500">
                <span>Last fetch: {formatLastFetch(row.lastSuccessfulFetchAt)}</span>
              </div>
              {row.activeFallbackReason ? (
                <p className="mt-2 text-fluid-xs leading-5 text-amber-300/90">
                  {row.activeFallbackReason}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
