import type { ConfidenceTrendFraming, WeeklyConfidencePoint } from "../../../lib/report/reportData";
import { sectionSpacing, tierOneHeading, tierOnePanel } from "./shared";

const confidenceTrendTone: Record<ConfidenceTrendFraming, string> = {
  strengthening: "text-emerald-200",
  weakening: "text-rose-200",
  unstable: "text-amber-200",
};

export const ConfidenceMiniChart = ({
  confidenceHistory,
  confidenceTrend,
}: {
  confidenceHistory: WeeklyConfidencePoint[];
  confidenceTrend: ConfidenceTrendFraming;
}) => {
  const knownValues = confidenceHistory
    .filter((point): point is WeeklyConfidencePoint & { confidencePercent: number } => typeof point.confidencePercent === "number")
    .map((point) => point.confidencePercent);
  const min = knownValues.length > 0 ? Math.min(...knownValues) : 0;
  const max = knownValues.length > 0 ? Math.max(...knownValues) : 100;
  const range = Math.max(max - min, 1);

  return (
    <article className={`${tierOnePanel} ${sectionSpacing}`}>
      <h2 className={tierOneHeading}>Confidence trend (8w)</h2>
      <p className={`text-xs font-semibold uppercase tracking-[0.1em] ${confidenceTrendTone[confidenceTrend]}`}>{confidenceTrend}</p>
      <div className="mt-1 flex h-14 items-end gap-1.5" role="img" aria-label="Last 8 weekly confidence values">
        {confidenceHistory.length === 0 ? <p className="text-xs text-slate-400">No confidence history available.</p> : null}
        {confidenceHistory.map((point) => {
          const missing = point.isMissing || typeof point.confidencePercent !== "number";
          const confidencePercent = typeof point.confidencePercent === "number" ? point.confidencePercent : null;
          const height = missing || confidencePercent === null ? 14 : Math.max(14, Math.round(((confidencePercent - min) / range) * 44) + 14);
          return (
            <div key={point.recordDate} className="group relative flex-1">
              <span
                className={missing ? "block rounded-sm border border-amber-400/80 border-dashed bg-amber-500/5" : "block rounded-sm bg-sky-300/80"}
                style={{ height }}
                aria-label={missing || confidencePercent === null ? `${point.recordDate} missing confidence data` : `${point.recordDate} confidence ${Math.round(confidencePercent)}%`}
              />
              <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-100 group-hover:block">
                {missing || confidencePercent === null ? `${point.recordDate}: missing` : `${point.recordDate}: ${Math.round(confidencePercent)}%`}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400">Missing weeks are dashed markers.</p>
    </article>
  );
};
