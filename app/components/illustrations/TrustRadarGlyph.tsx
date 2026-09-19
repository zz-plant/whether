import type { SVGProps } from "react";

type TrustRadarGlyphProps = SVGProps<SVGSVGElement> & {
  tone?: "stable" | "warning" | "historical";
  size?: number;
  className?: string;
};

/**
 * Compact SVG radar / verification emblem for data readiness and trust status.
 * Represents multi-factor provenance verification (Treasury, FRED feeds, degraded sources, model confidence).
 */
export function TrustRadarGlyph({
  tone = "stable",
  size = 48,
  className = "",
  ...props
}: TrustRadarGlyphProps) {
  const accentColor =
    tone === "stable"
      ? "var(--accent-success)"
      : tone === "warning"
        ? "var(--accent-warning)"
        : "var(--accent-info)";

  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label={`Trust verification status: ${tone}`}
      {...props}
    >
      <title>Trust Verification Status</title>
      <desc>{`Data integrity indicator: ${tone}`}</desc>

      {/* Outer Radar Rings */}
      <circle
        cx="24"
        cy="24"
        r="20"
        stroke="var(--border-default)"
        strokeWidth="1.5"
        strokeDasharray="3 2"
      />
      <circle
        cx="24"
        cy="24"
        r="14"
        stroke="var(--border-strong)"
        strokeWidth="1.5"
      />

      {/* Radar sweep / sector glow */}
      <path
        d="M24 24L38 10A20 20 0 0 0 24 4Z"
        fill={accentColor}
        fillOpacity="0.15"
      />

      {/* Crosshairs */}
      <line x1="24" y1="4" x2="24" y2="44" stroke="var(--border-default)" strokeWidth="1" />
      <line x1="4" y1="24" x2="44" y2="24" stroke="var(--border-default)" strokeWidth="1" />

      {/* Verified Nodes */}
      <circle cx="24" cy="10" r="2.5" fill={accentColor} />
      <circle cx="34" cy="24" r="2" fill={accentColor} fillOpacity="0.75" />
      <circle cx="24" cy="34" r="2" fill={accentColor} fillOpacity="0.75" />
      <circle cx="14" cy="24" r="2" fill={accentColor} fillOpacity="0.75" />

      {/* Center Target Core */}
      <circle cx="24" cy="24" r="4" fill="var(--bg-panel)" stroke={accentColor} strokeWidth="2" />
      <circle cx="24" cy="24" r="1.5" fill={accentColor} />
    </svg>
  );
}
