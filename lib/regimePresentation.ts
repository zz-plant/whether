import type { RegimeKey } from "./regimeEngine";

export const REGIME_ORDER: readonly RegimeKey[] = [
  "SCARCITY",
  "DEFENSIVE",
  "VOLATILE",
  "EXPANSION",
] as const;

export const REGIME_LABELS: Record<RegimeKey, string> = {
  SCARCITY: "Freezing",
  DEFENSIVE: "Cloudy",
  VOLATILE: "Stormy",
  EXPANSION: "Sunny",
};

export const REGIME_SHORT_LABELS: Record<RegimeKey, string> = {
  SCARCITY: "Freezing",
  DEFENSIVE: "Cloudy",
  VOLATILE: "Stormy",
  EXPANSION: "Sunny",
};

export const REGIME_LEGEND_LABELS: Record<RegimeKey, string> = {
  SCARCITY: "Freezing",
  DEFENSIVE: "Cloudy",
  VOLATILE: "Stormy",
  EXPANSION: "Sunny",
};

export const REGIME_WEATHER_LABELS: Record<RegimeKey, string> = {
  SCARCITY: "Freezing",
  DEFENSIVE: "Cloudy",
  VOLATILE: "Stormy",
  EXPANSION: "Sunny",
};

// Public/display label = the brand weather vocabulary. Every user-facing surface
// (hero, state page, history archive, share image, JSON-LD) renders the same regime
// name. Aliased to REGIME_WEATHER_LABELS so the two can never drift apart.
export const REGIME_PUBLIC_LABELS: Record<RegimeKey, string> = REGIME_WEATHER_LABELS;

export type RegimeWeatherIcon = "snowflake" | "cloud" | "storm" | "sun";
// Used by RegimeBadgeIcon in regimeIcons.tsx — icon name must match the component prop type.

export const REGIME_WEATHER_ICONS: Record<RegimeKey, RegimeWeatherIcon> = {
  SCARCITY: "snowflake",
  DEFENSIVE: "cloud",
  VOLATILE: "storm",
  EXPANSION: "sun",
};

export const REGIME_WEATHER_RATIONALES: Record<RegimeKey, string> = {
  SCARCITY: "Everything costs more to move, so protect heat, conserve cash, and avoid one-way commitments.",
  DEFENSIVE: "Conditions are workable but muted, so stay selective and keep efficiency layers on.",
  VOLATILE: "Windows open and close quickly, so move only with shelter, rollback paths, and proof.",
  EXPANSION: "Visibility is high and footing is firm, so move faster while keeping guardrails in place.",
};

export const REGIME_LEGEND_ARIA_LABELS: Record<RegimeKey, string> = {
  SCARCITY: "Scarcity regime: freezing weather; capital is constrained and each move needs protection.",
  DEFENSIVE: "Defensive regime: cloudy weather; conditions are workable but visibility is muted.",
  VOLATILE: "Transitional regime: stormy weather; windows open and close quickly.",
  EXPANSION: "Expansion regime: sunny weather; visibility is high and conditions support faster movement.",
};

export const getOrderedRegimeLegend = () => REGIME_ORDER.map((regime) => ({
  regime,
  label: REGIME_LEGEND_LABELS[regime],
  weather: REGIME_WEATHER_LABELS[regime],
  weatherRationale: REGIME_WEATHER_RATIONALES[regime],
  weatherIcon: REGIME_WEATHER_ICONS[regime],
  ariaLabel: REGIME_LEGEND_ARIA_LABELS[regime],
}));


export const isRegimeKey = (regime: string): regime is RegimeKey =>
  Object.prototype.hasOwnProperty.call(REGIME_PUBLIC_LABELS, regime);

export const getRegimePublicLabel = (regime: RegimeKey | string) =>
  isRegimeKey(regime) ? REGIME_PUBLIC_LABELS[regime] : regime;

export const getRegimeWeatherLabel = (regime: RegimeKey) => REGIME_WEATHER_LABELS[regime];
export const getRegimeWeatherIcon = (regime: RegimeKey) => REGIME_WEATHER_ICONS[regime];
export const getRegimeWeatherRationale = (regime: RegimeKey) => REGIME_WEATHER_RATIONALES[regime];

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
