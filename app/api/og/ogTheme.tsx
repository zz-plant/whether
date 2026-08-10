import type { ReactElement } from "react";

/**
 * Shared visual identity for the OG image templates.
 *
 * The share card is the product artifact most people see first (Slack unfurl,
 * link preview), so it renders with the site's own faces and surfaces rather
 * than generic system type. Fonts load via loadOgFonts in ogFonts.ts; the
 * family names here must match the names registered there.
 */
export const OG_FONT_DISPLAY = "Fraunces";
export const OG_FONT_BODY = "IBM Plex Sans";

/** Mirrors --bg-body / --bg-panel / border tokens in app/styles/tokens.css. */
export const OG_BG = "#08090b";
export const OG_PANEL = "#111316";
export const OG_RAISED = "#1a1d22";
export const OG_BORDER = "rgba(226, 232, 240, 0.10)";
export const OG_BORDER_STRONG = "rgba(226, 232, 240, 0.16)";
export const OG_TEXT = "#f4f7fb";
export const OG_TEXT_SECONDARY = "#cbd5e1";
export const OG_TEXT_MUTED = "#94a3b8";

/**
 * The regime glyph language from app/components/illustrations/RegimeGlyph.tsx
 * as a compact mark: a horizon line with rising strokes, tinted by posture.
 * Sits beside the wordmark/eyebrow so every share card carries the signature.
 */
export const GlyphMotif = ({
  tone,
  size = 36,
}: {
  tone: string;
  size?: number;
}): ReactElement => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <line x1={4} y1={26} x2={28} y2={26} stroke={OG_BORDER_STRONG} strokeWidth={2.4} strokeLinecap="round" />
    <line x1={6} y1={22} x2={11} y2={16} stroke={tone} strokeWidth={2.4} strokeLinecap="round" />
    <line x1={13} y1={19} x2={18} y2={12} stroke={tone} strokeWidth={2.4} strokeLinecap="round" />
    <line x1={20} y1={15} x2={25} y2={7} stroke={tone} strokeWidth={2.4} strokeLinecap="round" />
  </svg>
);
