"use client";

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
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <span className="font-semibold text-slate-100">
          {regimeKey ? regimeLabel.charAt(0).toUpperCase() + regimeLabel.slice(1) : "Unknown"}
        </span>
        <span className={tightnessDelta === 0 ? "text-slate-400" : tightnessDelta > 0 ? "text-amber-200" : "text-emerald-200"}>
          Tightness {tightness} {tightnessDelta !== 0 ? `${tightnessDelta > 0 ? "↑" : "↓"}${Math.abs(tightnessDelta)}` : "—"}
        </span>
        <span className={riskAppetiteDelta === 0 ? "text-slate-400" : riskAppetiteDelta > 0 ? "text-emerald-200" : "text-amber-200"}>
          Risk appetite {riskAppetite} {riskAppetiteDelta !== 0 ? `${riskAppetiteDelta > 0 ? "↑" : "↓"}${Math.abs(riskAppetiteDelta)}` : "—"}
        </span>
        <span className="text-slate-300">
          {actionShort ?? postureLabel}
        </span>
        {companyStage ? (
          <span className="rounded-full bg-slate-800/50 px-2 py-0.5 text-fluid-micro font-medium text-slate-400">
            {STAGE_LABELS[companyStage] ?? companyStage}{rateSensitivity ? ` · ${rateSensitivity}` : ""}
          </span>
        ) : null}
      </div>
    </div>
  );
}
