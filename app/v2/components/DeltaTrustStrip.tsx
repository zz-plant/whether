import type { SourceHealthCoverageSummary } from "../../../lib/report/sourceHealth";
import { DIRECTION_LABEL, DIRECTION_COLOR, CONFIDENCE_COLOR, RELIABILITY_COLOR, type SignalDirection } from "../viewModel";

export function DeltaTrustStrip({
  tightnessDelta,
  riskAppetiteDelta,
  confidenceLabel,
  reliabilityScore,
  sourceHealthSummary,
  direction,
}: {
  tightnessDelta: number;
  riskAppetiteDelta: number;
  confidenceLabel: string;
  reliabilityScore: number;
  sourceHealthSummary: SourceHealthCoverageSummary;
  direction: SignalDirection;
}) {
  const deltaLabel = DIRECTION_LABEL[direction];
  const deltaColor = DIRECTION_COLOR[direction];
  const confColor = CONFIDENCE_COLOR(confidenceLabel);
  const relColor = RELIABILITY_COLOR(reliabilityScore);

  return (
    <div className="weather-card space-y-3">
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
          <span>
            {sourceHealthSummary.liveCount} live · {sourceHealthSummary.cachedCount} cached · {sourceHealthSummary.missingCount} missing
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-fluid-nano text-white/30">
          <span>Inputs complete:</span>
          <span className={sourceHealthSummary.inputsComplete ? "text-emerald-300/80" : "text-amber-300/80"}>
            {sourceHealthSummary.inputsComplete ? "Yes" : "No"}
          </span>
        </div>
      </div>
    </div>
  );
}
