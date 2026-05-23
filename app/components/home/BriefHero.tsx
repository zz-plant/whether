import { RegimeCompass } from "../regimeCompass";
import { ConfidenceGauge } from "../ConfidenceGauge";
import { ExportImageButton } from "../exportImageButton";
import { ScoreCard } from "../ScoreCard";

type BriefHeroProps = {
  regime: string;
  postureLabel: string;
  decision: string;
  tightness: number;
  riskAppetite: number;
  tightnessDelta: number;
  riskAppetiteDelta: number;
  confidenceLabel?: string;
  confidencePercent?: number;
  recordDate?: string;
  fetchedAt?: string;
  guardrail?: string;
  flipConditions?: string[];
  actionNow?: string;
  showOfflineBadge?: boolean;
  degradedSourceCount?: number;
  decisionShiftSummary?: string;
  trendLabel?: string;
  reliabilityScore?: number;
};

const TREND_BADGE: Record<string, string> = {
  tightening: "border-rose-400/25 bg-rose-500/10 text-rose-200",
  easing: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200",
  stable: "border-slate-400/25 bg-slate-500/10 text-slate-200",
};

export function BriefHero({
  regime,
  postureLabel,
  decision,
  tightness,
  riskAppetite,
  tightnessDelta,
  riskAppetiteDelta,
  confidenceLabel,
  confidencePercent,
  recordDate,
  fetchedAt,
  guardrail,
  flipConditions,
  actionNow,
  showOfflineBadge,
  degradedSourceCount,
  decisionShiftSummary,
  trendLabel,
  reliabilityScore,
}: BriefHeroProps) {
  const confidenceLevel = (confidenceLabel ?? "").toUpperCase();
  const isLowConfidence = confidenceLevel === "LOW";
  const isMedConfidence = confidenceLevel === "MED";
  const heroTint = isLowConfidence
    ? "border-l-rose-500/30 bg-gradient-to-r from-rose-500/5 to-transparent"
    : isMedConfidence
      ? "border-l-amber-500/30 bg-gradient-to-r from-amber-500/5 to-transparent"
      : "border-l-emerald-500/30";

  const tightnessDirection = tightnessDelta > 0 ? "↑" : tightnessDelta < 0 ? "↓" : "→";
  const deltaEmphasis = tightnessDelta > 0 ? "text-rose-200" : tightnessDelta < 0 ? "text-emerald-200" : "text-slate-400";
  const trendKey = (trendLabel ?? "").toLowerCase();
  const trendBadge = TREND_BADGE[trendKey] ?? TREND_BADGE.stable;

  const isDegraded = showOfflineBadge || (degradedSourceCount && degradedSourceCount > 0) || (reliabilityScore != null && reliabilityScore < 60);

  return (
    <div className={`text-center space-y-5 sm:space-y-6 py-5 sm:py-8 border-l-2 ${heroTint}`}>
      <p className="text-fluid-micro font-semibold uppercase tracking-[0.12em] sm:tracking-[0.2em] text-slate-400">
        Whether · Weekly Brief{recordDate ? ` · ${recordDate}` : ""}
      </p>

      {/* Dominant number */}
      <div className="space-y-1">
        <div className="flex items-baseline justify-center gap-6 sm:gap-10 weather-hero-scores">
          <div>
            <p className="text-[clamp(4rem,12vw,6.5rem)] font-bold leading-none text-slate-50 font-display tracking-tight">
              {tightness}
            </p>
            <p className="text-fluid-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Credit tightness</p>
          </div>
          {reliabilityScore != null ? (
            <div>
              <p className={`text-[clamp(2.5rem,7vw,4rem)] font-bold leading-none font-display tracking-tight ${
                reliabilityScore >= 80 ? "text-emerald-200" : reliabilityScore >= 60 ? "text-amber-200" : "text-rose-200"
              }`}>
                {reliabilityScore}
              </p>
              <p className="text-fluid-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Reliability</p>
            </div>
          ) : null}
        </div>
        <p className="text-fluid-xs text-slate-400">
          {regime} regime{postureLabel ? ` · ${postureLabel}` : ""}{tightnessDelta !== 0 ? (
            <span className={`ml-1 font-semibold ${deltaEmphasis}`}>{tightnessDirection} {Math.abs(tightnessDelta).toFixed(1)} pts</span>
          ) : null}
        </p>
      </div>

      {/* Forecast strip */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
        <span className="rounded-full border border-sky-400/25 bg-sky-500/10 px-3 py-1 text-fluid-xs font-semibold text-sky-100">
          This week: {decision.length > 60 ? decision.slice(0, 57) + "…" : decision}
        </span>
        {trendLabel ? (
          <span className={`rounded-full border px-3 py-1 text-fluid-xs font-semibold ${trendBadge}`}>
            {trendLabel} trend
          </span>
        ) : null}
        {confidencePercent != null ? (
          <ConfidenceGauge percent={confidencePercent} label={confidenceLabel as "HIGH" | "MED" | "LOW" | undefined} size="md" />
        ) : null}
      </div>

      {/* Decision shift */}
      {decisionShiftSummary ? (
        <p className="text-fluid-xs text-slate-400 max-w-xl mx-auto">{decisionShiftSummary}</p>
      ) : null}

      {isDegraded ? (
        <div className="max-w-xl mx-auto rounded-md border border-amber-500/30 bg-amber-500/8 px-3 py-2 text-xs leading-5 text-amber-100">
          <span className="font-semibold">Data quality is degraded.</span>{" "}
          Stage irreversible decisions until the next clean refresh.
        </div>
      ) : null}

      {/* Secondary detail — collapsible */}
      <details className="weather-auto-chevron max-w-xl mx-auto text-left rounded-lg border border-slate-800/60 bg-slate-950/30 px-4 py-3">
        <summary className="cursor-pointer list-none text-fluid-xs font-semibold text-slate-400 hover:text-slate-300">
          Conditions detail
        </summary>
        <div className="mt-4 space-y-4">
          <div className="flex justify-center">
            <div className="w-full max-w-[14rem] sm:max-w-[18rem]">
              <RegimeCompass
                tightness={tightness}
                riskAppetite={riskAppetite}
                prevTightness={tightness - tightnessDelta}
                prevRiskAppetite={riskAppetite - riskAppetiteDelta}
                regimeKey={regime}
              />
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <ScoreCard label="Credit conditions" value={tightness} delta={tightnessDelta} variant="large" />
            <ScoreCard label="Investor sentiment" value={riskAppetite} delta={riskAppetiteDelta} variant="large" />
          </div>
        </div>
      </details>

      {/* Source trust line */}
      <div className="flex flex-col items-center gap-1.5 text-fluid-micro text-slate-500">
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          {fetchedAt ? <span>Refreshed {fetchedAt}</span> : null}
          {showOfflineBadge ? (
            <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 font-semibold uppercase tracking-[0.08em] text-amber-200">Cached</span>
          ) : null}
          {degradedSourceCount && degradedSourceCount > 0 ? (
            <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 font-semibold uppercase tracking-[0.08em] text-rose-200">{degradedSourceCount} source{degradedSourceCount > 1 ? "s" : ""} degraded</span>
          ) : null}
        </div>
        <p>Data: FRED · Treasury · Yahoo Finance</p>
      </div>
    </div>
  );
}
