"use client";

import { useState } from "react";
import { RegimeCompass } from "../regimeCompass";
import { RegimeExplainer } from "./regimeExplainer";
import { RegimeContextBlock } from "./regimeContextBlock";
import { ConfidenceBadge } from "../ConfidenceBadge";
import { ScoreCard } from "../ScoreCard";

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
  const [showFull, setShowFull] = useState(true);

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
            <ScoreCard
              label="Credit conditions"
              value={tightness}
              delta={tightnessDelta}
              variant="compact"
              tooltip={SCORE_TOOLTIPS.tightness}
            >
              <p className="text-fluid-micro text-slate-600">
                {tightnessDelta !== 0
                  ? `vs last week: ${tightnessDelta > 0 ? "+" : ""}${tightnessDelta}`
                  : "unchanged from last week"}
              </p>
            </ScoreCard>
            <ScoreCard
              label="Investor sentiment"
              value={riskAppetite}
              delta={riskAppetiteDelta}
              variant="compact"
              tooltip={SCORE_TOOLTIPS.risk}
            >
              <p className="text-fluid-micro text-slate-600">
                {riskAppetiteDelta !== 0
                  ? `vs last week: ${riskAppetiteDelta > 0 ? "+" : ""}${riskAppetiteDelta}`
                  : "unchanged from last week"}
              </p>
            </ScoreCard>
          </div>
          {freshnessLabel || sourceLabel ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-fluid-micro text-slate-400">
              {confidenceLabel ? <ConfidenceBadge label={confidenceLabel} variant="link" /> : null}
              {freshnessLabel ? <span>Data {freshnessLabel}</span> : null}
              {sourceLabel ? <span className="text-slate-600">· {sourceLabel}</span> : null}
              <span className="text-slate-600">·</span>
              <a href="/history" className="text-fluid-micro text-slate-400 hover:text-sky-200 no-underline transition-colors" title="See how these scores have changed over time">
                ▁▂▃▄▅▆ See trend →
              </a>
            </div>
          ) : null}
          {companyStage ? (
            <span className="mt-2 self-start rounded-full bg-slate-800/50 px-2 py-0.5 text-fluid-micro font-medium text-slate-400">
              {STAGE_LABELS[companyStage] ?? companyStage}{rateSensitivity ? ` · ${rateSensitivity}` : ""}
            </span>
          ) : null}
          {regimeDistance ? (
            <p className="text-fluid-micro text-amber-200/70 leading-relaxed mt-1">
              {regimeDistance.pointsToFlip.toFixed(0)} pts from shifting to{" "}
              {regimeDistance.dimensionLabel === "Risk appetite"
                ? regimeKey === "EXPANSION" ? "Volatile — make only reversible moves"
                : regimeKey === "DEFENSIVE" ? "Scarcity — preserve cash"
                : regimeKey === "VOLATILE" ? regimeDistance.currentValue > regimeDistance.thresholdValue ? "Expansion — scale proven bets" : "Scarcity — preserve cash"
                : regimeKey === "SCARCITY" ? "Volatile — stay reversible"
                : "a different regime"
                : regimeKey === "DEFENSIVE" ? "Expansion — move faster on what's working"
                : regimeKey === "EXPANSION" ? "Defensive — protect what's working"
                : "a different regime"}
            </p>
          ) : null}
          {companyStage ? (
            <p className="text-fluid-micro text-slate-400 mt-1">
              {companyStage === "pre-seed" ? "Pre-seed companies in this regime typically extend runway and gate small experiments."
               : companyStage === "seed" ? "Seed-stage companies in this regime typically focus on repeatable pipeline and staged hires."
               : companyStage === "series-a" ? "Series A companies in this regime typically gate team growth and protect unit economics."
               : companyStage === "series-b-plus" ? "Growth-stage companies in this regime typically scale proven channels with milestone checks."
               : "Public companies in this regime typically manage expectations and optimize free cash flow."}
            </p>
          ) : null}
        </div>
        {!showFull ? (
          <div className="flex flex-col justify-center">
            <button
              onClick={() => setShowFull(true)}
              className="self-start inline-flex items-center gap-1 rounded-full border border-slate-700/60 px-3 py-1 text-fluid-micro font-medium text-slate-400 hover:border-sky-500/30 hover:text-sky-200 transition-colors"
            >
              Show compass &amp; analysis →
            </button>
          </div>
        ) : (
        <div className="flex flex-col">
          <p className="text-fluid-micro text-slate-400 italic leading-relaxed">
          <a href="/trust#revisit-call" className="text-slate-400 hover:text-sky-300 underline decoration-slate-700 hover:decoration-sky-400 transition-colors">When we get this wrong →</a>
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
              <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-400">What this means for fundraising</p>
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
                <span className="text-amber-200 font-bold">{regimeDistance.pointsToFlip.toFixed(1)} pts</span> from {regimeDistance.dimensionLabel} shift
              </p>
              <div className="h-1.5 w-full rounded-full bg-slate-800/60 overflow-hidden">
                <div
                  className="h-full rounded-full origin-left transition-transform duration-500"
                  style={{
                    transform: `scaleX(${Math.min(Math.abs(regimeDistance.currentValue - regimeDistance.thresholdValue) / 200, 1)})`,
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
