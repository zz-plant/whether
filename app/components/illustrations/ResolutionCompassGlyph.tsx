import type { SVGProps } from "react";

type CompassProps = SVGProps<SVGSVGElement> & {
  size?: number;
  className?: string;
};

/**
 * Compass / seal emblem for authoritative direct operator decision resolution.
 */
export function ResolutionCompassGlyph({
  size = 40,
  className = "",
  ...props
}: CompassProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Direct decision resolution compass"
      {...props}
    >
      <title>Decision Resolution Compass</title>
      <circle cx="20" cy="20" r="18" stroke="var(--border-strong)" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="14" stroke="var(--accent-info)" strokeWidth="1.2" strokeDasharray="2.5 2" />

      {/* Compass Needle */}
      <polygon points="20,8 24,20 20,18" fill="var(--accent-info)" />
      <polygon points="20,32 24,20 20,18" fill="var(--app-text-muted)" />
      <polygon points="20,8 16,20 20,18" fill="var(--accent-info)" fillOpacity="0.8" />
      <polygon points="20,32 16,20 20,18" fill="var(--app-text-muted)" fillOpacity="0.8" />

      {/* Center pivot */}
      <circle cx="20" cy="20" r="2" fill="var(--bg-panel)" stroke="var(--app-text)" strokeWidth="1.5" />
    </svg>
  );
}
