/**
 * The palette for every surface that cannot read the CSS tokens: the generated
 * images (/api/og, /api/image/brief), the meeting slide, the board deck and the
 * emails. Mirrors the dark theme in app/styles/tokens.css, which is the site's
 * default: Synoptic's night chart (2026-10-09, docs/design/palette-directions.md).
 *
 * Colour means one of two things here, as on the site. A condition takes its
 * fill from REGIME_HEX_COLORS (lib/regimePhaseSpace.ts); a line takes its state,
 * the front red when crossed or close and the ink when clear. Labels, links and
 * actions are the ink.
 */
import type { RegimeKey } from "../types";

export const OG_BG = "#0f1316";
export const OG_PANEL = "#171c20";
export const OG_BORDER = "rgba(237, 240, 238, 0.10)";
export const OG_BORDER_STRONG = "rgba(237, 240, 238, 0.16)";
/** OG_BORDER_STRONG as a solid colour on the panel, for formats that take no alpha (the slide, the deck). */
export const OG_RULE = "#393e41";
export const OG_TEXT = "#edf0ee";
export const OG_TEXT_SECONDARY = "#cdd3d1";
export const OG_TEXT_MUTED = "#a0a9a7";
/** The action colour, which is the ink: a card's motif and eyebrow when it names no condition. */
export const OG_ACCENT = OG_TEXT;
/** A pause line crossed or close: the front red as text, as a mark, and as a box's fill. */
export const OG_LINE_CROSSED = "#f2685c";
export const OG_LINE_CROSSED_MARK = "#e5484d";
export const OG_LINE_CROSSED_BG = "#2d1a1e";

/**
 * Each condition as text on this ground: the dark theme's condition inks in
 * tokens.css (--color-condition-*-ink), which clear 8.9:1 on the panel. The
 * fill (REGIME_HEX_COLORS) is for rules, borders and bars; Frost's fill is
 * 3.5:1 here, legible as a 26px stamp but not as a sentence.
 */
export const OG_CONDITION_INK: Record<RegimeKey, string> = {
  EXPANSION: "#f5cf5a",
  DEFENSIVE: "#d6b98a",
  VOLATILE: "#b9bfff",
  SCARCITY: "#8cc0ec",
};
