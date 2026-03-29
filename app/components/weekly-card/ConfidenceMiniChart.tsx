import type { ConfidenceTrendFraming, WeeklyConfidencePoint } from "../../../lib/report/reportData";
import { sectionSpacing, tierOneHeading, tierOnePanel } from "./shared";

const confidenceTrendTone: Record<ConfidenceTrendFraming, string> = {
  strengthening: "text-emerald-200",
  weakening: "text-rose-200",
  unstable: "text-amber-200",
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const buildLinePath = (points: Array<{ x: number; y: number }>) =>
  points.length === 0
    ? ""
    : points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

const buildAreaPath = (points: Array<{ x: number; y: number }>, chartHeight: number) => {
  if (points.length === 0) {
    return "";
  }

  const [first] = points;
  const last = points[points.length - 1];
  return `${buildLinePath(points)} L ${last.x} ${chartHeight} L ${first.x} ${chartHeight} Z`;
};

const buildForecastBandPath = ({
  from,
  to,
  bandHalfWidth,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  bandHalfWidth: number;
}) =>
  `M ${from.x} ${from.y - bandHalfWidth * 0.45} L ${to.x} ${to.y - bandHalfWidth} L ${to.x} ${to.y + bandHalfWidth} L ${from.x} ${from.y + bandHalfWidth * 0.45} Z`;

export const ConfidenceMiniChart = ({
  confidenceHistory,
  confidenceTrend,
}: {
  confidenceHistory: WeeklyConfidencePoint[];
  confidenceTrend: ConfidenceTrendFraming;
}) => {
  const chartWidth = 176;
  const chartHeight = 64;
  const insetX = 8;
  const insetY = 8;
  const activePoints = confidenceHistory
    .map((point, index) => ({ ...point, index }))
    .filter((point): point is WeeklyConfidencePoint & { confidencePercent: number; index: number } => typeof point.confidencePercent === "number");
  const currentPoint = activePoints[activePoints.length - 1] ?? null;
  const renderedPoints = confidenceHistory.map((point, index) => {
    const x = insetX + ((chartWidth - insetX * 2) * (confidenceHistory.length <= 1 ? 0 : index / (confidenceHistory.length - 1)));
    if (typeof point.confidencePercent !== "number" || point.isMissing) {
      return {
        kind: "missing" as const,
        x,
        y: chartHeight - insetY,
        label: `${point.recordDate} missing confidence data`,
      };
    }

    return {
      kind: "value" as const,
      x,
      y: insetY + ((chartHeight - insetY * 2) * (100 - clamp(point.confidencePercent, 0, 100))) / 100,
      value: point.confidencePercent,
      recordDate: point.recordDate,
      label: `${point.recordDate} confidence ${Math.round(point.confidencePercent)}%`,
    };
  });
  const linePoints = renderedPoints
    .filter((point): point is Extract<typeof renderedPoints[number], { kind: "value" }> => point.kind === "value")
    .map((point) => ({ x: point.x, y: point.y }));
  const linePath = buildLinePath(linePoints);
  const areaPath = buildAreaPath(linePoints, chartHeight - insetY);
  const trendDelta = confidenceTrend === "strengthening" ? -5 : confidenceTrend === "weakening" ? 7 : 2;
  const forecastBandWidth = confidenceTrend === "unstable" ? 12 : confidenceTrend === "weakening" ? 10 : 8;
  const forecastPoint = currentPoint
    ? {
        x: chartWidth - insetX,
        y: insetY + ((chartHeight - insetY * 2) * (100 - clamp(currentPoint.confidencePercent - trendDelta, 0, 100))) / 100,
      }
    : null;
  const forecastBandPath = currentPoint && forecastPoint
    ? buildForecastBandPath({
        from: {
          x: insetX + ((chartWidth - insetX * 2) * ((confidenceHistory.length - 1) / Math.max(1, confidenceHistory.length + 1))),
          y: linePoints[linePoints.length - 1]?.y ?? forecastPoint.y,
        },
        to: forecastPoint,
        bandHalfWidth: forecastBandWidth,
      })
    : "";

  return (
    <article className={`${tierOnePanel} ${sectionSpacing}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className={tierOneHeading}>Confidence trend (8w)</h2>
          <p className={`text-xs font-semibold uppercase tracking-[0.1em] ${confidenceTrendTone[confidenceTrend]}`}>{confidenceTrend}</p>
        </div>
        {currentPoint ? (
          <p className="text-right text-[11px] text-slate-300">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Now</span>
            <span className="text-sm font-semibold text-slate-100">{Math.round(currentPoint.confidencePercent)}%</span>
          </p>
        ) : null}
      </div>
      <div className="mt-2 rounded-xl border border-slate-800/70 bg-slate-950/60 px-2 py-2">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-24 w-full"
          role="img"
          aria-label="Last 8 weekly confidence values"
        >
          <line x1={insetX} y1={chartHeight / 2} x2={chartWidth - insetX} y2={chartHeight / 2} stroke="rgba(71,85,105,0.45)" strokeWidth="1" strokeDasharray="3 3" />
          {areaPath ? <path d={areaPath} fill="rgba(125,211,252,0.08)" /> : null}
          {linePath ? <path d={linePath} fill="none" stroke="rgba(125,211,252,0.95)" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" /> : null}
          {forecastBandPath ? <path d={forecastBandPath} fill="rgba(251,191,36,0.12)" stroke="rgba(251,191,36,0.28)" strokeWidth="1" /> : null}
          {forecastPoint ? <line x1={linePoints[linePoints.length - 1]?.x ?? forecastPoint.x} y1={linePoints[linePoints.length - 1]?.y ?? forecastPoint.y} x2={forecastPoint.x} y2={forecastPoint.y} stroke="rgba(251,191,36,0.7)" strokeWidth="1.5" strokeDasharray="4 3" /> : null}
          {renderedPoints.map((point) => (
            point.kind === "value" ? (
              <circle
                key={point.label}
                cx={point.x}
                cy={point.y}
                r={currentPoint?.recordDate === point.recordDate ? 3.5 : 2.4}
                fill={currentPoint?.recordDate === point.recordDate ? "rgb(251 191 36)" : "rgb(186 230 253)"}
                stroke="rgba(15,23,42,0.95)"
                strokeWidth="1.2"
              />
            ) : (
              <g key={point.label}>
                <line x1={point.x} y1={point.y - 12} x2={point.x} y2={point.y} stroke="rgba(251,191,36,0.85)" strokeWidth="1.4" strokeDasharray="3 2" />
                <circle cx={point.x} cy={point.y} r="2.1" fill="rgba(15,23,42,0.95)" stroke="rgba(251,191,36,0.95)" strokeWidth="1.1" />
              </g>
            )
          ))}
          {forecastPoint ? <circle cx={forecastPoint.x} cy={forecastPoint.y} r={2.5} fill="rgb(251 191 36)" stroke="rgba(15,23,42,0.95)" strokeWidth="1.1" /> : null}
        </svg>
      </div>
      <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/70 bg-slate-950/60 px-2 py-1">
          <span className="h-px w-4 bg-sky-300" aria-hidden="true" />
          Reported
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/70 bg-slate-950/60 px-2 py-1">
          <span className="h-0 w-4 border-t border-dashed border-amber-300" aria-hidden="true" />
          Stability cone
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/70 bg-slate-950/60 px-2 py-1">
          <span className="h-2 w-2 rounded-full border border-amber-300 bg-slate-950" aria-hidden="true" />
          Missing week
        </span>
      </div>
    </article>
  );
};
