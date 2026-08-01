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
          <span className="text-fluid-xs text-white/60">Direction</span>
          <span className={`text-fluid-xs font-semibold ${deltaColor}`}>{deltaLabel}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/60">Confidence</span>
          <span className={`font-semibold ${confColor}`}>{confidenceLabel}
            <span className="ml-2 inline-block h-[3px] w-10 rounded-full bg-white/10 align-middle">
              <span className={`block h-full rounded-full ${confColor.replace('text-', 'bg-')}`} style={{ width: confidenceLabel === 'HIGH' ? '100%' : confidenceLabel === 'MED' ? '66%' : '33%' }} />
            </span>
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/60">Reliability</span>
          <span className={`font-semibold tabular-nums ${relColor}`}>{reliabilityScore}%
            <span className="ml-2 inline-block h-[3px] w-10 rounded-full bg-white/10 align-middle">
              <span className={`block h-full rounded-full ${relColor.replace('text-', 'bg-')}`} style={{ width: `${reliabilityScore}%` }} />
            </span>
          </span>
        </div>
      </div>
      <div className="border-t border-white/[0.06] pt-2 space-y-1">
        <div className="flex items-center justify-between text-fluid-nano text-white/40">
          <span>Sources</span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-1"><span className="size-1.5 rounded-full bg-emerald-400" />{sourceHealthSummary.liveCount}</span>
            <span className="inline-flex items-center gap-1"><span className="size-1.5 rounded-full bg-amber-400" />{sourceHealthSummary.cachedCount}</span>
            {sourceHealthSummary.missingCount > 0 && <span className="inline-flex items-center gap-1"><span className="size-1.5 rounded-full bg-rose-400" />{sourceHealthSummary.missingCount}</span>}
          </span>
        </div>
      </div>
    </div>
  );
}
