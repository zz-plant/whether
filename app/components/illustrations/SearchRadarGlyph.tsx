import type { SVGProps } from "react";

type SearchRadarGlyphProps = SVGProps<SVGSVGElement> & {
  size?: number;
  className?: string;
};

/**
 * Compact SVG cross-surface search radar glyph.
 * Represents intelligent routing across Evidence, Plan, Resolve, and Trust surfaces.
 */
export function SearchRadarGlyph({
  size = 48,
  className = "",
  ...props
}: SearchRadarGlyphProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Cross-surface search lens"
      {...props}
    >
      <title>Cross-Surface Search Lens</title>
      <desc>Intelligent search across evidence, operating rules, decisions, and trust</desc>

      {/* Outer framing disc */}
      <circle
        cx="21"
        cy="21"
        r="16"
        stroke="var(--accent-info)"
        strokeWidth="1.8"
        fill="rgba(56, 189, 248, 0.08)"
      />

      {/* Inner reticle */}
      <circle
        cx="21"
        cy="21"
        r="10"
        stroke="var(--border-strong)"
        strokeWidth="1.2"
        strokeDasharray="2 1.5"
      />

      {/* Crosshair ticks */}
      <line x1="21" y1="7" x2="21" y2="12" stroke="var(--accent-info)" strokeWidth="1.5" />
      <line x1="21" y1="30" x2="21" y2="35" stroke="var(--accent-info)" strokeWidth="1.5" />
      <line x1="7" y1="21" x2="12" y2="21" stroke="var(--accent-info)" strokeWidth="1.5" />
      <line x1="30" y1="21" x2="35" y2="21" stroke="var(--accent-info)" strokeWidth="1.5" />

      {/* Target focal point */}
      <circle cx="21" cy="21" r="2.5" fill="var(--accent-warning)" />

      {/* Magnifying handle */}
      <line
        x1="33"
        y1="33"
        x2="43"
        y2="43"
        stroke="var(--accent-info)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
