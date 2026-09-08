import type { CSSProperties } from "react";
import { REGIME_HEX_COLORS } from "./regimePhaseSpace";
import type { RegimeKey } from "./types";

/** What eyebrows and section rules fall back to with no regime: slate-400. */
const NEUTRAL_ACCENT = "#94a3b8";

const isRegimeKey = (value: string): value is RegimeKey => value in REGIME_HEX_COLORS;

/**
 * The week's regime as one CSS custom property on the page shell.
 *
 * Every page carried the regime only in the hero glow and the timeline; the
 * section eyebrows, section rules and the mobile outline all drew in the same
 * slate and sky whatever the week said. `--regime-accent` lets those tokens
 * read "this week is Sunny" without a new component: emerald, rose, amber or
 * sky from `REGIME_HEX_COLORS`, slate when no regime is known.
 */
type RegimeAccentStyle = CSSProperties & { "--regime-accent": string };

export const regimeAccentStyle = (regime?: string | null): RegimeAccentStyle => {
  const key = (regime ?? "").toUpperCase();
  const accent = isRegimeKey(key) ? REGIME_HEX_COLORS[key] : NEUTRAL_ACCENT;
  const style: RegimeAccentStyle = { "--regime-accent": accent };
  return style;
};
