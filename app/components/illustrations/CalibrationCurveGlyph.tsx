import type { SVGProps } from "react";

type CalibrationCurveGlyphProps = SVGProps<SVGSVGElement> & {
  size?: number;
  className?: string;
};

/**
 * Compact SVG empirical calibration curve and boundary distance histogram.
 * Represents empirical validation of confidence models against historical outcomes.
 */
export function CalibrationCurveGlyph({
  size = 56,
  className = "",
  ...props
}: CalibrationCurveGlyphProps) {
  return (
    <svg
      viewBox="0 0 56 56"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Empirical calibration distribution"
      {...props}
    >
      <title>Empirical Calibration Distribution</title>
      <desc>How often conditions held, by how far the scores sat from the line where conditions change</desc>

      {/* Outer frame */}
      <rect
        x="3"
        y="3"
        width="50"
        height="50"
        rx="8"
        stroke="var(--border-default)"
        strokeWidth="1.2"
        fill="rgba(15, 23, 42, 0.45)"
      />

      {/* Coordinate axes */}
      <line x1="8" y1="46" x2="48" y2="46" stroke="var(--border-subtle)" strokeWidth="1" />
      <line x1="8" y1="10" x2="8" y2="46" stroke="var(--border-subtle)" strokeWidth="1" />

      {/* Ideal calibration diagonal line (reference) */}
      <line
        x1="8"
        y1="46"
        x2="48"
        y2="12"
        stroke="var(--border-strong)"
        strokeWidth="1.2"
        strokeDasharray="3 2"
      />

      {/* Empirical observed curve */}
      <path
        d="M8 44 C 18 42, 24 30, 34 20 C 40 14, 44 11, 48 10"
        stroke="var(--accent-info)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Measured data points */}
      <circle cx="16" cy="41" r="2.5" fill="var(--accent-info)" />
      <circle cx="26" cy="28" r="2.5" fill="var(--accent-info)" />
      <circle cx="36" cy="18" r="2.5" fill="var(--accent-info)" />
      <circle cx="46" cy="11" r="2.5" fill="var(--accent-info)" />
    </svg>
  );
}
