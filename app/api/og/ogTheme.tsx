import type { ReactElement } from "react";

/**
 * Shared visual identity for the OG image templates.
 *
 * The share card is the product artifact most people see first (Slack unfurl,
 * link preview), so it renders with the site's own faces and surfaces rather
 * than generic system type. Fonts and their family names both come from
 * lib/image/ogFonts.ts, which every generated image route shares.
 */
export { OG_FONT_BODY, OG_FONT_DISPLAY } from "../../../lib/image/ogFonts";

export {
  OG_BG, OG_PANEL, OG_RAISED, OG_BORDER, OG_BORDER_STRONG, OG_TEXT, OG_TEXT_SECONDARY, OG_TEXT_MUTED, OG_ACCENT,
} from "../../../lib/image/ogTheme";
import { OG_BORDER_STRONG } from "../../../lib/image/ogTheme";

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
