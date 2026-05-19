"use client";

import { useEffect, useState } from "react";
import { RegimeCompass } from "../regimeCompass";
import { RegimeExplainer } from "./regimeExplainer";
import { RegimeContextBlock } from "./regimeContextBlock";
import { useLocalStorageState } from "../../../lib/hooks/useLocalStorageState";

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
  tightness: "Credit conditions measure how constrained cash and credit are. Higher = tighter = harder to raise or spend. Scale: 0 (easiest) to 100 (tightest).",
  risk: "Investor sentiment measures market willingness to fund growth. Higher = easier to raise capital. Scale: 0 (most cautious) to 100 (most optimistic).",
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
  directionLabel,
  regimeDistance,
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
  directionLabel?: string;
  regimeDistance?: { dimensionLabel: string; pointsToFlip: number; currentValue: number; thresholdValue: number };
}) {
  const regimeLabel = regimeKey ? REGIME_LABELS[regimeKey] ?? regimeKey.toLowerCase() : "unknown";
  const hasDelta = tightnessDelta !== 0 || riskAppetiteDelta !== 0;
  const directionWord = directionLabel ?? (tightnessDelta > 0 ? "tightening" : riskAppetiteDelta > 0 ? "easing" : "stable");
  const [showFull, setShowFull] = useState(false);
  const [visitCount] = useLocalStorageState<number>("whether_visit_count", 0);

  useEffect(() => {
    if (visitCount >= 2) setShowFull(true);
  }, [visitCount]);

  return (
    <div className="weather-card text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-fluid-micro font-semibold uppercase tracking-[0.14em] text-slate-400">
          This week
        </p>
        {hasDelta ? (
          <span className={`text-fluid-micro font-semibold uppercase tracking-[0.1em] ${
            directionWord === "tightening" ? "text-amber-200" :
            directionWord === "easing" ? "text-emerald-200" :
            "text-slate-400"
          }`}>
            {directionWord === "tightening" ? `Closer to ${regimeKey === "DEFENSIVE" ? "SCARCITY" : "tightening"}↑` :
             directionWord === "easing" ? `Easing toward ${regimeKey === "SCARCITY" ? "DEFENSIVE" : "expansion"}↓` :
             "Stable"}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-stretch gap-4">
        <div className="flex flex-col justify-center min-w-0">
          <p className="text-fluid-xs font-semibold text-slate-300">
            {regimeKey ? regimeLabel.charAt(0).toUpperCase() + regimeLabel.slice(1) : "Unknown"}
            <span className="text-slate-500 font-normal ml-2">· {actionShort ?? postureLabel}</span>
          </p>
          <div className="mt-2 flex gap-4 text-sm">
            <div className="group/tip relative">
              <span className="text-fluid-micro font-semibold uppercase tracking-[0.08em] text-slate-400">
                Credit conditions
                <span className="text-slate-600 font-normal lowercase ml-1 tracking-normal">(higher = tighter)</span>
              </span>
              <p className="font-semibold tabular-nums text-slate-100" title={SCORE_TOOLTIPS.tightness}>
                {tightness}
                {tightnessDelta !== 0 ? (
                  <span className={tightnessDelta > 0 ? "text-amber-200 ml-1" : "text-emerald-200 ml-1"}>
                    {tightnessDelta > 0 ? "↑" : "↓"}{Math.abs(tightnessDelta)}
                  </span>
                ) : (
                  <span className="text-slate-600 ml-1 text-fluid-micro font-normal">—</span>
                )}
              </p>
              <p className="text-fluid-micro text-slate-600">
                {tightnessDelta !== 0
                  ? `vs last week: ${tightnessDelta > 0 ? "+" : ""}${tightnessDelta}`
                  : "unchanged from last week"}
              </p>
            </div>
            <div className="group/tip relative">
              <span className="text-fluid-micro font-semibold uppercase tracking-[0.08em] text-slate-400">
                Investor sentiment
                <span className="text-slate-600 font-normal lowercase ml-1 tracking-normal">(higher = easier to raise)</span>
              </span>
              <p className="font-semibold tabular-nums text-slate-100" title={SCORE_TOOLTIPS.risk}>
                {riskAppetite}
                {riskAppetiteDelta !== 0 ? (
                  <span className={riskAppetiteDelta > 0 ? "text-emerald-200 ml-1" : "text-amber-200 ml-1"}>
                    {riskAppetiteDelta > 0 ? "↑" : "↓"}{Math.abs(riskAppetiteDelta)}
                  </span>
                ) : (
                  <span className="text-slate-600 ml-1 text-fluid-micro font-normal">—</span>
                )}
              </p>
              <p className="text-fluid-micro text-slate-600">
                {riskAppetiteDelta !== 0
                  ? `vs last week: ${riskAppetiteDelta > 0 ? "+" : ""}${riskAppetiteDelta}`
                  : "unchanged from last week"}
              </p>
            </div>
          </div>
          {confidenceLabel || freshnessLabel ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-fluid-micro text-slate-500">
              {confidenceLabel ? (
                <button
                  type="button"
                  onClick={() => setShowFull(true)}
                  className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-[0.08em] transition-colors hover:ring-1 hover:ring-white/20 ${
                  confidenceLabel === "HIGH" ? "text-emerald-200 bg-emerald-500/10" :
                  confidenceLabel === "MED" ? "text-amber-200 bg-amber-500/10" :
                  "text-rose-200 bg-rose-500/10"
                }`}
                  title="Tap to see when we're wrong"
                >
                  {confidenceLabel}
                </button>
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
        {!showFull ? (
          <div className="flex flex-col justify-center">
            <p className="text-fluid-micro text-slate-500 italic leading-relaxed">
              Guidance based on aggregate macro signals. Use your judgment — conditions vary by company, industry, and stage.
            </p>
            <button
              onClick={() => setShowFull(true)}
              className="mt-2 self-start inline-flex items-center gap-1 rounded-full border border-slate-700/60 px-3 py-1 text-fluid-micro font-medium text-slate-400 hover:border-sky-500/30 hover:text-sky-200 transition-colors"
            >
              Show compass &amp; analysis →
            </button>
          </div>
        ) : (
        <div className="flex flex-col">
          <p className="text-fluid-micro text-slate-500 italic leading-relaxed">
          Guidance based on aggregate macro signals. Use your judgment — conditions vary by company, industry, and stage.
        </p>
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
          <RegimeContextBlock
            regimeKey={regimeKey}
            tightness={tightness}
            riskAppetite={riskAppetite}
            tightnessDelta={tightnessDelta}
            riskAppetiteDelta={riskAppetiteDelta}
          />
          {regimeKey ? (
            <div className="mt-3 pt-3 border-t border-slate-700/50">
              <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-500">What this means for fundraising</p>
              <p className="mt-1 text-xs text-slate-300">
                {regimeKey === "SCARCITY" ? "Investors are risk-off. Extend runway and delay fundraising. Lead with breakeven path." :
                 regimeKey === "DEFENSIVE" ? "Expect longer diligence. Lead with unit economics. Investors prioritizing profitability over growth." :
                 regimeKey === "VOLATILE" ? "Capital is available but cautious. Have multiple term sheets before committing. Favor milestone-based raises." :
                 regimeKey === "EXPANSION" ? "Investor appetite is strong. Lead with growth metrics. Raise while conditions are favorable." :
                 "Market conditions are mixed. Lead with your strongest metric."}
              </p>
            </div>
          ) : null}
          {regimeDistance ? (
            <div className="mt-3 space-y-1">
              <p className="text-fluid-micro font-semibold text-slate-400">
                <span className="text-amber-200 font-bold">{regimeDistance.pointsToFlip.toFixed(1)} pts</span> from {regimeDistance.dimensionLabel} flip
              </p>
              <div className="h-1.5 w-full rounded-full bg-slate-800/60 overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${Math.min(Math.abs(regimeDistance.currentValue - regimeDistance.thresholdValue) / 2, 100)}%`,
                    background: `linear-gradient(90deg, rgba(251,191,36,0.5), rgba(251,191,36,0.85))`,
                  }}
                />
              </div>
            </div>
          ) : null}
          <button
            onClick={() => setShowFull(false)}
            className="mt-3 self-start inline-flex items-center gap-1 rounded-full border border-slate-700/60 px-3 py-1 text-fluid-micro font-medium text-slate-400 hover:border-sky-500/30 hover:text-sky-200 transition-colors"
          >
            Show less
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
