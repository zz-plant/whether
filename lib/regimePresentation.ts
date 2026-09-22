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

// One table. SHORT, LEGEND, WEATHER and PUBLIC were four byte-identical literals
// of the same four words; readers picked one at random and nothing stopped them
// drifting. They are aliases now, kept as names so no import breaks, and the
// only literal is REGIME_LABELS above.
export const REGIME_SHORT_LABELS: Record<RegimeKey, string> = REGIME_LABELS;
const REGIME_LEGEND_LABELS: Record<RegimeKey, string> = REGIME_LABELS;
export const REGIME_WEATHER_LABELS: Record<RegimeKey, string> = REGIME_LABELS;
export const REGIME_PUBLIC_LABELS: Record<RegimeKey, string> = REGIME_LABELS;

/**
 * One fact about money and one instruction per weather word. The metaphor is
 * cashed out here rather than extended: "protect heat" and "move only with
 * shelter" told a reader what the weather was like, not what to do about it.
 */
export const REGIME_WEATHER_RATIONALES: Record<RegimeKey, string> = {
  SCARCITY: "Money is expensive and hard to raise. Conserve cash and avoid commitments you can't undo.",
  DEFENSIVE: "Money is available but pricey. Fund what is already working; hold the rest.",
  VOLATILE: "Conditions are changing week to week. Only commit where you can reverse.",
  EXPANSION: "Money is cheap and available. Move faster, and keep the pause line in view.",
};

/* The same sentence, led by the weather word, for the legend's screen-reader label. */
const REGIME_LEGEND_ARIA_LABELS: Record<RegimeKey, string> = {
  SCARCITY: `${REGIME_LABELS.SCARCITY}: ${REGIME_WEATHER_RATIONALES.SCARCITY}`,
  DEFENSIVE: `${REGIME_LABELS.DEFENSIVE}: ${REGIME_WEATHER_RATIONALES.DEFENSIVE}`,
  VOLATILE: `${REGIME_LABELS.VOLATILE}: ${REGIME_WEATHER_RATIONALES.VOLATILE}`,
  EXPANSION: `${REGIME_LABELS.EXPANSION}: ${REGIME_WEATHER_RATIONALES.EXPANSION}`,
};

export const getOrderedRegimeLegend = () => REGIME_ORDER.map((regime) => ({
  regime,
  label: REGIME_LEGEND_LABELS[regime],
  weather: REGIME_WEATHER_LABELS[regime],
  weatherRationale: REGIME_WEATHER_RATIONALES[regime],
  ariaLabel: REGIME_LEGEND_ARIA_LABELS[regime],
}));


export const isRegimeKey = (regime: string): regime is RegimeKey =>
  Object.prototype.hasOwnProperty.call(REGIME_PUBLIC_LABELS, regime);

/** Takes any string: a known key maps to its label, anything else passes through. */
export const getRegimePublicLabel = (regime: string) =>
  isRegimeKey(regime) ? REGIME_PUBLIC_LABELS[regime] : regime;

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
    // Violet across the board, matching REGIME_HEX_COLORS. The marker was
    // already indigo while the badge and panel were sky, so one regime drew
    // in two hues — and sky is the action accent, so a Stormy badge read as
    // a button.
    marker: "bg-violet-400",
    badge: "border-violet-400/60 bg-violet-400/15 text-violet-100",
    accent: {
      panel: "from-violet-500/20 via-violet-400/10 to-transparent border-violet-400/40",
      dot: "bg-violet-400",
      text: "text-violet-200",
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

/**
 * Which way the week moved. `"unavailable"` is a fifth case rather than a
 * synonym for `"stable"`: it means no previous reading was compared, which is
 * what a degraded read and a freshly built snapshot both have.
 */
export type RegimeMomentum = "improving" | "deteriorating" | "mixed" | "stable" | "unavailable";
type RegimeStageLabel = "Early" | "Mid" | "Late";
export type RegimeConfidenceLabel = "LOW" | "MED" | "HIGH";

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
  // The label is the weather name, full stop. This used to return "Contraction",
  // "Transitional Mixed" and "Guarded Expansion" — a third vocabulary for a state
  // the hero already called Cloudy, Stormy or Sunny. The modifier survives as data
  // for callers that want to qualify the name; the regime's stage (Early/Mid/Late,
  // Fragile) already carries what "guarded" used to say on screen.
  if (regime === "VOLATILE") {
    return {
      canonicalRegime: regime,
      modifier: "Transitional" as const,
      label: REGIME_WEATHER_LABELS[regime],
    };
  }

  if (regime === "DEFENSIVE" || regime === "SCARCITY") {
    return {
      canonicalRegime: regime,
      modifier: null,
      label: REGIME_WEATHER_LABELS[regime],
    };
  }

  /* An unknown direction qualifies the expansion for the same reason a mixed one
     does: the modifier says "do not read this as a clean run", and not having
     looked is not evidence that it is one. */
  const guardedExpansion =
    transitionWatch ||
    confidence === "LOW" ||
    momentum === "deteriorating" ||
    momentum === "mixed" ||
    momentum === "unavailable";

  return {
    canonicalRegime: regime,
    modifier: guardedExpansion ? ("Guarded" as const) : null,
    label: REGIME_WEATHER_LABELS[regime],
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
  } else if (momentum === "stable" || momentum === "mixed" || momentum === "unavailable") {
    /* Distance to the boundary is known without a previous reading, so an
       unknown direction still gets the proximity rung. */
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
