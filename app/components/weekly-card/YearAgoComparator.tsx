import type { LastYearComparison } from "../../../lib/report/reportData";
import { formatDateUTC } from "../../../lib/formatters";
import { formatDelta, formatOptionalDelta } from "../../../lib/report/signalFormatting";
import { compactInset, tierThreeHeading } from "./shared";

const yearAgoMetricTones = [
  { label: "Tightness", stroke: "stroke-rose-300", fill: "fill-rose-300", text: "text-rose-100" },
  { label: "Risk appetite", stroke: "stroke-sky-300", fill: "fill-sky-300", text: "text-sky-100" },
] as const;

const yearAgoY = (value: number) => 62 - ((Math.max(0, Math.min(100, value)) / 100) * 48);

export function YearAgoComparator({ comparison }: { comparison: LastYearComparison }) {
  const scoreMetrics = [
    { ...yearAgoMetricTones[0], prior: comparison.prior.tightness, current: comparison.current.tightness },
    { ...yearAgoMetricTones[1], prior: comparison.prior.riskAppetite, current: comparison.current.riskAppetite },
  ];
  const summaryMetrics = [
    {
      label: "Regime",
      value: `${comparison.prior.regime} → ${comparison.current.regime}`,
      detail: `${formatDateUTC(comparison.prior.recordDate)} vs ${formatDateUTC(comparison.current.recordDate)}`,
    },
    {
      label: "Base rate",
      value: formatDelta(comparison.prior.baseRate, comparison.current.baseRate, "%"),
      detail: `${comparison.prior.baseRate.toFixed(2)}% → ${comparison.current.baseRate.toFixed(2)}%`,
    },
    {
      label: "Curve slope",
      value: formatOptionalDelta(comparison.prior.curveSlope, comparison.current.curveSlope, "%"),
      detail: `${comparison.prior.curveSlope?.toFixed(2) ?? "—"}% → ${comparison.current.curveSlope?.toFixed(2) ?? "—"}%`,
    },
  ];

  return (
    <section aria-labelledby="year-ago-comparator">
      <h3 id="year-ago-comparator" className={tierThreeHeading}>Year-ago comparator</h3>
      <div className="mt-1.5 grid gap-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <article className={`${compactInset} space-y-2`}>
          <div className="flex flex-wrap items-center justify-between gap-2 text-fluid-xs text-slate-400">
            <span>{formatDateUTC(comparison.prior.recordDate)}</span>
            <span>{formatDateUTC(comparison.current.recordDate)}</span>
          </div>
          <svg viewBox="0 0 120 72" className="h-24 w-full" role="img" aria-label="Year-ago posture score comparison">
            <line x1="18" y1="10" x2="18" y2="62" stroke="rgb(71 85 105 / 0.55)" strokeDasharray="2 2" />
            <line x1="102" y1="10" x2="102" y2="62" stroke="rgb(71 85 105 / 0.55)" strokeDasharray="2 2" />
            <line x1="12" y1="62" x2="108" y2="62" stroke="rgb(71 85 105 / 0.55)" />
            {scoreMetrics.map((metric) => (
              <g key={metric.label}>
                <path
                  d={`M 18 ${yearAgoY(metric.prior)} L 102 ${yearAgoY(metric.current)}`}
                  fill="none"
                  className={metric.stroke}
                  strokeWidth="2.5"
                />
                <circle cx="18" cy={yearAgoY(metric.prior)} r="3.5" className={metric.fill} />
                <circle cx="102" cy={yearAgoY(metric.current)} r="3.5" className={metric.fill} />
              </g>
            ))}
          </svg>
          <ul className="grid gap-1 sm:grid-cols-2">
            {scoreMetrics.map((metric) => (
              <li key={metric.label} className="rounded-lg border border-slate-800/70 bg-slate-950/55 px-2.5 py-2 text-xs text-slate-300">
                <p className={`font-semibold ${metric.text}`}>{metric.label}</p>
                <p className="mt-1">{metric.prior.toFixed(0)} → {metric.current.toFixed(0)} ({formatDelta(metric.prior, metric.current)})</p>
              </li>
            ))}
          </ul>
        </article>
        <ul className="grid gap-1.5 sm:grid-cols-3 lg:grid-cols-1">
          {summaryMetrics.map((metric) => (
            <li key={metric.label} className={`${compactInset} text-xs text-slate-200`}>
              <p className="font-semibold text-slate-100">{metric.label}</p>
              <p className="mt-1 text-sm font-semibold text-slate-100">{metric.value}</p>
              <p className="mt-1 leading-5 text-slate-300">{metric.detail}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
