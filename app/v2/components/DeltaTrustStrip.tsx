import { DIRECTION_LABEL, DIRECTION_COLOR, CONFIDENCE_COLOR, RELIABILITY_COLOR, type SignalDirection } from "../viewModel";

export function DeltaTrustStrip({
  tightnessDelta,
  riskAppetiteDelta,
  confidenceLabel,
  reliabilityScore,
  sourceCount,
  degradedCount,
  direction,
}: {
  tightnessDelta: number;
  riskAppetiteDelta: number;
  confidenceLabel: string;
  reliabilityScore: number;
  sourceCount: number;
  degradedCount: number;
  direction: SignalDirection;
}) {
  const deltaLabel = DIRECTION_LABEL[direction];
  const deltaColor = DIRECTION_COLOR[direction];
  const confColor = CONFIDENCE_COLOR(confidenceLabel);
  const relColor = RELIABILITY_COLOR(reliabilityScore);

  return (
    <div className="weather-card space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.2),0_8px_24px_rgba(0,0,0,0.12)]">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/40">Trend</span>
          <span className={`font-semibold ${deltaColor}`}>{deltaLabel}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/40">Signal confidence</span>
          <span className={`font-semibold ${confColor}`}>{confidenceLabel}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/40">Reliability</span>
          <span className={`font-semibold tabular-nums ${relColor}`}>{reliabilityScore}%</span>
        </div>
      </div>
      <div className="border-t border-slate-800/60 pt-2">
        <div className="flex items-center justify-between text-fluid-nano text-white/30">
          <span>Sources</span>
          <span>{sourceCount - degradedCount} live{degradedCount > 0 ? ` · ${degradedCount} cached` : ""}</span>
        </div>
      </div>
    </div>
  );
}
