/**
 * The palette for every surface that cannot read the CSS tokens: the generated
 * images (/api/og, /api/image/brief), the meeting slide, the board deck and the
 * emails. Mirrors the dark theme in app/styles/tokens.css: Forecast's night
 * slate (2026-11-12, .impeccable/surfaces/app-page-tsx.md), which replaced
 * Covenant's green-black. The site's default is the light theme; these formats
 * are still drawn dark, and still set in Archivo (lib/image/ogFonts.ts).
 *
 * Colour means one of two things here, as on the site. A condition takes its
 * fill from REGIME_HEX_COLORS (lib/regimePhaseSpace.ts); a line takes its state,
 * the front red when crossed or close and the ink when clear. Labels, links and
 * actions are the ink.
 */
import type { RegimeKey } from "../types";

export const OG_BG = "#10141c";
export const OG_PANEL = "#161b26";
export const OG_BORDER = "rgba(232, 236, 244, 0.13)";
export const OG_BORDER_STRONG = "rgba(232, 236, 244, 0.20)";
/** OG_BORDER_STRONG as a solid colour on the panel, for formats that take no alpha (the slide, the deck). */
export const OG_RULE = "#40454f";
export const OG_TEXT = "#e8ecf4";
export const OG_TEXT_SECONDARY = "#b8c2d4";
export const OG_TEXT_MUTED = "#9aa8c0";
/** The action colour, which is the ink: a card's motif and eyebrow when it names no condition. */
export const OG_ACCENT = OG_TEXT;
/** A pause line crossed or close: the front red as text, as a mark, and as a box's fill. */
export const OG_LINE_CROSSED = "#f0666a";
export const OG_LINE_CROSSED_MARK = "#e5484d";
export const OG_LINE_CROSSED_BG = "#2a1719";

/**
 * Each condition as text on this ground: the dark theme's condition inks in
 * tokens.css (--color-condition-*-ink, Forecast since 2026-11-12), which clear
 * 8.2:1 on the panel. The fill (REGIME_HEX_COLORS) is for rules, borders and
 * bars; Stormy's fill is 2.5:1 here, legible as a 26px stamp but not as a
 * sentence. The ground and inks above are still Covenant's night: the cards
 * keep their own palette and Archivo until they are redrawn.
 */
export const OG_CONDITION_INK: Record<RegimeKey, string> = {
  EXPANSION: "#f0c95a",
  DEFENSIVE: "#a9bdd1",
  VOLATILE: "#aab4ec",
  SCARCITY: "#a3d6fa",
};
