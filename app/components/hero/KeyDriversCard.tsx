import { BarChart2, Shield, Percent } from "lucide-react";
import type { ThresholdBusinessConsequence } from "../../../lib/report/operatingCalls";

export interface KeyDriversCardProps {
  tightness: number;
  tightnessThreshold?: number;
  tightnessDelta?: number;
  riskAppetite?: number;
  riskAppetiteThreshold?: number;
  riskAppetiteDelta?: number;
  baseRate?: number | null;
  baseRateDelta?: number | null;
  thresholdBusinessConsequence?: ThresholdBusinessConsequence | null;
  className?: string;
}

export function KeyDriversCard({
  tightness,
  tightnessThreshold = 70,
  tightnessDelta = 0,
  riskAppetite = 56,
  riskAppetiteThreshold = 44,
  riskAppetiteDelta = 0,
  baseRate = 3.9,
  baseRateDelta = 0.1,
  thresholdBusinessConsequence,
  className = "",
}: KeyDriversCardProps) {
  const isTightnessAboveThreshold = tightness >= tightnessThreshold;
  const cushionPoints = typeof riskAppetite === "number" && riskAppetiteThreshold
    ? Math.max(0, Math.round(riskAppetite - riskAppetiteThreshold))
    : 12;

  const fedRateVal = typeof baseRate === "number" ? baseRate : 3.9;
  const fedRateDeltaVal = typeof baseRateDelta === "number" ? baseRateDelta : 0.1;

  return (
    <section
      aria-labelledby="why-this-call-heading"
      className={`weather-brief-card flex flex-col justify-between p-5 sm:p-6 ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 id="why-this-call-heading" className="text-sm font-semibold tracking-tight text-white">
            Why this call
          </h3>
          <span className="text-xs font-medium text-slate-400">
            Key drivers and thresholds
          </span>
        </div>

        <div className="space-y-4">
          {/* Driver 1: Funding Pressure */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/90 text-teal-400">
                  <BarChart2 size={15} />
                </div>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-xs font-medium text-slate-200">Funding pressure</span>
                  <span className="text-xs tabular-nums text-slate-400">
                    <strong className="font-semibold text-white">{tightness}</strong> / 100
                  </span>
                  {tightnessDelta !== 0 && (
                    <span className={`text-[11px] font-semibold tabular-nums ${tightnessDelta > 0 ? "text-rose-300" : "text-teal-300"}`}>
                      {tightnessDelta > 0 ? `↑ +${tightnessDelta.toFixed(0)}` : `↓ ${tightnessDelta.toFixed(0)}`}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-medium text-rose-300/90">
                  {isTightnessAboveThreshold ? "↓ tighter" : "↑ normal"}
                </span>
                <span
                  className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-medium border ${
                    isTightnessAboveThreshold
                      ? "border-rose-500/30 bg-rose-500/15 text-rose-300"
                      : "border-teal-500/30 bg-teal-500/15 text-teal-300"
                  }`}
                >
                  {isTightnessAboveThreshold ? "Above threshold" : "Within limits"}
                </span>
              </div>
            </div>

            {/* Progress Rail with Threshold Marker */}
            <div className="relative h-2 w-full rounded-full bg-slate-800/80 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isTightnessAboveThreshold ? "bg-rose-400/90" : "bg-teal-400/90"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, tightness))}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 border-r border-dotted border-white/80"
                style={{ left: `${tightnessThreshold}%` }}
                title={`Threshold: ${tightnessThreshold}`}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Threshold: {tightnessThreshold}</span>
              <span>
                {isTightnessAboveThreshold
                  ? (thresholdBusinessConsequence?.consequenceLabel
                      ? `${thresholdBusinessConsequence.consequenceLabel}.`
                      : "Restricts hiring latitude.")
                  : "Normal hiring latitude."}
              </span>
            </div>
          </div>

          {/* Driver 2: Risk Appetite */}
          <div className="space-y-2 border-t border-white/[0.04] pt-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/90 text-teal-400">
                  <Shield size={15} />
                </div>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-xs font-medium text-slate-200">Risk appetite</span>
                  <span className="text-xs tabular-nums text-slate-400">
                    <strong className="font-semibold text-white">{riskAppetite}</strong> / 100
                  </span>
                  {riskAppetiteDelta !== 0 && (
                    <span className={`text-[11px] font-semibold tabular-nums ${riskAppetiteDelta > 0 ? "text-teal-300" : "text-amber-300"}`}>
                      {riskAppetiteDelta > 0 ? `↑ +${riskAppetiteDelta.toFixed(0)}` : `↓ ${riskAppetiteDelta.toFixed(0)}`}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-medium text-teal-300/90">
                  {riskAppetite >= riskAppetiteThreshold ? "↑ supports" : "↓ pressure"}
                </span>
                <span
                  className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-medium border ${
                    riskAppetite < riskAppetiteThreshold
                      ? "border-amber-500/30 bg-amber-500/15 text-amber-300"
                      : "border-teal-500/30 bg-teal-500/15 text-teal-300"
                  }`}
                >
                  {riskAppetite < riskAppetiteThreshold
                    ? `${Math.abs(Math.round(riskAppetiteThreshold - riskAppetite))} pts below line`
                    : `${cushionPoints} pts of cushion`}
                </span>
              </div>
            </div>

            {/* Progress Rail with Cushion Marker */}
            <div className="relative h-2 w-full rounded-full bg-slate-800/80 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  riskAppetite < riskAppetiteThreshold ? "bg-amber-400/90" : "bg-teal-400/90"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, riskAppetite))}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 border-r border-dotted border-white/80"
                style={{ left: `${riskAppetiteThreshold}%` }}
                title={`Watch line: ${riskAppetiteThreshold}`}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Threshold: {riskAppetiteThreshold}</span>
              <span>{riskAppetite < riskAppetiteThreshold ? "Compressed risk appetite." : "Moderate risk appetite."}</span>
            </div>
          </div>

          {/* Driver 3: Fed rate */}
          <div className="space-y-2 border-t border-white/[0.04] pt-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/90 text-teal-400">
                  <Percent size={15} />
                </div>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-xs font-medium text-slate-200">Fed rate</span>
                  <span className="text-xs tabular-nums text-slate-400">
                    <strong className="font-semibold text-white">{fedRateVal.toFixed(1)}</strong> %
                  </span>
                  {fedRateDeltaVal !== 0 && (
                    <span className={`text-[11px] font-semibold tabular-nums ${fedRateDeltaVal > 0 ? "text-rose-300" : "text-teal-300"}`}>
                      {fedRateDeltaVal > 0 ? `↑ +${fedRateDeltaVal.toFixed(1)}` : `↓ ${Math.abs(fedRateDeltaVal).toFixed(1)}`}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-medium text-amber-300/90">
                  ↓ modest
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums ${
                    fedRateDeltaVal > 0
                      ? "text-rose-300"
                      : fedRateDeltaVal < 0
                      ? "text-teal-300"
                      : "text-slate-300"
                  }`}
                >
                  {fedRateDeltaVal > 0
                    ? `↑ +${fedRateDeltaVal.toFixed(1)}`
                    : fedRateDeltaVal < 0
                    ? `↓ ${Math.abs(fedRateDeltaVal).toFixed(1)}`
                    : "Steady"}
                </span>
              </div>
            </div>

            {/* Progress Rail */}
            <div className="relative h-2 w-full rounded-full bg-slate-800/80 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-400/90 transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, (fedRateVal / 8) * 100))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Higher financing cost</span>
              <span>
                {fedRateDeltaVal > 0
                  ? "Financing slightly tighter."
                  : fedRateDeltaVal < 0
                  ? "Financing slightly easing."
                  : "Financing rate steady."}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
