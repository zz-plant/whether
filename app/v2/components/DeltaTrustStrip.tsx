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
  direction: "tighten" | "ease" | "hold";
}) {
  const deltaLabel = direction === "tighten" ? "Tightening" : direction === "ease" ? "Easing" : "Holding";
  const deltaColor = direction === "tighten" ? "text-rose-300" : direction === "ease" ? "text-emerald-300" : "text-slate-400";
  const confColor = confidenceLabel === "HIGH" ? "text-emerald-300" : confidenceLabel === "MED" ? "text-amber-300" : "text-rose-300";
  const relColor = reliabilityScore >= 80 ? "text-emerald-300" : reliabilityScore >= 60 ? "text-amber-300" : "text-rose-300";

  return (
    <div className="weather-card space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Trend</span>
          <span className={`font-semibold ${deltaColor}`}>{deltaLabel}</span>
        </div>
      <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Call certainty</span>
          <span className={`font-semibold ${confColor}`}>{confidenceLabel}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Reliability</span>
          <span className={`font-semibold tabular-nums ${relColor}`}>{reliabilityScore}%</span>
        </div>
      </div>
      <div className="border-t border-slate-800/60 pt-2">
        <div className="flex items-center justify-between text-[0.6rem] text-slate-600">
          <span>Sources</span>
          <span>{sourceCount - degradedCount} live{degradedCount > 0 ? ` · ${degradedCount} cached` : ""}</span>
        </div>
      </div>
    </div>
  );
}
