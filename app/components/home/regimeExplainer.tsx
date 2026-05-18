"use client";

type RegimeExplainerProps = {
  regimeKey?: string;
  tightness: number;
  riskAppetite: number;
  tightnessThreshold: number;
  riskAppetiteThreshold: number;
};

const REGIME_DESCRIPTIONS: Record<string, string> = {
  SCARCITY: "Credit is tight and investors are cautious. Focus on cash preservation and delay non-essential spend.",
  DEFENSIVE: "Credit is tight but investors are still willing to fund growth. Gate new commitments to short-payback work.",
  VOLATILE: "Credit is available but investors are cautious. Favor reversible decisions — conditions can shift quickly.",
  EXPANSION: "Credit is available and investors are optimistic. Scale proven bets with milestone-based approval gates.",
};

export function RegimeExplainer({
  regimeKey,
  tightness,
  riskAppetite,
  tightnessThreshold,
  riskAppetiteThreshold,
}: RegimeExplainerProps) {
  if (!regimeKey) return null;

  const description = REGIME_DESCRIPTIONS[regimeKey] ?? "";
  const tightDir = tightness >= tightnessThreshold ? "above" : "below";
  const riskDir = riskAppetite >= riskAppetiteThreshold ? "above" : "below";

  return (
    <div className="mt-2 rounded-lg border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-xs space-y-2">
      <p className="text-slate-300 leading-relaxed">{description}</p>
      <p className="text-slate-400">
        Tightness is <span className={tightDir === "above" ? "text-amber-200" : "text-emerald-200"}>{tightness}</span> ({tightDir} {tightnessThreshold} threshold).
        Risk appetite is <span className={riskDir === "above" ? "text-emerald-200" : "text-amber-200"}>{riskAppetite}</span> ({riskDir} {riskAppetiteThreshold} threshold).
      </p>
    </div>
  );
}
