"use client";

import { RegimeCompass } from "../regimeCompass";
import { RegimeExplainer } from "./regimeExplainer";

const REGIME_LABELS: Record<string, string> = {
  SCARCITY: "tightening cycle",
  DEFENSIVE: "defensive posture",
  VOLATILE: "volatile conditions",
  EXPANSION: "expansionary conditions",
};

const STAGE_LABELS: Record<string, string> = {
  "pre-seed": "Pre-seed",
  seed: "Seed",
  "series-a": "Series A",
  "series-b-plus": "Series B+",
  public: "Public",
};

const SCORE_TOOLTIPS = {
  tightness: "Tightness measures how constrained cash and credit conditions are. Higher = tighter = harder to raise or spend.",
  risk: "Risk appetite measures market willingness to fund growth. Higher = easier to raise capital or take risk.",
};

export function PageDeltaSummary({
  regimeKey,
  tightness,
  riskAppetite,
  tightnessDelta,
  riskAppetiteDelta,
  actionShort,
  postureLabel,
  recordDate,
  companyStage,
  rateSensitivity,
  confidenceLabel,
  freshnessLabel,
  sourceLabel,
  tightnessThreshold = 70,
  riskAppetiteThreshold = 50,
}: {
  regimeKey?: string;
  tightness: number;
  riskAppetite: number;
  tightnessDelta: number;
  riskAppetiteDelta: number;
  actionShort?: string;
  postureLabel?: string;
  recordDate?: string;
  companyStage?: string | null;
  rateSensitivity?: string | null;
  confidenceLabel?: string;
  freshnessLabel?: string;
  sourceLabel?: string;
  tightnessThreshold?: number;
  riskAppetiteThreshold?: number;
}) {
  const regimeLabel = regimeKey ? REGIME_LABELS[regimeKey] ?? regimeKey.toLowerCase() : "unknown";

  return (
    <div className="mb-3 rounded-lg border border-slate-800/60 bg-slate-950/50 px-4 py-3 text-xs sm:px-5 sm:text-sm">
      <p className="text-fluid-micro font-semibold uppercase tracking-[0.14em] text-slate-400">
        This week
      </p>
      <div className="flex flex-wrap items-stretch gap-4">
        <div className="flex flex-col justify-center min-w-0">
          <p className="text-fluid-xs font-semibold text-slate-300">
            {regimeKey ? regimeLabel.charAt(0).toUpperCase() + regimeLabel.slice(1) : "Unknown"}
            <span className="text-slate-500 font-normal ml-2">· {actionShort ?? postureLabel}</span>
          </p>
          <div className="mt-2 flex gap-4 text-sm">
            <div className="group/tip relative">
              <span className="text-fluid-micro font-semibold uppercase tracking-[0.08em] text-slate-400">Tightness</span>
              <p className="font-semibold tabular-nums text-slate-100" title={SCORE_TOOLTIPS.tightness}>
                {tightness}
                {tightnessDelta !== 0 ? (
                  <span className={tightnessDelta > 0 ? "text-amber-200 ml-1" : "text-emerald-200 ml-1"}>
                    {tightnessDelta > 0 ? "↑" : "↓"}{Math.abs(tightnessDelta)}
                  </span>
                ) : null}
              </p>
            </div>
            <div className="group/tip relative">
              <span className="text-fluid-micro font-semibold uppercase tracking-[0.08em] text-slate-400">Risk</span>
              <p className="font-semibold tabular-nums text-slate-100" title={SCORE_TOOLTIPS.risk}>
                {riskAppetite}
                {riskAppetiteDelta !== 0 ? (
                  <span className={riskAppetiteDelta > 0 ? "text-emerald-200 ml-1" : "text-amber-200 ml-1"}>
                    {riskAppetiteDelta > 0 ? "↑" : "↓"}{Math.abs(riskAppetiteDelta)}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
          {confidenceLabel || freshnessLabel ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-fluid-micro text-slate-500">
              {confidenceLabel ? (
                <span className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-[0.08em] ${
                  confidenceLabel === "HIGH" ? "text-emerald-200 bg-emerald-500/10" :
                  confidenceLabel === "MED" ? "text-amber-200 bg-amber-500/10" :
                  "text-rose-200 bg-rose-500/10"
                }`}>
                  {confidenceLabel}
                </span>
              ) : null}
              {freshnessLabel ? <span>Data {freshnessLabel}</span> : null}
              {sourceLabel ? <span className="text-slate-600">· {sourceLabel}</span> : null}
            </div>
          ) : null}
          {companyStage ? (
            <span className="mt-2 self-start rounded-full bg-slate-800/50 px-2 py-0.5 text-fluid-micro font-medium text-slate-400">
              {STAGE_LABELS[companyStage] ?? companyStage}{rateSensitivity ? ` · ${rateSensitivity}` : ""}
            </span>
          ) : null}
        </div>
        <div className="flex flex-col">
          <RegimeCompass
            tightness={tightness}
            riskAppetite={riskAppetite}
            prevTightness={tightness - tightnessDelta}
            prevRiskAppetite={riskAppetite - riskAppetiteDelta}
            regimeKey={regimeKey}
          />
          <RegimeExplainer
            regimeKey={regimeKey}
            tightness={tightness}
            riskAppetite={riskAppetite}
            tightnessThreshold={tightnessThreshold ?? 70}
            riskAppetiteThreshold={riskAppetiteThreshold ?? 50}
          />
        </div>
      </div>
    </div>
  );
}
