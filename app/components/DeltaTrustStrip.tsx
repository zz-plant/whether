import type { SourceHealthCoverageSummary } from "../../lib/report/sourceHealth";
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
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-fluid-xs text-white/40">Trend</span>
          <span className={`text-fluid-xs font-semibold ${deltaColor}`}>{deltaLabel}</span>
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
      <div className="border-t border-slate-800/60 pt-2 space-y-1">
        <div className="flex items-center justify-between text-fluid-nano text-white/25">
          <span>Sources</span>
          <span>
            {sourceHealthSummary.liveCount} live · {sourceHealthSummary.cachedCount} cached · {sourceHealthSummary.missingCount} missing
          </span>
        </div>
        <div className="flex items-center justify-between text-fluid-nano text-white/25">
          <span>Inputs complete:</span>
          <span className={sourceHealthSummary.inputsComplete ? "text-emerald-300/70" : "text-amber-300/70"}>
            {sourceHealthSummary.inputsComplete ? "Yes" : "No"}
          </span>
        </div>
      </div>
    </div>
  );
}
