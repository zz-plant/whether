import type { SVGProps } from "react";

type TierGlyphProps = SVGProps<SVGSVGElement> & {
  size?: number;
  className?: string;
};

/**
 * Open Core / Free tier emblem: Public Brief, API, and MCP access.
 */
export function FreeTierGlyph({ size = 32, className = "", ...props }: TierGlyphProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Free tier open brief and API emblem"
      {...props}
    >
      <circle cx="16" cy="16" r="14" stroke="var(--accent-info)" strokeWidth="1.5" strokeOpacity="0.6" />
      {/* Open book / terminal brackets */}
      <path
        d="M11 12L8 16L11 20M21 12L24 16L21 20"
        stroke="var(--accent-info)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="17.5" y1="11" x2="14.5" y2="21" stroke="var(--app-text)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Pro tier emblem: Real-time regime alert triggers and Board PPTX exports.
 */
export function ProTierGlyph({ size = 32, className = "", ...props }: TierGlyphProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Pro tier alerts and executive export emblem"
      {...props}
    >
      <rect x="3" y="5" width="26" height="22" rx="4" stroke="var(--accent-warning)" strokeWidth="1.5" strokeOpacity="0.7" />
      {/* Board presentation chart */}
      <path d="M8 20L13 15L18 18L24 11" stroke="var(--accent-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="11" r="2" fill="var(--accent-warning)" />
      {/* Instant bell alert pip */}
      <circle cx="25" cy="5" r="3" fill="var(--accent-danger)" />
    </svg>
  );
}

/**
 * Team tier emblem: Multi-seat organizational operating ritual.
 */
export function TeamTierGlyph({ size = 32, className = "", ...props }: TierGlyphProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Team tier organizational ritual emblem"
      {...props}
    >
      <circle cx="16" cy="16" r="14" stroke="var(--accent-success)" strokeWidth="1.5" strokeOpacity="0.7" />
      {/* Multi-seat users / synchronous alignment */}
      <circle cx="16" cy="12" r="3.5" stroke="var(--app-text)" strokeWidth="1.5" />
      <path d="M10 23C10 19.5 12.5 18 16 18C19.5 18 22 19.5 22 23" stroke="var(--app-text)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Orbiting nodes */}
      <circle cx="7" cy="15" r="2" fill="var(--accent-success)" />
      <circle cx="25" cy="15" r="2" fill="var(--accent-success)" />
    </svg>
  );
}
