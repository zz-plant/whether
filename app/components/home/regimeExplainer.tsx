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

const IF_SHIFT: Record<string, string> = {
  "EXPANSION-tightness": "If credit tightens above {threshold}, you'd shift to Defensive: protect what's working, pause new bets.",
  "EXPANSION-risk": "If investor sentiment drops below {threshold}, you'd shift to Volatile: make only reversible moves.",
  "DEFENSIVE-tightness": "If credit eases below {threshold}, you'd shift to Expansion: move faster on what's working.",
  "DEFENSIVE-risk": "If investor sentiment drops below {threshold}, you'd shift to Scarcity: preserve cash, delay spend.",
  "SCARCITY-tightness": "If credit eases below {threshold}, you'd shift to Volatile: conditions can shift quickly — stay reversible.",
  "SCARCITY-risk": "If investor sentiment rises above {threshold}, you'd shift to Defensive: gate commitments to short-payback work.",
  "VOLATILE-tightness": "If credit tightens above {threshold}, you'd shift to Scarcity: preserve cash, delay non-essential spend.",
  "VOLATILE-risk": "If investor sentiment rises above {threshold}, you'd shift to Expansion: scale proven bets.",
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

  const tightGap = tightnessThreshold - tightness;
  const riskGap = riskAppetite - riskAppetiteThreshold;
  const nearestKey = Math.abs(tightGap) < Math.abs(riskGap) ? "tightness" : "risk";
  const nearestGap = nearestKey === "tightness" ? tightGap : riskGap;
  const nearestThreshold = nearestKey === "tightness" ? tightnessThreshold : riskAppetiteThreshold;
  const whatIfKey = `${regimeKey}-${nearestKey === "tightness" ? (tightness >= tightnessThreshold ? "tightness" : "tightness") : "risk"}`;

  const whatIfDirection = nearestGap > 0
    ? `closest shift: ${nearestKey === "tightness" ? "credit conditions" : "investor sentiment"} at ${Math.abs(nearestGap).toFixed(0)} pts away`
    : `${nearestKey === "tightness" ? "credit conditions" : "investor sentiment"} already past threshold`;

  const shiftText = IF_SHIFT[whatIfKey] ?? "";

  return (
    <div className="mt-2 rounded-lg border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-xs space-y-2">
      <p className="text-slate-300 leading-relaxed">{description}</p>
      <p className="text-slate-400">
        Credit conditions: <span className={tightDir === "above" ? "text-amber-200" : "text-emerald-200"}>{tightness}</span> ({tightDir} {tightnessThreshold} threshold).
        Investor sentiment: <span className={riskDir === "above" ? "text-emerald-200" : "text-amber-200"}>{riskAppetite}</span> ({riskDir} {riskAppetiteThreshold} threshold).
      </p>
      {shiftText ? (
        <p className="text-amber-200/80 leading-relaxed pt-1 border-t border-slate-700/50">
          <span className="text-amber-200 font-semibold">{whatIfDirection}:</span>{" "}
          {shiftText.replace("{threshold}", String(nearestThreshold))}
        </p>
      ) : null}
    </div>
  );
}
