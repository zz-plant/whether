import type { SVGProps } from "react";

type GovernancePillarsGlyphProps = SVGProps<SVGSVGElement> & {
  size?: number;
  className?: string;
};

/**
 * Compact SVG governance emblem representing the three core pillars:
 * capital discipline, board posture, and reversibility as governance.
 */
export function GovernancePillarsGlyph({
  size = 48,
  className = "",
  ...props
}: GovernancePillarsGlyphProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Governance pillars emblem"
      {...props}
    >
      <title>Governance Pillars Emblem</title>
      <desc>Structural governance frameworks: capital discipline, board posture, and reversibility</desc>

      {/* Base plinth */}
      <rect x="6" y="38" width="36" height="4" rx="1" fill="var(--border-strong)" />

      {/* Pediment / Capital roof */}
      <polygon points="24,6 42,14 6,14" fill="rgba(56, 189, 248, 0.2)" stroke="var(--accent-info)" strokeWidth="1.5" />

      {/* Three structural pillars */}
      {/* Left pillar: Capital discipline */}
      <rect x="11" y="16" width="6" height="20" rx="1" fill="rgba(16, 185, 129, 0.25)" stroke="var(--accent-success)" strokeWidth="1.2" />
      {/* Center pillar: Board posture */}
      <rect x="21" y="16" width="6" height="20" rx="1" fill="rgba(56, 189, 248, 0.25)" stroke="var(--accent-info)" strokeWidth="1.2" />
      {/* Right pillar: Reversibility */}
      <rect x="31" y="16" width="6" height="20" rx="1" fill="rgba(245, 158, 11, 0.25)" stroke="var(--accent-warning)" strokeWidth="1.2" />
    </svg>
  );
}
