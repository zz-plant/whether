import type { ConfidenceTrendFraming, WeeklyConfidencePoint } from "../../../lib/report/reportData";
import { sectionSpacing, tierOneHeading, tierOnePanel } from "./shared";

const confidenceTrendTone: Record<ConfidenceTrendFraming, string> = {
  strengthening: "text-emerald-200",
  weakening: "text-rose-200",
  unstable: "text-amber-200",
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const resolveThreshold = (confidencePercent: number) => {
  if (confidencePercent >= 75) {
    return {
      value: 75,
      detail: "Stay above this to keep the clear-read lane.",
    };
  }

  if (confidencePercent >= 60) {
    return {
      value: 75,
      detail: "Cross back above this before widening approvals.",
    };
  }

  return {
    value: 60,
    detail: "Recover above this before leaving hold territory.",
  };
};

export const ConfidenceMiniChart = ({
  confidenceHistory,
  confidenceTrend,
  currentConfidencePercent,
}: {
  confidenceHistory: WeeklyConfidencePoint[];
  confidenceTrend: ConfidenceTrendFraming;
  currentConfidencePercent?: number;
}) => {
  const activePoints = confidenceHistory.filter(
    (point): point is WeeklyConfidencePoint & { confidencePercent: number } =>
      typeof point.confidencePercent === "number" && !point.isMissing,
  );
  const currentPoint = activePoints[activePoints.length - 1] ?? (
    typeof currentConfidencePercent === "number"
      ? { recordDate: "Current week", confidencePercent: currentConfidencePercent, isMissing: false }
      : null
  );
  const previousPoint = activePoints.length > 1 ? activePoints[activePoints.length - 2] : null;
  const currentPercent = currentPoint ? Math.round(currentPoint.confidencePercent) : null;
  const previousPercent = previousPoint ? Math.round(previousPoint.confidencePercent) : null;
  const currentHistoryIndex = currentPoint
    ? confidenceHistory.findIndex((point) => point.recordDate === currentPoint.recordDate)
    : -1;
  const previousHistoryIndex = previousPoint
    ? confidenceHistory.findIndex((point) => point.recordDate === previousPoint.recordDate)
    : -1;
  const previousLabel = currentPoint && previousPoint
    ? currentHistoryIndex - previousHistoryIndex === 1
      ? "Last week"
      : "Last read"
    : "Last read";
  const threshold = currentPercent !== null ? resolveThreshold(currentPercent) : null;
  const delta = currentPercent !== null && previousPercent !== null ? currentPercent - previousPercent : null;
  const missingWeeks = confidenceHistory.filter((point) => point.isMissing).length;
  const thresholdGap = currentPercent !== null && threshold ? currentPercent - threshold.value : null;
  const thresholdStatus = thresholdGap === null
    ? null
    : thresholdGap > 0
      ? {
          label: `${thresholdGap} pts above line`,
          detail: "Safely above the decision threshold.",
          toneClass: "border-emerald-400/25 bg-emerald-500/8 text-emerald-100",
        }
      : thresholdGap < 0
        ? {
            label: `${Math.abs(thresholdGap)} pts below line`,
            detail: "Below the decision threshold.",
            toneClass: "border-rose-400/25 bg-rose-500/8 text-rose-100",
          }
        : {
            label: "On the line",
            detail: "Sitting exactly on the decision threshold.",
            toneClass: "border-amber-400/25 bg-amber-500/8 text-amber-100",
          };

  return (
    <article className={`${tierOnePanel} ${sectionSpacing}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={tierOneHeading}>Confidence check</h2>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">{previousLabel} -&gt; This week -&gt; Threshold</p>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.1em] ${confidenceTrendTone[confidenceTrend]}`}>
            {confidenceTrend}
          </p>
        </div>
        {thresholdStatus ? (
          <div className={`rounded-full border px-3 py-1.5 text-right text-[10px] font-semibold uppercase tracking-[0.12em] ${thresholdStatus.toneClass}`}>
            <span className="block">{thresholdStatus.label}</span>
          </div>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800/70 bg-slate-950/55 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{previousLabel}</p>
          <p className="mt-1 text-lg font-semibold text-slate-100">
            {previousPercent !== null ? `${previousPercent}%` : "n/a"}
          </p>
        </div>
        <div className="rounded-xl border border-sky-400/25 bg-sky-500/8 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200">This week</p>
          <p className="mt-1 text-lg font-semibold text-sky-50">
            {currentPercent !== null ? `${currentPercent}%` : "n/a"}
          </p>
        </div>
        <div className="rounded-xl border border-amber-400/25 bg-amber-500/8 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200">Threshold</p>
          <p className="mt-1 text-lg font-semibold text-amber-50">
            {threshold ? `${threshold.value}%` : "n/a"}
          </p>
        </div>
      </div>

      {currentPercent !== null && threshold ? (
        <div className="rounded-xl border border-slate-800/70 bg-slate-950/55 px-3 py-3">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
            <span>0</span>
            <span>100</span>
          </div>
          <div className="relative mt-2 h-2 rounded-full bg-slate-900/90">
            <div className="absolute inset-0 rounded-full bg-[linear-gradient(90deg,rgba(244,63,94,0.28),rgba(251,191,36,0.24)_58%,rgba(16,185,129,0.28))]" />
            <div
              className="absolute top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-slate-200/90"
              style={{ left: `${clamp(threshold.value, 0, 100)}%` }}
            />
            {previousPercent !== null ? (
              <div
                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200/90 bg-slate-950"
                style={{ left: `${clamp(previousPercent, 0, 100)}%` }}
              />
            ) : null}
            <div
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-300/90 bg-amber-300"
              style={{ left: `${clamp(currentPercent, 0, 100)}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            {previousPercent !== null ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/70 bg-slate-950/60 px-2 py-1">
                <span className="h-2.5 w-2.5 rounded-full border border-slate-200/90 bg-slate-950" aria-hidden="true" />
                {previousLabel}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/70 bg-slate-950/60 px-2 py-1">
              <span className="h-3 w-3 rounded-full border border-amber-300/90 bg-amber-300" aria-hidden="true" />
              This week
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/70 bg-slate-950/60 px-2 py-1">
              <span className="h-0 w-4 border-t border-slate-200" aria-hidden="true" />
              Threshold
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-300">
            {thresholdStatus ? `${thresholdStatus.detail} ` : ""}
            {delta !== null
              ? `${delta >= 0 ? "+" : ""}${delta} pts vs ${previousLabel.toLowerCase()}. ${threshold.detail}`
              : threshold.detail}
            {missingWeeks > 0 ? ` ${missingWeeks} missing week${missingWeeks === 1 ? "" : "s"} in the 8-week window.` : ""}
          </p>
        </div>
      ) : null}
    </article>
  );
};
