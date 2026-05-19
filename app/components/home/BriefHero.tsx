import { RegimeCompass } from "../regimeCompass";

type BriefHeroProps = {
  regime: string;
  postureLabel: string;
  decision: string;
  tightness: number;
  riskAppetite: number;
  tightnessDelta: number;
  riskAppetiteDelta: number;
  confidenceLabel?: string;
  recordDate?: string;
  fetchedAt?: string;
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
  recordDate,
  fetchedAt,
}: BriefHeroProps) {
  return (
    <div className="text-center space-y-6 py-8">
      {/* Publication masthead */}
      <div className="space-y-1">
        <p className="text-fluid-micro font-semibold uppercase tracking-[0.2em] text-slate-500">
          Whether · Weekly Brief{recordDate ? ` · ${recordDate}` : ""}
        </p>
      </div>

      {/* Hero compass — large and centered */}
      <div className="flex justify-center">
        <div className="w-full max-w-[20rem]">
          <RegimeCompass
            tightness={tightness}
            riskAppetite={riskAppetite}
            prevTightness={tightness - tightnessDelta}
            prevRiskAppetite={riskAppetite - riskAppetiteDelta}
            regimeKey={regime}
          />
        </div>
      </div>

      {/* Regime label + posture */}
      <div className="space-y-1">
        <p className="text-fluid-xs font-semibold uppercase tracking-[0.15em] text-sky-200">
          {regime === "EXPANSION" ? "Expansion" :
           regime === "SCARCITY" ? "Scarcity" :
           regime === "DEFENSIVE" ? "Defensive" :
           regime === "VOLATILE" ? "Volatile" : regime}
          {" · "}{postureLabel}
        </p>
      </div>

      {/* Decision headline */}
      <h2 className="text-fluid-xl font-semibold text-slate-100 leading-snug max-w-2xl mx-auto font-display">
        {decision}
      </h2>

      {/* Scores — large numbers */}
      <div className="flex justify-center gap-8 pt-2">
        <div className="text-center">
          <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-500 mb-1">Credit conditions</p>
          <p className="text-2xl font-bold tabular-nums text-slate-100">
            {tightness}
            {tightnessDelta !== 0 ? (
              <span className={`text-lg ml-1 ${tightnessDelta > 0 ? "text-amber-200" : "text-emerald-200"}`}>
                {tightnessDelta > 0 ? "↑" : "↓"}{Math.abs(tightnessDelta)}
              </span>
            ) : null}
          </p>
        </div>
        <div className="text-center">
          <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-500 mb-1">Investor sentiment</p>
          <p className="text-2xl font-bold tabular-nums text-slate-100">
            {riskAppetite}
            {riskAppetiteDelta !== 0 ? (
              <span className={`text-lg ml-1 ${riskAppetiteDelta > 0 ? "text-emerald-200" : "text-amber-200"}`}>
                {riskAppetiteDelta > 0 ? "↑" : "↓"}{Math.abs(riskAppetiteDelta)}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {/* Confidence + freshness */}
      <div className="flex justify-center gap-3 text-fluid-micro text-slate-500">
        {confidenceLabel ? (
          <span className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-[0.08em] ${
            confidenceLabel === "HIGH" ? "text-emerald-200 bg-emerald-500/10" :
            confidenceLabel === "MED" ? "text-amber-200 bg-amber-500/10" :
            "text-rose-200 bg-rose-500/10"
          }`}>
            {confidenceLabel}
          </span>
        ) : null}
        {fetchedAt ? <span>Data {fetchedAt}</span> : null}
      </div>
    </div>
  );
}
