import type { SVGProps } from "react";

type ValuationMultiplesGlyphProps = SVGProps<SVGSVGElement> & {
  size?: number;
  className?: string;
};

/**
 * Compact SVG multiple distribution gauge for public SaaS basket comparables.
 * Represents enterprise value to revenue multiple bands and market median marker.
 */
export function ValuationMultiplesGlyph({
  size = 48,
  className = "",
  ...props
}: ValuationMultiplesGlyphProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Valuation multiples distribution"
      {...props}
    >
      <title>Valuation Multiples Distribution</title>
      <desc>Public SaaS EV/Revenue multiples distribution and median marker</desc>

      {/* Background container frame */}
      <rect
        x="3"
        y="6"
        width="42"
        height="36"
        rx="6"
        stroke="var(--border-default)"
        strokeWidth="1.2"
        fill="rgba(15, 23, 42, 0.4)"
      />

      {/* Grid baseline */}
      <line x1="6" y1="36" x2="42" y2="36" stroke="var(--border-subtle)" strokeWidth="1" />

      {/* Distribution bars */}
      <rect x="8" y="28" width="4" height="8" rx="1" fill="rgba(56, 189, 248, 0.25)" />
      <rect x="14" y="22" width="4" height="14" rx="1" fill="rgba(56, 189, 248, 0.4)" />
      <rect x="20" y="14" width="4" height="22" rx="1" fill="rgba(56, 189, 248, 0.7)" />
      <rect x="26" y="18" width="4" height="18" rx="1" fill="rgba(56, 189, 248, 0.55)" />
      <rect x="32" y="24" width="4" height="12" rx="1" fill="rgba(56, 189, 248, 0.35)" />
      <rect x="38" y="30" width="4" height="6" rx="1" fill="rgba(56, 189, 248, 0.2)" />

      {/* Median indicator line */}
      <line
        x1="22"
        y1="9"
        x2="22"
        y2="37"
        stroke="var(--accent-warning)"
        strokeWidth="1.8"
        strokeDasharray="2 1.5"
      />

      {/* Median diamond pin */}
      <polygon
        points="22,7 24.5,10 22,13 19.5,10"
        fill="var(--accent-warning)"
      />
    </svg>
  );
}
