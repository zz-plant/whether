"use client";

type ScoreGaugeProps = {
  /** 0–100 score */
  value: number;
  label: string;
  /** Higher values tighten → bad, higher values ease → good */
  direction: "tightening" | "easing";
  /** Optional delta change arrow */
  delta?: number;
};

function scoreColor(value: number, direction: "tightening" | "easing") {
  const highTight = direction === "tightening" ? value : 100 - value;
  if (highTight >= 75) return "var(--color-semantic-tightening-fg)";
  if (highTight >= 55) return "var(--color-semantic-caution-fg)";
  return "var(--color-semantic-easing-fg)";
}

function scoreFill(value: number) {
  if (value >= 80) return "82%";
  if (value >= 60) return "65%";
  if (value >= 40) return "48%";
  if (value >= 20) return "30%";
  return "15%";
}

export function ScoreGauge({ value, label, direction, delta }: ScoreGaugeProps) {
  const color = scoreColor(value, direction);
  const fillWidth = scoreFill(value);

  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-fluid-xs font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</span>
        <span className="font-semibold tabular-nums" style={{ color }}>
          {value}
          {delta !== undefined && delta !== 0 ? (
            <span className={delta > 0 ? "text-amber-200 ml-1" : "text-emerald-200 ml-1"}>
              {delta > 0 ? "↑" : "↓"}{Math.abs(delta)}
            </span>
          ) : null}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-800/60 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: fillWidth,
            background: `linear-gradient(90deg, ${color}55, ${color})`,
          }}
        />
      </div>
    </div>
  );
}
