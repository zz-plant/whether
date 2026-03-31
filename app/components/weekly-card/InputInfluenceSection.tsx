import type { InputInfluenceItem } from "../../../lib/report/homeBriefModel";
import { buildThresholdMarkerState } from "../../../lib/report/homeBriefPresentation";
import { sectionSpacing, tierOneHeading, tierOnePanel } from "./shared";

const inputInfluenceToneClasses: Record<
  InputInfluenceItem["tone"],
  { badge: string; fill: string }
> = {
  warning: {
    badge: "border-rose-400/35 bg-rose-500/10 text-rose-100",
    fill: "bg-rose-300",
  },
  positive: {
    badge: "border-emerald-400/35 bg-emerald-500/10 text-emerald-100",
    fill: "bg-emerald-300",
  },
  neutral: {
    badge: "border-slate-600/75 bg-slate-950/60 text-slate-200",
    fill: "bg-slate-300",
  },
};

const clampSparklineValue = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const buildSparklinePath = (values: number[], width: number, height: number) => {
  if (values.length === 0) {
    return "";
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const yDomainPadding =
    max === min ? Math.max(1, Math.abs(max) * 0.08 || 1) : (max - min) * 0.12;
  const domainMin = min - yDomainPadding;
  const domainMax = max + yDomainPadding;

  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const normalized =
        (clampSparklineValue(value, domainMin, domainMax) - domainMin) /
        (domainMax - domainMin || 1);
      const y = height - normalized * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
};

function InputInfluenceSparkline({
  values,
  tone,
  label,
}: {
  values: number[];
  tone: InputInfluenceItem["tone"];
  label: string;
}) {
  if (values.length === 0) {
    return (
      <div className="rounded-lg border border-slate-700/60 bg-slate-950/55 px-2.5 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
          Recent path
        </p>
        <p className="mt-1 text-[11px] text-slate-400">Recent movement unavailable.</p>
      </div>
    );
  }

  const strokeClass =
    tone === "warning"
      ? "stroke-rose-300"
      : tone === "positive"
        ? "stroke-emerald-300"
        : "stroke-slate-300";
  const fillClass =
    tone === "warning"
      ? "fill-rose-300"
      : tone === "positive"
        ? "fill-emerald-300"
        : "fill-slate-300";
  const chartWidth = 84;
  const chartHeight = 22;
  const path = buildSparklinePath(values, chartWidth, chartHeight);
  const currentValue = values[values.length - 1];

  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-950/55 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
          Recent path
        </p>
        <p className="text-[10px] text-slate-400">{values.length}-read view</p>
      </div>
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="mt-2 h-7 w-full"
        role="img"
        aria-label={`${label} recent movement sparkline`}
      >
        <path
          d={path}
          fill="none"
          className={strokeClass}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {path ? (
          <circle
            cx={values.length === 1 ? chartWidth / 2 : chartWidth}
            cy={(() => {
              const min = Math.min(...values);
              const max = Math.max(...values);
              const yDomainPadding =
                max === min
                  ? Math.max(1, Math.abs(max) * 0.08 || 1)
                  : (max - min) * 0.12;
              const domainMin = min - yDomainPadding;
              const domainMax = max + yDomainPadding;
              const normalized =
                (clampSparklineValue(currentValue, domainMin, domainMax) - domainMin) /
                (domainMax - domainMin || 1);
              return chartHeight - normalized * chartHeight;
            })()}
            r="2.6"
            className={fillClass}
          />
        ) : null}
      </svg>
    </div>
  );
}

export function InputInfluenceSection({ items }: { items: InputInfluenceItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <article
      className={`${tierOnePanel} ${sectionSpacing}`}
      aria-label="How inputs move this call"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className={tierOneHeading}>How inputs move this call</h2>
          <p className="mt-1 text-xs leading-5 text-slate-300">
            Each driver card shows pressure, direction, and distance to the next threshold so
            likely drift is visible without reading the full rationale.
          </p>
        </div>
        <p className="text-[11px] text-slate-400">
          Higher share = bigger influence on the weekly call.
        </p>
      </div>
      <ul className="mt-3 grid gap-3 lg:grid-cols-2">
        {items.map((item, index) => {
          const tone = inputInfluenceToneClasses[item.tone];
          const thresholdMarker = buildThresholdMarkerState(item.valueLabel, item.watchLabel);
          const forceLabel =
            item.influencePercent >= 32
              ? "High force"
              : item.influencePercent >= 18
                ? "Medium force"
                : "Low force";

          return (
            <li
              key={item.key}
              className="rounded-xl border border-slate-700/70 bg-slate-950/65 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-100">
                      {index + 1}. {item.label}
                    </p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${tone.badge}`}
                    >
                      {item.pressureLabel}
                    </span>
                    <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-300">
                      {forceLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-300">{item.effectDetail}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Current read
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">{item.valueLabel}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-slate-700/60 bg-slate-950/55 px-2.5 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    Direction
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-100">
                    {item.trendArrow} {item.trendLabel}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700/60 bg-slate-950/55 px-2.5 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    Call share
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-100">
                    {item.influencePercentLabel}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700/60 bg-slate-950/55 px-2.5 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    Watch line
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-100">{item.watchLabel}</p>
                </div>
                <InputInfluenceSparkline
                  values={item.sparkline}
                  tone={item.tone}
                  label={item.label}
                />
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  <span>Current vs trigger</span>
                  <span>{item.watchLabel}</span>
                </div>
                {thresholdMarker ? (
                  <div
                    className="relative mt-1.5 h-5 rounded-full border border-slate-800/70 bg-slate-950/60"
                    aria-hidden="true"
                  >
                    <span
                      className="absolute inset-y-0 w-px bg-slate-500/90"
                      style={{ left: `${thresholdMarker.thresholdPercent}%` }}
                    />
                    <span
                      className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-950/90 ${tone.fill}`}
                      style={{ left: `${thresholdMarker.currentPercent}%` }}
                    />
                  </div>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-400">{item.watchLabel}</p>
                )}
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800/90" aria-hidden="true">
                <div
                  className={`h-full origin-left rounded-full ${tone.fill}`}
                  style={{ transform: `scaleX(${Math.max(0.06, item.influencePercent / 100)})` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
