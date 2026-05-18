"use client";

import { useState } from "react";

type RegimeExplainerProps = {
  regimeKey?: string;
  tightness: number;
  riskAppetite: number;
  tightnessThreshold: number;
  riskAppetiteThreshold: number;
};

const REGIME_DESCRIPTIONS: Record<string, string> = {
  SCARCITY: "Cash and credit are tight. Market risk appetite is low. Prioritize cash preservation, delay non-essential spend, and avoid growth-at-all-costs bets.",
  DEFENSIVE: "Cash and credit are tight, but market risk appetite is still healthy. Gate new commitments to short-payback work. Keep approvals reversible.",
  VOLATILE: "Cash and credit are available, but market risk appetite is low. Proceed with caution — conditions can shift quickly. Favor reversible bets with clear exit criteria.",
  EXPANSION: "Cash and credit are available and market risk appetite is high. Scale proven bets, but maintain milestone-based approval gates.",
};

export function RegimeExplainer({
  regimeKey,
  tightness,
  riskAppetite,
  tightnessThreshold,
  riskAppetiteThreshold,
}: RegimeExplainerProps) {
  const [open, setOpen] = useState(false);

  if (!regimeKey) return null;

  const description = REGIME_DESCRIPTIONS[regimeKey] ?? "";
  const tightDir = tightness >= tightnessThreshold ? "above" : "below";
  const riskDir = riskAppetite >= riskAppetiteThreshold ? "above" : "below";

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-fluid-micro font-medium text-slate-500 hover:text-slate-300 transition-colors"
        aria-expanded={open}
      >
        {open ? "▾" : "▸"} Why {regimeKey?.toLowerCase()}?
      </button>

      {open ? (
        <div className="mt-2 rounded-lg border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-xs space-y-2">
          <p className="text-slate-300 leading-relaxed">{description}</p>
          <div className="text-slate-400 space-y-1">
            <p>Tightness is <span className={tightDir === "above" ? "text-amber-200" : "text-emerald-200"}>{tightness}</span> ({tightDir} the {tightnessThreshold} threshold).</p>
            <p>Risk appetite is <span className={riskDir === "above" ? "text-emerald-200" : "text-amber-200"}>{riskAppetite}</span> ({riskDir} the {riskAppetiteThreshold} threshold).</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
