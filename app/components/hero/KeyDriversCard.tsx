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
  tightnessDelta: _tightnessDelta = 0,
  riskAppetite = 56,
  riskAppetiteThreshold = 44,
  riskAppetiteDelta: _riskAppetiteDelta = 0,
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
      className={`weather-brief-card ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 id="why-this-call-heading" className="text-sm font-semibold tracking-tight text-white">
          Why this call
        </h3>
        <span className="text-xs font-medium text-slate-400">
          3 key drivers
        </span>
      </div>

      <div className="space-y-4">
        {/* Driver 1: Funding Pressure */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-[190px]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/90 text-teal-400">
              <BarChart2 size={16} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-200">Funding pressure</p>
              <p className="text-xs tabular-nums text-slate-400">
                <span className="font-semibold text-white">{tightness}</span> / 100
              </p>
            </div>
          </div>

          {/* Progress Bar with Threshold Marker */}
          <div className="relative h-2 w-full max-w-[180px] rounded-full bg-slate-800/80 overflow-hidden sm:mx-2">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isTightnessAboveThreshold ? "bg-rose-400/90" : "bg-teal-400/90"
              }`}
              style={{ width: `${Math.min(100, Math.max(0, tightness))}%` }}
            />
            {/* Dotted watchline at threshold */}
            <div
              className="absolute top-0 bottom-0 w-0.5 border-r border-dotted border-white/80"
              style={{ left: `${tightnessThreshold}%` }}
              title={`Threshold: ${tightnessThreshold}`}
            />
          </div>

          {/* Consequence / Status */}
          <div className="flex flex-col items-start sm:items-end min-w-[160px]">
            <span
              className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-medium border ${
                isTightnessAboveThreshold
                  ? "border-rose-500/30 bg-rose-500/15 text-rose-300"
                  : "border-teal-500/30 bg-teal-500/15 text-teal-300"
              }`}
            >
              {isTightnessAboveThreshold ? "Above threshold" : "Within limits"}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              {isTightnessAboveThreshold
                ? (thresholdBusinessConsequence?.consequenceLabel
                    ? `${thresholdBusinessConsequence.consequenceLabel}.`
                    : "Restricts hiring latitude.")
                : "Normal hiring latitude."}
            </span>
          </div>
        </div>

        {/* Driver 2: Risk Appetite */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-white/[0.04] pt-3">
          <div className="flex items-center gap-3 min-w-[190px]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/90 text-teal-400">
              <Shield size={16} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-200">Risk appetite</p>
              <p className="text-xs tabular-nums text-slate-400">
                <span className="font-semibold text-white">{riskAppetite}</span> / 100
              </p>
            </div>
          </div>

          {/* Progress Bar with Cushion Marker */}
          <div className="relative h-2 w-full max-w-[180px] rounded-full bg-slate-800/80 overflow-hidden sm:mx-2">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                riskAppetite < riskAppetiteThreshold ? "bg-amber-400/90" : "bg-teal-400/90"
              }`}
              style={{ width: `${Math.min(100, Math.max(0, riskAppetite))}%` }}
            />
            {/* Dotted watchline at threshold */}
            <div
              className="absolute top-0 bottom-0 w-0.5 border-r border-dotted border-white/80"
              style={{ left: `${riskAppetiteThreshold}%` }}
              title={`Watch line: ${riskAppetiteThreshold}`}
            />
          </div>

          {/* Consequence / Status */}
          <div className="flex flex-col items-start sm:items-end min-w-[160px]">
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
            <span className="text-[11px] text-slate-400 mt-0.5">
              {riskAppetite < riskAppetiteThreshold ? "Compressed risk appetite." : "Moderate risk appetite."}
            </span>
          </div>
        </div>

        {/* Driver 3: Fed rate */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-white/[0.04] pt-3">
          <div className="flex items-center gap-3 min-w-[190px]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/90 text-teal-400">
              <Percent size={16} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-200">Fed rate</p>
              <p className="text-xs tabular-nums text-slate-400">
                <span className="font-semibold text-white">{fedRateVal.toFixed(1)}</span> %
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative h-2 w-full max-w-[180px] rounded-full bg-slate-800/80 overflow-hidden sm:mx-2">
            <div
              className="h-full rounded-full bg-amber-400/90 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, (fedRateVal / 8) * 100))}%` }}
            />
          </div>

          {/* Consequence / Status */}
          <div className="flex flex-col items-start sm:items-end min-w-[160px]">
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
                : "Unchanged"}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              {fedRateDeltaVal > 0
                ? "Financing slightly tighter."
                : fedRateDeltaVal < 0
                ? "Financing slightly easing."
                : "Financing rate steady."}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
