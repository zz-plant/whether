import type { RegimeKey } from "./regimeEngine";

export const REGIME_ORDER: readonly RegimeKey[] = [
  "SCARCITY",
  "DEFENSIVE",
  "VOLATILE",
  "EXPANSION",
] as const;

export const REGIME_LABELS: Record<RegimeKey, string> = {
  SCARCITY: "Scarcity",
  DEFENSIVE: "Defensive",
  VOLATILE: "Volatile",
  EXPANSION: "Expansion",
};

export const REGIME_SHORT_LABELS: Record<RegimeKey, string> = {
  SCARCITY: "Scarcity",
  DEFENSIVE: "Defensive",
  VOLATILE: "Mixed",
  EXPANSION: "Expansion",
};

export const REGIME_LEGEND_LABELS: Record<RegimeKey, string> = {
  SCARCITY: "Scarcity",
  DEFENSIVE: "Defensive",
  VOLATILE: "Transitional",
  EXPANSION: "Expansion",
};

export const REGIME_LEGEND_ARIA_LABELS: Record<RegimeKey, string> = {
  SCARCITY: "Scarcity regime: capital constrained and risk appetite weak",
  DEFENSIVE: "Defensive regime: capital constrained with moderate risk appetite",
  VOLATILE: "Transitional regime: mixed read with unstable risk appetite",
  EXPANSION: "Expansion regime: capital easing with stronger risk appetite",
};

export const getOrderedRegimeLegend = () => REGIME_ORDER.map((regime) => ({
  regime,
  label: REGIME_LEGEND_LABELS[regime],
  ariaLabel: REGIME_LEGEND_ARIA_LABELS[regime],
}));


export const REGIME_LEGEND_DESCRIPTORS: Record<RegimeKey, string> = {
  SCARCITY: "Cash preservation first; pause irreversible expansion.",
  DEFENSIVE: "Operate for efficiency; approve only near-term proof bets.",
  VOLATILE: "Mixed read; prioritize reversible moves and signal confirmation.",
  EXPANSION: "Press growth with guardrails while leading signals hold.",
};


export type RegimeBannerTone = {
  shell: string;
  legendPanel: string;
  activePill: string;
  metrics: string;
};

export const REGIME_BANNER_TOKENS: Record<RegimeKey, RegimeBannerTone> = {
  SCARCITY: {
    shell: "border-rose-400/65 bg-gradient-to-br from-rose-950/70 via-slate-950/95 to-slate-950 text-rose-50",
    legendPanel: "border-rose-400/30 bg-slate-950/75",
    activePill: "border-rose-300/85 bg-rose-400/20 text-rose-50 shadow-[0_0_0_1px_rgba(251,113,133,0.25)]",
    metrics: "text-rose-100",
  },
  DEFENSIVE: {
    shell: "border-amber-400/65 bg-gradient-to-br from-amber-900/45 via-slate-950/95 to-slate-950 text-amber-50",
    legendPanel: "border-amber-300/25 bg-slate-950/75",
    activePill: "border-amber-300/85 bg-amber-300/20 text-amber-50 shadow-[0_0_0_1px_rgba(252,211,77,0.22)]",
    metrics: "text-amber-100",
  },
  VOLATILE: {
    shell: "border-sky-400/65 bg-gradient-to-br from-sky-900/45 via-slate-950/95 to-slate-950 text-sky-50",
    legendPanel: "border-sky-300/25 bg-slate-950/75",
    activePill: "border-sky-300/85 bg-sky-400/20 text-sky-50 shadow-[0_0_0_1px_rgba(125,211,252,0.25)]",
    metrics: "text-sky-100",
  },
  EXPANSION: {
    shell: "border-emerald-400/65 bg-gradient-to-br from-emerald-900/45 via-slate-950/95 to-slate-950 text-emerald-50",
    legendPanel: "border-emerald-300/25 bg-slate-950/75",
    activePill: "border-emerald-300/85 bg-emerald-300/20 text-emerald-50 shadow-[0_0_0_1px_rgba(110,231,183,0.24)]",
    metrics: "text-emerald-100",
  },
};

export const REGIME_SEVERITY_RANK: Record<RegimeKey, number> = {
  EXPANSION: 0,
  VOLATILE: 1,
  DEFENSIVE: 2,
  SCARCITY: 3,
};

export const REGIME_STYLE_TOKENS: Record<
  RegimeKey,
  {
    marker: string;
    badge: string;
    accent: {
      panel: string;
      dot: string;
      text: string;
    };
  }
> = {
  SCARCITY: {
    marker: "bg-rose-400",
    badge: "border-rose-500/60 bg-rose-500/15 text-rose-100",
    accent: {
      panel: "from-rose-600/20 via-rose-500/10 to-transparent border-rose-500/40",
      dot: "bg-rose-500",
      text: "text-rose-200",
    },
  },
  DEFENSIVE: {
    marker: "bg-amber-400",
    badge: "border-amber-400/60 bg-amber-400/15 text-amber-100",
    accent: {
      panel: "from-amber-500/20 via-amber-400/10 to-transparent border-amber-400/40",
      dot: "bg-amber-400",
      text: "text-amber-200",
    },
  },
  VOLATILE: {
    marker: "bg-indigo-400",
    badge: "border-sky-400/60 bg-sky-400/15 text-sky-100",
    accent: {
      panel: "from-sky-500/20 via-sky-400/10 to-transparent border-sky-400/40",
      dot: "bg-sky-400",
      text: "text-sky-200",
    },
  },
  EXPANSION: {
    marker: "bg-emerald-400",
    badge: "border-emerald-400/60 bg-emerald-400/15 text-emerald-100",
    accent: {
      panel: "from-emerald-500/20 via-emerald-400/10 to-transparent border-emerald-400/40",
      dot: "bg-emerald-400",
      text: "text-emerald-200",
    },
  },
};

export type RegimeMomentum = "improving" | "deteriorating" | "mixed" | "stable";
export type RegimeStageLabel = "Early" | "Mid" | "Late";
export type RegimeConfidenceLabel = "LOW" | "MED" | "HIGH";
export type RegimeDisplayModifier = "Guarded" | "Transitional" | null;

export const getRegimeDisplayLabel = ({
  regime,
  momentum,
  confidence,
  transitionWatch,
}: {
  regime: RegimeKey;
  momentum?: RegimeMomentum;
  confidence?: RegimeConfidenceLabel | "MEDIUM";
  transitionWatch?: boolean;
}) => {
  if (regime === "VOLATILE") {
    return {
      canonicalRegime: regime,
      modifier: "Transitional" as const,
      label: "Transitional Mixed",
    };
  }

  if (regime === "DEFENSIVE" || regime === "SCARCITY") {
    return {
      canonicalRegime: regime,
      modifier: null,
      label: "Contraction",
    };
  }

  const guardedExpansion =
    transitionWatch ||
    confidence === "LOW" ||
    momentum === "deteriorating" ||
    momentum === "mixed";

  return {
    canonicalRegime: regime,
    modifier: guardedExpansion ? ("Guarded" as const) : null,
    label: guardedExpansion ? "Guarded Expansion" : "Expansion",
  };
};

export const deriveRegimeStage = ({
  regime,
  momentum,
  confidence,
  distanceToFlip,
}: {
  regime: RegimeKey;
  momentum: RegimeMomentum;
  confidence: RegimeConfidenceLabel;
  distanceToFlip: number;
}) => {
  const normalizedDistance = Number.isFinite(distanceToFlip) ? Math.max(0, distanceToFlip) : 0;

  let label: RegimeStageLabel = "Mid";
  if (momentum === "improving") {
    if (regime === "SCARCITY" || regime === "DEFENSIVE") {
      label = "Early";
    } else if (normalizedDistance >= 12 && confidence === "HIGH") {
      label = "Late";
    }
  } else if (momentum === "deteriorating") {
    label = regime === "EXPANSION" ? "Late" : "Mid";
  } else if (momentum === "stable" || momentum === "mixed") {
    label = normalizedDistance <= 8 ? "Late" : "Mid";
  }

  const fragile = confidence === "LOW" || normalizedDistance <= 4;
  const displayLabel = fragile ? `${label} (Fragile)` : label;

  return {
    label,
    fragile,
    displayLabel,
  };
};
