"use client";

type ConfidenceGaugeProps = {
  percent: number;
  label?: "HIGH" | "MED" | "LOW";
  trend?: "up" | "down" | "stable";
  size?: "sm" | "md" | "lg";
};

const ZONES = [
  { max: 40, color: "bg-rose-500", label: "Low" },
  { max: 70, color: "bg-amber-500", label: "Medium" },
  { max: 100, color: "bg-emerald-500", label: "High" },
];

const TREND_ARROW: Record<string, string> = {
  up: "↑",
  down: "↓",
  stable: "→",
};

const TREND_COLOR: Record<string, string> = {
  up: "text-emerald-200",
  down: "text-rose-200",
  stable: "text-slate-400",
};

const SIZE_MAP = {
  sm: { bar: "h-1.5", text: "text-xs", number: "text-sm" },
  md: { bar: "h-2", text: "text-xs", number: "text-lg" },
  lg: { bar: "h-3", text: "text-sm", number: "text-2xl" },
};

export function ConfidenceGauge({ percent, label, trend, size = "md" }: ConfidenceGaugeProps) {
  const s = SIZE_MAP[size];
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const zone = ZONES.find((z) => clamped <= z.max) ?? ZONES[2];
  const showNumber = size !== "sm";

  return (
    <div className="inline-flex items-center gap-2.5">
      <div className="flex-1 min-w-[4rem]">
        <div className="flex items-baseline justify-between gap-2">
          <span className={`${s.text} font-semibold uppercase tracking-[0.08em] text-slate-400`}>Confidence</span>
          {trend ? (
            <span className={`${s.text} font-semibold ${TREND_COLOR[trend]}`}>
              {TREND_ARROW[trend]}
            </span>
          ) : null}
        </div>
        <div className={`mt-1 w-full rounded-full bg-slate-800 ${s.bar} overflow-hidden`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${zone.color}`}
            style={{ width: `${clamped}%` }}
          />
        </div>
      </div>
      {showNumber ? (
        <span className={`${s.number} font-bold tabular-nums text-slate-100 whitespace-nowrap`}>
          {clamped}%
        </span>
      ) : null}
    </div>
  );
}
