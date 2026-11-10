/**
 * The palette for every surface that cannot read the CSS tokens: the generated
 * images (/api/og, /api/image/brief), the meeting slide, the board deck and the
 * emails. Mirrors the dark theme in app/styles/tokens.css: Covenant's night
 * ground (2026-11-10, docs/design/rebuild-covenant.md). The site's default is
 * the light theme now; these formats are still drawn dark.
 *
 * Colour means one of two things here, as on the site. A condition takes its
 * fill from REGIME_HEX_COLORS (lib/regimePhaseSpace.ts); a line takes its state,
 * the front red when crossed or close and the ink when clear. Labels, links and
 * actions are the ink.
 */
import type { RegimeKey } from "../types";

export const OG_BG = "#0c1511";
export const OG_PANEL = "#111b16";
export const OG_BORDER = "rgba(230, 236, 226, 0.13)";
export const OG_BORDER_STRONG = "rgba(230, 236, 226, 0.20)";
/** OG_BORDER_STRONG as a solid colour on the panel, for formats that take no alpha (the slide, the deck). */
export const OG_RULE = "#3c453f";
export const OG_TEXT = "#e6ece2";
export const OG_TEXT_SECONDARY = "#c5d0c7";
export const OG_TEXT_MUTED = "#a3b2a9";
/** The action colour, which is the ink: a card's motif and eyebrow when it names no condition. */
export const OG_ACCENT = OG_TEXT;
/** A pause line crossed or close: the front red as text, as a mark, and as a box's fill. */
export const OG_LINE_CROSSED = "#f0666a";
export const OG_LINE_CROSSED_MARK = "#e5484d";
export const OG_LINE_CROSSED_BG = "#2a1719";

/**
 * Each condition as text on this ground: the dark theme's condition inks in
 * tokens.css (--color-condition-*-ink), which clear 8.9:1 on the panel. The
 * fill (REGIME_HEX_COLORS) is for rules, borders and bars; Frost's fill is
 * 3.5:1 here, legible as a 26px stamp but not as a sentence.
 */
export const OG_CONDITION_INK: Record<RegimeKey, string> = {
  EXPANSION: "#f0c95a",
  DEFENSIVE: "#dba463",
  VOLATILE: "#b9c1ff",
  SCARCITY: "#93b2f5",
};
