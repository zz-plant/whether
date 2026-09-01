import type { ThresholdBusinessConsequence } from "../../lib/report/operatingCalls";

type Props = {
  consequence: ThresholdBusinessConsequence;
  className?: string;
};

export function ThresholdProximityBar({ consequence, className = "" }: Props) {
  const { pointsToThreshold, consequenceLabel, status } = consequence;
  const isCrossed = status === "crossed" || pointsToThreshold <= 0;

  // Max buffer reference: 30 points
  const bufferPercent = Math.max(0, Math.min(100, (pointsToThreshold / 30) * 100));

  const tone = isCrossed || pointsToThreshold <= 10
    ? {
        text: "text-rose-300",
        bar: "bg-rose-400",
        bg: "bg-rose-950/40 border-rose-800/40",
      }
    : pointsToThreshold <= 20
      ? {
          text: "text-amber-300",
          bar: "bg-amber-400",
          bg: "bg-amber-950/40 border-amber-800/40",
        }
      : {
          text: "text-emerald-300",
          bar: "bg-emerald-400",
          bg: "bg-emerald-950/30 border-emerald-800/30",
        };

  return (
    <div className={`rounded-lg border px-3 py-2 ${tone.bg} ${className}`}>
      <div className="flex items-center justify-between gap-2 text-fluid-nano">
        <span className="font-medium text-slate-300">
          Tightening buffer to {consequenceLabel}:
        </span>
        <span className={`font-semibold tabular-nums ${tone.text}`}>
          {isCrossed
            ? `${pointsToThreshold} pts (Threshold crossed)`
            : `${pointsToThreshold} pts buffer remaining`}
        </span>
      </div>
      {/* scaleX rather than an animated width: §I bans animating layout
          properties, and transition-all on an inline width did exactly that. */}
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-900/80">
        <div
          className={`h-full w-full origin-left rounded-full transition-transform duration-500 ${tone.bar}`}
          style={{ transform: `scaleX(${isCrossed ? 1 : bufferPercent / 100})` }}
        />
      </div>
    </div>
  );
}
