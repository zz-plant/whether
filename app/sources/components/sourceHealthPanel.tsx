import { formatTimestampUTC } from "../../../lib/formatters";
import {
  formatSourceFreshnessLabel,
  formatSourceModeLabel,
  type SourceHealthRow,
} from "../../../lib/report/sourceHealth";

const freshnessTone = (status: SourceHealthRow["freshnessStatus"]) => {
  if (status === "fresh") return "text-emerald-300";
  if (status === "stale") return "text-amber-300";
  return "text-slate-400";
};

const modeTone = (mode: SourceHealthRow["mode"]) =>
  mode === "live" ? "text-emerald-300" : mode === "snapshot" ? "text-sky-300" : "text-amber-300";

const formatLastSuccessfulFetch = (timestamp: string | null) => {
  if (!timestamp) {
    return "Unknown";
  }

  return formatTimestampUTC(timestamp);
};

export function SourceHealthPanel({ rows }: { rows: SourceHealthRow[] }) {
  return (
    <section className="weather-panel space-y-3 px-6 py-6" aria-labelledby="source-health-heading">
      <h2 id="source-health-heading" className="text-lg font-semibold text-slate-100">Source health</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-200">
          <thead>
            <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
              <th className="px-2 py-2">Source</th>
              <th className="px-2 py-2">Cadence</th>
              <th className="px-2 py-2">Mode</th>
              <th className="px-2 py-2">Freshness</th>
              <th className="px-2 py-2">Last successful fetch</th>
              <th className="px-2 py-2">Fallback reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.sourceName} className="border-b border-slate-900/80 align-top">
                <td className="px-2 py-2 font-medium text-slate-100">{row.sourceName}</td>
                <td className="px-2 py-2 text-slate-300">{row.cadenceLabel}</td>
                <td className={`px-2 py-2 ${modeTone(row.mode)}`}>{formatSourceModeLabel(row.mode)}</td>
                <td className={`px-2 py-2 ${freshnessTone(row.freshnessStatus)}`}>{formatSourceFreshnessLabel(row)}</td>
                <td className="px-2 py-2">{formatLastSuccessfulFetch(row.lastSuccessfulFetchAt)}</td>
                <td className="px-2 py-2 text-slate-300">{row.activeFallbackReason ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
