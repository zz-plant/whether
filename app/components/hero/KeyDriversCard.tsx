import Link from "next/link";
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

function MiniSparkline({ points, strokeColor }: { points: number[]; strokeColor: string }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const width = 42;
  const height = 16;
  const path = points
    .map((val, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0 opacity-80" aria-hidden="true">
      <path d={path} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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
  const fedRateVal = typeof baseRate === "number" ? baseRate : 3.9;
  const fedRateDeltaVal = typeof baseRateDelta === "number" ? baseRateDelta : 0.1;

  // Synthesize realistic 5-point sparkline points based on current and delta
  const tightnessTrend = [
    tightness - tightnessDelta * 1.5,
    tightness - tightnessDelta * 1.1,
    tightness - tightnessDelta * 0.7,
    tightness - tightnessDelta * 0.3,
    tightness,
  ];

  const riskTrend = [
    riskAppetite - riskAppetiteDelta * 1.5,
    riskAppetite - riskAppetiteDelta * 1.1,
    riskAppetite - riskAppetiteDelta * 0.7,
    riskAppetite - riskAppetiteDelta * 0.3,
    riskAppetite,
  ];

  const rateTrend = [
    fedRateVal - fedRateDeltaVal * 1.5,
    fedRateVal - fedRateDeltaVal * 1.1,
    fedRateVal - fedRateDeltaVal * 0.7,
    fedRateVal - fedRateDeltaVal * 0.3,
    fedRateVal,
  ];

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
              <Link
                href="/signals#tightness"
                className="flex items-center gap-2.5 group no-underline min-w-0"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/90 text-teal-400 group-hover:border-teal-500/40 transition-colors">
                  <BarChart2 size={15} />
                </div>
                <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
                  <span className="text-xs font-medium text-slate-200 group-hover:text-white transition-colors truncate">
                    Funding pressure
                  </span>
                  <span className="text-xs tabular-nums text-slate-400">
                    <strong className="font-semibold text-white">{tightness}</strong> / 100
                  </span>
                  {tightnessDelta !== 0 && (
                    <span className={`text-[11px] font-semibold tabular-nums ${tightnessDelta > 0 ? "text-rose-300" : "text-teal-300"}`}>
                      {tightnessDelta > 0 ? `↑ +${tightnessDelta.toFixed(0)}` : `↓ ${tightnessDelta.toFixed(0)}`}
                    </span>
                  )}
                </div>
              </Link>
              <div className="flex items-center gap-2 shrink-0">
                <MiniSparkline
                  points={tightnessTrend}
                  strokeColor={tightnessDelta > 0 ? "#fda4af" : "#5eead4"}
                />
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
              <Link
                href="/signals#risk-appetite"
                className="flex items-center gap-2.5 group no-underline min-w-0"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/90 text-teal-400 group-hover:border-teal-500/40 transition-colors">
                  <Shield size={15} />
                </div>
                <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
                  <span className="text-xs font-medium text-slate-200 group-hover:text-white transition-colors truncate">
                    Risk appetite
                  </span>
                  <span className="text-xs tabular-nums text-slate-400">
                    <strong className="font-semibold text-white">{riskAppetite}</strong> / 100
                  </span>
                  {riskAppetiteDelta !== 0 && (
                    <span className={`text-[11px] font-semibold tabular-nums ${riskAppetiteDelta > 0 ? "text-teal-300" : "text-amber-300"}`}>
                      {riskAppetiteDelta > 0 ? `↑ +${riskAppetiteDelta.toFixed(0)}` : `↓ ${riskAppetiteDelta.toFixed(0)}`}
                    </span>
                  )}
                </div>
              </Link>
              <div className="flex items-center gap-2 shrink-0">
                <MiniSparkline
                  points={riskTrend}
                  strokeColor={riskAppetiteDelta > 0 ? "#5eead4" : "#fcd34d"}
                />
                <span
                  className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-medium border ${
                    riskAppetite < riskAppetiteThreshold
                      ? "border-amber-500/30 bg-amber-500/15 text-amber-300"
                      : "border-teal-500/30 bg-teal-500/15 text-teal-300"
                  }`}
                >
                  {riskAppetite >= riskAppetiteThreshold ? "Supportive" : "Subdued"}
                </span>
              </div>
            </div>

            {/* Progress Rail with Threshold Marker */}
            <div className="relative h-2 w-full rounded-full bg-slate-800/80 overflow-hidden">
              <div
                className="h-full rounded-full bg-teal-400/90 transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, riskAppetite))}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 border-r border-dotted border-white/80"
                style={{ left: `${riskAppetiteThreshold}%` }}
                title={`Threshold: ${riskAppetiteThreshold}`}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Threshold: {riskAppetiteThreshold}</span>
              <span>
                {riskAppetite >= riskAppetiteThreshold
                  ? `${Math.max(0, Math.round(riskAppetite - riskAppetiteThreshold))} pts above warning.`
                  : "Below warning line."}
              </span>
            </div>
          </div>

          {/* Driver 3: Base Rate */}
          <div className="flex items-center justify-between gap-2 border-t border-white/[0.04] pt-3">
            <Link
              href="/signals#base-rate"
              className="flex items-center gap-2.5 group no-underline min-w-0"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/90 text-teal-400 group-hover:border-teal-500/40 transition-colors">
                <Percent size={15} />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-xs font-medium text-slate-200 group-hover:text-white transition-colors truncate">
                    Base rate (Fed Funds)
                  </span>
                  <span className="text-xs tabular-nums text-slate-400">
                    <strong className="font-semibold text-white">{fedRateVal.toFixed(2)}%</strong>
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Capital cost baseline</p>
              </div>
            </Link>
            <div className="flex items-center gap-2 shrink-0">
              <MiniSparkline points={rateTrend} strokeColor="#94a3b8" />
              <span className="text-xs font-mono font-medium text-slate-300">
                {fedRateDeltaVal !== 0
                  ? `${fedRateDeltaVal > 0 ? "+" : ""}${fedRateDeltaVal.toFixed(2)}%`
                  : "0.00%"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
