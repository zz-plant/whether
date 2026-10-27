/**
 * The week's conditions as a status badge: a small SVG for a README, a Notion
 * page, a data room, or an investor update, in the shape those places already
 * show build and coverage badges in. It names the conditions in their weather
 * word and links back to the brief, so every page that carries it shows where
 * the word came from.
 *
 * A saved copy says so on the badge itself: a badge is read where the brief's
 * own notices are not.
 */
import { REGIME_HEX_COLORS } from "../regimePhaseSpace";
import type { RegimeKey } from "../types";
import { escapeXml } from "../seo";

const LABEL = "startup conditions";
const LABEL_FILL = "#2b3133";
const HEIGHT = 20;
const PADDING = 6;
/* Verdana 11px averages about 6.5px a character; badges are sized from it, as shields are. */
const CHAR_WIDTH = 6.5;

const textWidth = (text: string) => Math.round(text.length * CHAR_WIDTH) + PADDING * 2;

const DARK_INK = "#111517";
const LIGHT_INK = "#ffffff";

/* WCAG relative luminance (§1.4.3), for picking the ink with more contrast. */
const luminance = (hex: string) => {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((index) => {
    const channel = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
};

/* Whichever ink reads better on the fill: dark on Sunny's gold, white on Freezing's blue. */
const inkFor = (fill: string) => (contrast(fill, DARK_INK) >= contrast(fill, LIGHT_INK) ? DARK_INK : LIGHT_INK);

export const renderStatusBadge = ({
  regime,
  conditions,
  savedCopy,
}: {
  regime: RegimeKey;
  conditions: string;
  savedCopy: boolean;
}): string => {
  const value = savedCopy ? `${conditions} (saved copy)` : conditions;
  const labelWidth = textWidth(LABEL);
  const valueWidth = textWidth(value);
  const width = labelWidth + valueWidth;
  const fill = REGIME_HEX_COLORS[regime];
  const title = `Startup operating conditions this week: ${value}. Whether weekly guidance.`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${HEIGHT}" role="img" aria-label="${escapeXml(title)}">
<title>${escapeXml(title)}</title>
<clipPath id="r"><rect width="${width}" height="${HEIGHT}" rx="3"/></clipPath>
<g clip-path="url(#r)">
<rect width="${labelWidth}" height="${HEIGHT}" fill="${LABEL_FILL}"/>
<rect x="${labelWidth}" width="${valueWidth}" height="${HEIGHT}" fill="${fill}"/>
</g>
<g font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle">
<text x="${labelWidth / 2}" y="14" fill="#ffffff">${LABEL}</text>
<text x="${labelWidth + valueWidth / 2}" y="14" fill="${inkFor(fill)}" font-weight="bold">${escapeXml(value)}</text>
</g>
</svg>`;
};
