/**
 * Shared surface and text palette for every generated image (/api/og, /api/image/brief).
 * Mirrors --bg-body / --bg-panel / border tokens in app/styles/tokens.css. Semantic
 * colours (easing / tightening / caution) are deliberately not here: they mean the
 * same thing on both routes and are chosen per mark.
 */
export const OG_BG = "#08090b";
export const OG_PANEL = "#111316";
export const OG_RAISED = "#1a1d22";
export const OG_BORDER = "rgba(226, 232, 240, 0.10)";
export const OG_BORDER_STRONG = "rgba(226, 232, 240, 0.16)";
export const OG_TEXT = "#f4f7fb";
export const OG_TEXT_SECONDARY = "#cbd5e1";
export const OG_TEXT_MUTED = "#94a3b8";
export const OG_ACCENT = "#7cc4f0";
