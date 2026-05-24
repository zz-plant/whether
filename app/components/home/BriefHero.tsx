type BriefHeroProps = {
  regime: string;
  postureLabel: string;
  tightness: number;
  tightnessDelta: number;
  confidenceLabel?: string;
  recordDate?: string;
  fetchedAt?: string;
  showOfflineBadge?: boolean;
  degradedSourceCount?: number;
  decisionShiftSummary?: string;
  reliabilityScore?: number;
};

export function BriefHero({
  regime,
  postureLabel,
  tightness,
  tightnessDelta,
  confidenceLabel,
  recordDate,
  fetchedAt,
  showOfflineBadge,
  degradedSourceCount,
  decisionShiftSummary,
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

  const isDegraded = showOfflineBadge || (degradedSourceCount && degradedSourceCount > 0) || (reliabilityScore != null && reliabilityScore < 60);

  return (
    <div className={`text-center space-y-5 sm:space-y-6 py-5 sm:py-8 border-l-2 ${heroTint}`}>
      <p className="text-fluid-micro font-semibold uppercase tracking-[0.12em] sm:tracking-[0.2em] text-slate-400">
        Whether · Weekly Brief{recordDate ? ` · ${recordDate}` : ""}
      </p>

      <div className="space-y-1">
        <div className="flex items-baseline justify-center gap-6 sm:gap-10 weather-hero-scores">
          <div>
            <p className="text-[clamp(4rem,12vw,6.5rem)] font-bold leading-none text-slate-50 font-display tracking-tight">
              {tightness}
            </p>
            <p className="text-fluid-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Credit tightness</p>
            {fetchedAt ? (
              <p className="text-[0.6rem] text-slate-600 mt-0.5">Updated {fetchedAt}</p>
            ) : null}
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

      {decisionShiftSummary ? (
        <p className="text-fluid-xs text-slate-400 max-w-xl mx-auto">{decisionShiftSummary}</p>
      ) : null}

      {isDegraded ? (
        <div className="max-w-xl mx-auto rounded-md border border-amber-500/30 bg-amber-500/8 px-3 py-2 text-xs leading-5 text-amber-100">
          <span className="font-semibold">Data quality is degraded.</span>{" "}
          Stage irreversible decisions until the next clean refresh.
        </div>
      ) : null}
    </div>
  );
}