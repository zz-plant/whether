import type { CSSProperties } from "react";
import { REGIME_HEX_COLORS } from "./regimePhaseSpace";
import type { RegimeKey } from "./types";

/** What eyebrows and section rules fall back to with no regime: a neutral grey, as in tokens.css. */
const NEUTRAL_ACCENT = "#939c9a";

const isRegimeKey = (value: string): value is RegimeKey => value in REGIME_HEX_COLORS;

/**
 * The week's regime as one CSS custom property on the page shell.
 *
 * Every page carried the regime only in the hero glow and the timeline; the
 * section eyebrows, section rules and the mobile outline all drew in the same
 * slate and sky whatever the week said. `--regime-accent` lets those tokens
 * read "this week is Sunny" without a new component: the condition's fill
 * from `REGIME_HEX_COLORS`, a neutral grey when no regime is known.
 */
type RegimeAccentStyle = CSSProperties & { "--regime-accent": string };

export const regimeAccentStyle = (regime?: string | null): RegimeAccentStyle => {
  const key = (regime ?? "").toUpperCase();
  const accent = isRegimeKey(key) ? REGIME_HEX_COLORS[key] : NEUTRAL_ACCENT;
  const style: RegimeAccentStyle = { "--regime-accent": accent };
  return style;
};

/**
 * The same regime as a `data-regime` value, which is what tokens.css keys
 * `--regime-ink` on — the accent as text, at the level each theme needs.
 * `--regime-accent` above is the 500-level hue and is fine for rules and
 * tints; as 12px text on the light ground it sits near 3:1, so anything that
 * prints in the regime's colour reads `--regime-ink` instead. Undefined for
 * an unknown regime, so the attribute is absent and the neutral defaults hold.
 */
export const regimeDataAttribute = (regime?: string | null): RegimeKey | undefined => {
  const key = (regime ?? "").toUpperCase();
  return isRegimeKey(key) ? key : undefined;
};
