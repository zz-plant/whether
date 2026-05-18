"use client";

type RegimeExplainerProps = {
  regimeKey?: string;
  tightness: number;
  riskAppetite: number;
  tightnessThreshold: number;
  riskAppetiteThreshold: number;
};

const REGIME_DESCRIPTIONS: Record<string, string> = {
  SCARCITY: "Cash and credit are tight. Market risk appetite is low. Prioritize cash preservation.",
  DEFENSIVE: "Cash and credit are tight, but market risk appetite is still healthy. Gate new commitments to short-payback work.",
  VOLATILE: "Cash and credit are available, but market risk appetite is low. Proceed with caution — conditions can shift quickly.",
  EXPANSION: "Cash and credit are available and market risk appetite is high. Scale proven bets with milestone-based gates.",
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
