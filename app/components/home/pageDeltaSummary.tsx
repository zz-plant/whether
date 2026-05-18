"use client";

import { RegimeCompass } from "../regimeCompass";

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
            <div>
              <span className="text-fluid-micro font-semibold uppercase tracking-[0.08em] text-slate-400">Tightness</span>
              <p className="font-semibold tabular-nums text-slate-100">
                {tightness}
                {tightnessDelta !== 0 ? (
                  <span className={tightnessDelta > 0 ? "text-amber-200 ml-1" : "text-emerald-200 ml-1"}>
                    {tightnessDelta > 0 ? "↑" : "↓"}{Math.abs(tightnessDelta)}
                  </span>
                ) : null}
              </p>
            </div>
            <div>
              <span className="text-fluid-micro font-semibold uppercase tracking-[0.08em] text-slate-400">Risk</span>
              <p className="font-semibold tabular-nums text-slate-100">
                {riskAppetite}
                {riskAppetiteDelta !== 0 ? (
                  <span className={riskAppetiteDelta > 0 ? "text-emerald-200 ml-1" : "text-amber-200 ml-1"}>
                    {riskAppetiteDelta > 0 ? "↑" : "↓"}{Math.abs(riskAppetiteDelta)}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
          {companyStage ? (
            <span className="mt-2 self-start rounded-full bg-slate-800/50 px-2 py-0.5 text-fluid-micro font-medium text-slate-400">
              {STAGE_LABELS[companyStage] ?? companyStage}{rateSensitivity ? ` · ${rateSensitivity}` : ""}
            </span>
          ) : null}
        </div>
        <RegimeCompass
          tightness={tightness}
          riskAppetite={riskAppetite}
          prevTightness={tightness - tightnessDelta}
          prevRiskAppetite={riskAppetite - riskAppetiteDelta}
          regimeKey={regimeKey}
        />
      </div>
    </div>
  );
}
