import type { SVGProps } from "react";

type BarometerProps = SVGProps<SVGSVGElement> & {
  direction?: "tighten" | "ease" | "hold";
  size?: number;
  className?: string;
};

/**
 * Directional vector barometer indicating whether market conditions are tightening, easing, or holding steady.
 */
export function MarketVectorBarometer({
  direction = "hold",
  size = 28,
  className = "",
  ...props
}: BarometerProps) {
  const isTighten = direction === "tighten";
  const isEase = direction === "ease";
  const strokeColor = isTighten
    ? "var(--accent-danger)"
    : isEase
      ? "var(--accent-success)"
      : "var(--accent-info)";

  // Needle angle: -45 deg for tighten (up-right or caution), 45 deg for ease, 0 deg for hold
  const needlePath = isTighten
    ? "M14 14L21 8"
    : isEase
      ? "M14 14L21 20"
      : "M14 14L22 14";

  return (
    <svg
      viewBox="0 0 28 28"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label={`Market condition barometer: ${direction}`}
      {...props}
    >
      <title>Market Condition Barometer</title>
      <circle cx="14" cy="14" r="11" stroke="var(--border-strong)" strokeWidth="1.5" />
      {/* Gauge ticks */}
      <line x1="14" y1="5" x2="14" y2="7" stroke="var(--app-text-muted)" strokeWidth="1.2" />
      <line x1="23" y1="14" x2="21" y2="14" stroke="var(--app-text-muted)" strokeWidth="1.2" />
      <line x1="14" y1="23" x2="14" y2="21" stroke="var(--app-text-muted)" strokeWidth="1.2" />
      <line x1="5" y1="14" x2="7" y2="14" stroke="var(--app-text-muted)" strokeWidth="1.2" />

      {/* Needle */}
      <path d={needlePath} stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
      <circle cx="14" cy="14" r="2.5" fill="var(--bg-panel)" stroke={strokeColor} strokeWidth="1.5" />
    </svg>
  );
}

type PressureGaugeProps = SVGProps<SVGSVGElement> & {
  intensity?: "high" | "mid" | "low";
  size?: number;
  className?: string;
};

/**
 * Visual gauge showing the dominant pressure intensity driving the macro shift.
 */
export function PressureDriverGauge({
  intensity = "high",
  size = 28,
  className = "",
  ...props
}: PressureGaugeProps) {
  const color =
    intensity === "high"
      ? "var(--accent-danger)"
      : intensity === "mid"
        ? "var(--accent-warning)"
        : "var(--accent-info)";

  return (
    <svg
      viewBox="0 0 28 28"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label={`Pressure driver gauge: ${intensity}`}
      {...props}
    >
      <title>Pressure Driver Gauge</title>
      {/* Arc background */}
      <path
        d="M6 19A10 10 0 1 1 22 19"
        stroke="var(--border-strong)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Dynamic pressure fill */}
      <path
        d="M6 19A10 10 0 0 1 14 4"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Indicator needle */}
      <line x1="14" y1="14" x2="18" y2="9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="14" cy="14" r="2" fill="var(--bg-panel)" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

type GateGlyphProps = SVGProps<SVGSVGElement> & {
  size?: number;
  className?: string;
};

/**
 * Trip-wire gate glyph showing the boundary threshold that triggers a posture flip or reversal.
 */
export function ThresholdGateGlyph({
  size = 28,
  className = "",
  ...props
}: GateGlyphProps) {
  return (
    <svg
      viewBox="0 0 28 28"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Threshold trip-wire gate"
      {...props}
    >
      <title>Threshold Trip-Wire Gate</title>
      {/* Left post (current corridor) */}
      <line x1="7" y1="6" x2="7" y2="22" stroke="var(--border-strong)" strokeWidth="2" strokeLinecap="round" />
      {/* Right post (reversal boundary) */}
      <line x1="21" y1="6" x2="21" y2="22" stroke="var(--accent-warning)" strokeWidth="2" strokeLinecap="round" />
      {/* Trip-wire laser/cord */}
      <line
        x1="7"
        y1="14"
        x2="21"
        y2="14"
        stroke="var(--accent-danger)"
        strokeWidth="1.8"
        strokeDasharray="2.5 2"
        strokeLinecap="round"
      />
      {/* Trigger node on wire */}
      <circle cx="14" cy="14" r="3" fill="var(--bg-panel)" stroke="var(--accent-danger)" strokeWidth="1.5" />
      <circle cx="14" cy="14" r="1" fill="var(--accent-danger)" />
    </svg>
  );
}
