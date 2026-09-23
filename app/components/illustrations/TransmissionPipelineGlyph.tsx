import type { SVGProps } from "react";

type TransmissionPipelineGlyphProps = SVGProps<SVGSVGElement> & {
  size?: number;
  className?: string;
};

/**
 * SVG transmission pipeline glyph illustrating the flow from macro posture to shareable artifacts
 * (Slack blocks, meeting slides, Linear/Jira guardrail tags, and calendar holds).
 */
export function TransmissionPipelineGlyph({
  size = 48,
  className = "",
  ...props
}: TransmissionPipelineGlyphProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Decision transmission pipeline"
      {...props}
    >
      <title>From public data to a shareable brief</title>
      <desc>Public U.S. market data becomes the weekly guidance, then a brief for Slack, email or a meeting</desc>

      {/* Central transmission hub */}
      <circle
        cx="24"
        cy="24"
        r="7"
        fill="rgba(56, 189, 248, 0.15)"
        stroke="var(--accent-info)"
        strokeWidth="1.8"
      />
      <circle cx="24" cy="24" r="2.5" fill="var(--accent-info)" />

      {/* Radiating channel pathways */}
      {/* Top right: Presentation / Slide */}
      <path
        d="M29 19L38 10"
        stroke="var(--accent-info)"
        strokeWidth="1.5"
        strokeDasharray="2 1.5"
      />
      <rect x="37" y="7" width="7" height="5" rx="1" stroke="var(--accent-info)" strokeWidth="1.2" fill="rgba(56, 189, 248, 0.2)" />

      {/* Bottom right: Slack / Messaging */}
      <path
        d="M29 29L38 38"
        stroke="var(--accent-success)"
        strokeWidth="1.5"
        strokeDasharray="2 1.5"
      />
      <circle cx="40" cy="40" r="3.5" stroke="var(--accent-success)" strokeWidth="1.2" fill="rgba(16, 185, 129, 0.2)" />

      {/* Top left: Executive Memo / Citation */}
      <path
        d="M19 19L10 10"
        stroke="var(--accent-warning)"
        strokeWidth="1.5"
        strokeDasharray="2 1.5"
      />
      <rect x="5" y="7" width="6" height="7" rx="1" stroke="var(--accent-warning)" strokeWidth="1.2" fill="rgba(245, 158, 11, 0.2)" />

      {/* Bottom left: Tracker / Guardrails */}
      <path
        d="M19 29L10 38"
        stroke="var(--border-strong)"
        strokeWidth="1.5"
        strokeDasharray="2 1.5"
      />
      <polygon points="10,35 14,41 6,41" stroke="var(--border-strong)" strokeWidth="1.2" fill="rgba(148, 163, 184, 0.2)" />
    </svg>
  );
}
