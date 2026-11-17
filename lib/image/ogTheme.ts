/**
 * The palette for every surface that cannot read the CSS tokens: the generated
 * images (/api/og, /api/image/brief), the meeting slide, the board deck and the
 * emails. Mirrors the dark theme in app/styles/tokens.css: Forecast's night
 * slate (2026-11-12, .impeccable/surfaces/app-page-tsx.md), which replaced
 * Covenant's green-black. The site's default is the light theme; these formats
 * are still drawn dark. They are set in the site's two voices (lib/image/ogFonts.ts).
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
 * bars; Stormy's fill is 2.4:1 here, legible as a 26px stamp but not as a
 * sentence.
 */
export const OG_CONDITION_INK: Record<RegimeKey, string> = {
  EXPANSION: "#f0c95a",
  DEFENSIVE: "#a9bdd1",
  VOLATILE: "#aab4ec",
  SCARCITY: "#a3d6fa",
};

/**
 * The homepage's sky on a card: the eight gradients and their inks, the same values as
 * `--regime-sky-top`, `--regime-sky`, `--regime-sky-ink` and `--regime-sky-muted` per
 * condition and theme in app/styles/tokens.css (tests/regimeColourContract.test.tsx holds
 * the two together). The weekly card and the brief card sit on it, so the picture that
 * leaves the site shows which weather it is before a word of it is read, as the first
 * screen does; their figures stand on a panel of paper (`OG_SKY_PAPER`).
 */
type OgSky = { top: string; base: string; ink: string; muted: string };

export const OG_SKY: Record<"dark" | "light", Record<RegimeKey, OgSky>> = {
  dark: {
    EXPANSION: { top: "#5a4310", base: "#3d2e0b", ink: "#f6e7c4", muted: "#d8c79c" },
    DEFENSIVE: { top: "#2b3a4c", base: "#1f2a37", ink: "#e3eaf2", muted: "#b4c2d2" },
    VOLATILE: { top: "#252e52", base: "#171d33", ink: "#e8ecf4", muted: "#b8c2dc" },
    SCARCITY: { top: "#1f4466", base: "#16324d", ink: "#e2f1ff", muted: "#a9cbe8" },
  },
  light: {
    EXPANSION: { top: "#f7c53a", base: "#e8a81c", ink: "#1a1408", muted: "#4a3c12" },
    DEFENSIVE: { top: "#a5b7c9", base: "#8a9fb6", ink: "#0f1419", muted: "#24313e" },
    VOLATILE: { top: "#34406b", base: "#232b4a", ink: "#eef1f6", muted: "#c3cbe0" },
    SCARCITY: { top: "#b5dcf5", base: "#8ac2ec", ink: "#0a1a3a", muted: "#1d3c66" },
  },
};

/**
 * The paper a card's figures stand on, and its inks: the panel, text and crossed-line
 * roles of each theme in tokens.css. A line state is printed on the paper, never on the
 * sky: the front red is under 4.5:1 on every day sky (2.4:1 at the foot of Cloudy's).
 */
export const OG_SKY_PAPER = {
  dark: { panel: OG_PANEL, border: OG_BORDER_STRONG, text: OG_TEXT, secondary: OG_TEXT_SECONDARY, muted: OG_TEXT_MUTED, crossed: OG_LINE_CROSSED },
  light: { panel: "#f8fafc", border: "rgba(15, 20, 25, 0.16)", text: "#0f1419", secondary: "#2a3442", muted: "#4a5568", crossed: "#b81f27" },
} as const;

/** A card's ground: the condition's sky, or the theme's plain ground for a reading that names none. */
export const ogSkyGround = (sky: OgSky | null, plain: string): string =>
  sky ? `linear-gradient(180deg, ${sky.top}, ${sky.base})` : plain;
