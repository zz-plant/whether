import type { SVGProps } from "react";

type ToolkitPlaybookGlyphProps = SVGProps<SVGSVGElement> & {
  size?: number;
  className?: string;
};

/**
 * Compact SVG toolkit playbook mechanism glyph.
 * Represents bounded operating sequence, checklist execution, and decision artifact generation.
 */
export function ToolkitPlaybookGlyph({
  size = 48,
  className = "",
  ...props
}: ToolkitPlaybookGlyphProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Toolkit playbook mechanism"
      {...props}
    >
      <title>Toolkit Playbook Mechanism</title>
      <desc>Structured execution sequence: checklist, phase triggers, and decision output</desc>

      {/* Playbook binder card */}
      <rect
        x="6"
        y="6"
        width="36"
        height="36"
        rx="6"
        stroke="var(--accent-info)"
        strokeWidth="1.5"
        fill="rgba(56, 189, 248, 0.08)"
      />

      {/* Step checkmarks / sequence rungs */}
      <circle cx="14" cy="16" r="3" fill="rgba(16, 185, 129, 0.25)" stroke="var(--accent-success)" strokeWidth="1.2" />
      <path d="M12.5 16L13.5 17L15.5 15" stroke="var(--accent-success)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="21" y1="16" x2="36" y2="16" stroke="var(--border-strong)" strokeWidth="1.5" strokeLinecap="round" />

      <circle cx="14" cy="24" r="3" fill="rgba(56, 189, 248, 0.25)" stroke="var(--accent-info)" strokeWidth="1.2" />
      <path d="M12.5 24L13.5 25L15.5 23" stroke="var(--accent-info)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="21" y1="24" x2="33" y2="24" stroke="var(--border-strong)" strokeWidth="1.5" strokeLinecap="round" />

      <circle cx="14" cy="32" r="3" fill="rgba(245, 158, 11, 0.25)" stroke="var(--accent-warning)" strokeWidth="1.2" />
      <line x1="21" y1="32" x2="30" y2="32" stroke="var(--border-strong)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
