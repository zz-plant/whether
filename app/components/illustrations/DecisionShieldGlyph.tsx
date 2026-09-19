import type { SVGProps } from "react";

type DecisionShieldGlyphProps = SVGProps<SVGSVGElement> & {
  size?: number;
  className?: string;
};

/**
 * Visualizes cryptographic local decision integrity:
 * Local-only browser storage, SHA-256 hash-chaining, and tamper-evident delegation records.
 */
export function DecisionShieldGlyph({
  size = 64,
  className = "",
  ...props
}: DecisionShieldGlyphProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Tamper-evident decision ledger shield"
      {...props}
    >
      <title>Decision Ledger Integrity</title>
      <desc>Cryptographically hashed, local browser decision ledger</desc>

      <defs>
        <linearGradient id="shieldGrad" x1="10" y1="6" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--accent-info)" stopOpacity="0.25" />
          <stop offset="1" stopColor="var(--accent-success)" stopOpacity="0.15" />
        </linearGradient>
      </defs>

      {/* Shield Outline */}
      <path
        d="M32 6L14 14V28C14 42.5 21.8 52.8 32 58C42.2 52.8 50 42.5 50 28V14L32 6Z"
        fill="url(#shieldGrad)"
        stroke="var(--accent-info)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Inner Chain / Ledger Lock Symbol */}
      <circle
        cx="32"
        cy="26"
        r="6"
        stroke="var(--app-text)"
        strokeWidth="2"
        fill="var(--bg-panel)"
      />
      <path
        d="M28 26V23C28 20.8 29.8 19 32 19C34.2 19 36 20.8 36 23V26"
        stroke="var(--app-text-muted)"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="32" cy="26" r="1.5" fill="var(--accent-info)" />

      {/* Hash-chain links at bottom of shield */}
      <path
        d="M24 38L32 43L40 38"
        stroke="var(--accent-success)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="38" r="2" fill="var(--accent-success)" />
      <circle cx="32" cy="43" r="2" fill="var(--accent-success)" />
      <circle cx="40" cy="38" r="2" fill="var(--accent-success)" />

      {/* Subtle integrity tick */}
      <path
        d="M28 49L31 52L36 47"
        stroke="var(--app-text)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
