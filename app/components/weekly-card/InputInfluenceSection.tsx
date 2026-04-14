import type {
  InputInfluenceItem,
} from "../../../lib/report/homeBriefModel";
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

const clampPercent = (value: number) => Math.min(96, Math.max(4, value));

const normalizeToPercent = (value: number, min: number, max: number) =>
  clampPercent(((value - min) / (max - min || 1)) * 100);

const buildThresholdMeterState = (item: InputInfluenceItem) => {
  if (
    item.currentValue === null
    || item.watchValue === null
    || item.chartDomain === null
  ) {
    return null;
  }

  const { min, max } = item.chartDomain;
  const watchBuffer = item.watchBuffer ?? (max - min) * 0.1;
  const currentPercent = normalizeToPercent(item.currentValue, min, max);
  const thresholdPercent = normalizeToPercent(item.watchValue, min, max);

  const buildSegment = (startValue: number, endValue: number) => {
    const start = normalizeToPercent(startValue, min, max);
    const end = normalizeToPercent(endValue, min, max);
    return {
      left: `${Math.min(start, end)}%`,
      width: `${Math.max(end - start, 2)}%`,
    };
  };

  if (item.pressureDirection === "higher-is-worse") {
    return {
      currentPercent,
      thresholdPercent,
      leftLabel: "More room",
      rightLabel: "More pressure",
      safe: buildSegment(min, Math.min(item.watchValue - watchBuffer, max)),
      caution: buildSegment(
        Math.max(min, item.watchValue - watchBuffer),
        Math.min(item.watchValue, max),
      ),
      risk: buildSegment(item.watchValue, max),
    };
  }

  return {
    currentPercent,
    thresholdPercent,
    leftLabel: "More pressure",
    rightLabel: "More room",
    risk: buildSegment(min, item.watchValue),
    caution: buildSegment(
      Math.max(min, item.watchValue),
      Math.min(item.watchValue + watchBuffer, max),
    ),
    safe: buildSegment(Math.min(item.watchValue + watchBuffer, max), max),
  };
};

function InputInfluenceThresholdGap({
  item,
}: {
  item: InputInfluenceItem;
}) {
  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-950/55 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        Threshold gap
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-100">{item.watchDistanceLabel}</p>
      <p className="mt-1 text-[11px] text-slate-400">
        {item.currentValue === null || item.watchValue === null
          ? "Waiting on a fresh read."
          : `Current ${item.valueLabel} vs ${item.watchLabel}.`}
      </p>
    </div>
  );
}

function InputInfluenceThresholdMeter({
  item,
  toneFill,
}: {
  item: InputInfluenceItem;
  toneFill: string;
}) {
  const meterState = buildThresholdMeterState(item);
  if (!meterState) {
    return <p className="mt-1 text-[11px] text-slate-400">{item.watchLabel}</p>;
  }

  return (
    <>
      <div
        className="relative mt-1.5 h-7 overflow-hidden rounded-full border border-slate-800/70 bg-slate-950/60"
        aria-hidden="true"
      >
        <span
          className="absolute inset-y-0 bg-emerald-400/12"
          style={{ left: meterState.safe.left, width: meterState.safe.width }}
        />
        <span
          className="absolute inset-y-0 bg-amber-400/14"
          style={{ left: meterState.caution.left, width: meterState.caution.width }}
        />
        <span
          className="absolute inset-y-0 bg-rose-400/12"
          style={{ left: meterState.risk.left, width: meterState.risk.width }}
        />
        <span
          className="absolute inset-y-1 w-px bg-slate-300/90"
          style={{ left: `${meterState.thresholdPercent}%` }}
        />
        <span
          className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-950/90 shadow-[0_0_0_2px_rgba(15,23,42,0.6)] ${toneFill}`}
          style={{ left: `${meterState.currentPercent}%` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] uppercase tracking-[0.08em] text-slate-500">
        <span>{meterState.leftLabel}</span>
        <span>Watch line</span>
        <span>{meterState.rightLabel}</span>
      </div>
    </>
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
      <div className="rounded-xl border border-slate-700/70 bg-slate-950/55 px-3 py-2 text-[11px] text-slate-300">
        Threshold-anchored meters replace the old shared spark scale, so each driver shows its own
        watch line honestly instead of pretending unlike units are directly comparable.
      </div>
      <ul className="mt-3 grid gap-3 lg:grid-cols-2">
        {items.map((item, index) => {
          const tone = inputInfluenceToneClasses[item.tone];
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
                <InputInfluenceThresholdGap item={item} />
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  <span>Current vs watch line</span>
                  <span>{item.watchDistanceLabel}</span>
                </div>
                <InputInfluenceThresholdMeter item={item} toneFill={tone.fill} />
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
