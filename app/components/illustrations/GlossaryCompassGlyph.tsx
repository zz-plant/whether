import type { SVGProps } from "react";

type GlossaryCompassGlyphProps = SVGProps<SVGSVGElement> & {
  size?: number;
  className?: string;
};

/**
 * Compact SVG lexicon / terminology compass emblem for the macro glossary.
 * Represents definitions, operational translations, and cross-surface usage.
 */
export function GlossaryCompassGlyph({
  size = 56,
  className = "",
  ...props
}: GlossaryCompassGlyphProps) {
  return (
    <svg
      viewBox="0 0 56 56"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Glossary terminology compass"
      {...props}
    >
      <title>Glossary Terminology Compass</title>
      <desc>Operator reference lexicon and decision vocabulary guide</desc>

      {/* Outer subtle shield */}
      <circle
        cx="28"
        cy="28"
        r="24"
        stroke="var(--border-default)"
        strokeWidth="1.2"
        fill="rgba(15, 23, 42, 0.4)"
      />

      {/* Inner dial */}
      <circle
        cx="28"
        cy="28"
        r="18"
        stroke="var(--border-strong)"
        strokeWidth="1.2"
        strokeDasharray="2 2"
      />

      {/* Book / Lexicon leaf */}
      <path
        d="M20 36V18C20 18 23 16 28 18C33 16 36 18 36 18V36C36 36 33 34 28 36C23 34 20 36 20 36Z"
        fill="rgba(56, 189, 248, 0.12)"
        stroke="var(--accent-info)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <line x1="28" y1="18" x2="28" y2="36" stroke="var(--accent-info)" strokeWidth="1.5" />

      {/* Compass cardinal ticks */}
      <circle cx="28" cy="7" r="1.5" fill="var(--accent-warning)" />
      <circle cx="49" cy="28" r="1.5" fill="var(--border-strong)" />
      <circle cx="28" cy="49" r="1.5" fill="var(--border-strong)" />
      <circle cx="7" cy="28" r="1.5" fill="var(--border-strong)" />
    </svg>
  );
}
