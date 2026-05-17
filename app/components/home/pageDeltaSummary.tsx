"use client";

import { ScoreGauge } from "../scoreGauge";

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
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end sm:gap-x-4">
        <div className="col-span-2 sm:min-w-[12rem]">
          <p className="text-fluid-xs font-semibold text-slate-300">
            {regimeKey ? regimeLabel.charAt(0).toUpperCase() + regimeLabel.slice(1) : "Unknown"}
            <span className="text-slate-500 font-normal ml-2">· {actionShort ?? postureLabel}</span>
          </p>
        </div>
        <ScoreGauge
          value={tightness}
          label="Tightness"
          direction="tightening"
          delta={tightnessDelta}
        />
        <ScoreGauge
          value={riskAppetite}
          label="Risk appetite"
          direction="easing"
          delta={riskAppetiteDelta}
        />
        {companyStage ? (
          <span className="col-span-2 sm:col-auto rounded-full bg-slate-800/50 px-2 py-0.5 text-fluid-micro font-medium text-slate-400 self-center">
            {STAGE_LABELS[companyStage] ?? companyStage}{rateSensitivity ? ` · ${rateSensitivity}` : ""}
          </span>
        ) : null}
      </div>
    </div>
  );
}
