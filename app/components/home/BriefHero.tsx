type BriefHeroProps = {
  regime: string;
  prevRegime?: string;
  regimeHistory?: string[];
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
  prevRegime,
  regimeHistory,
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
    ? "border-t-rose-500/20 bg-rose-500/[0.03]"
    : isMedConfidence
      ? "border-t-amber-500/20 bg-amber-500/[0.03]"
      : "border-t-emerald-500/20";

  const tightnessDirection = tightnessDelta > 0 ? "↑" : tightnessDelta < 0 ? "↓" : "→";
  const deltaEmphasis = tightnessDelta > 0 ? "text-rose-200" : tightnessDelta < 0 ? "text-emerald-200" : "text-slate-400";

  const isDegraded = showOfflineBadge || (degradedSourceCount && degradedSourceCount > 0) || (reliabilityScore != null && reliabilityScore < 60);

  return (
    <div className={`space-y-4 sm:space-y-5 py-5 sm:py-8 border-t ${heroTint}`}>
      <h1 className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-400 text-left">
        Whether · Weekly Brief{recordDate ? ` · ${recordDate}` : ""}
      </h1>

      <div className="space-y-1">
        <div className="flex items-baseline justify-center gap-6 sm:gap-10 weather-hero-scores">
          <div>
            <p className="text-[clamp(4rem,12vw,6.5rem)] font-bold leading-none text-slate-50 font-display tracking-tight tabular-nums">
              {tightness}
            </p>
            <p className="text-fluid-xs font-semibold uppercase tracking-[0.1em] text-slate-400" title="Credit tightness measures how restrictive lending conditions are. Scale: 0–100.">
              Credit conditions
            </p>
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
              <p className="text-fluid-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Reliability</p>
            </div>
          ) : null}
        </div>
        <p className="text-fluid-xs text-slate-400">
          {regime} regime{postureLabel ? ` · ${postureLabel}` : ""}{tightnessDelta !== 0 ? (
            <span className={`ml-1 font-semibold ${deltaEmphasis}`}>{tightnessDirection} {Math.abs(tightnessDelta).toFixed(1)} pts</span>
          ) : null}
          {regimeHistory ? (
            <span className="inline-flex items-center gap-1 ml-1.5">
              {regimeHistory.map((r, i) => (
                <span
                  key={i}
                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                    r === "SCARCITY" ? "bg-amber-400" :
                    r === "DEFENSIVE" ? "bg-rose-400" :
                    r === "VOLATILE" ? "bg-sky-400" : "bg-emerald-400"
                  }`}
                  title={r}
                />
              ))}
            </span>
          ) : null}
        </p>
      </div>

      {decisionShiftSummary ? (
        <p className="text-fluid-xs text-slate-400 max-w-xl">{decisionShiftSummary}</p>
      ) : null}

      {isDegraded ? (
        <div className="max-w-xl rounded-md border border-amber-500/30 bg-amber-500/8 px-3 py-2 text-xs leading-5 text-amber-100">
          <span className="font-semibold">Data quality is degraded.</span>{" "}
          Stage irreversible decisions until the next clean refresh.
        </div>
      ) : null}
    </div>
  );
}