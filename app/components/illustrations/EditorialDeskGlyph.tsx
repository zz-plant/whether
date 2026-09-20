import type { SVGProps } from "react";

type EditorialDeskGlyphProps = SVGProps<SVGSVGElement> & {
  size?: number;
  className?: string;
};

/**
 * Compact SVG editorial stamp / publisher contact emblem.
 * Represents publisher accountability, correction policy, and direct inquiries.
 */
export function EditorialDeskGlyph({
  size = 48,
  className = "",
  ...props
}: EditorialDeskGlyphProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Editorial publisher seal"
      {...props}
    >
      <title>Editorial Publisher Seal</title>
      <desc>Verified publisher accountability, correction tracking, and editorial channel</desc>

      {/* Octagonal seal boundary */}
      <polygon
        points="14,4 34,4 44,14 44,34 34,44 14,44 4,34 4,14"
        stroke="var(--accent-info)"
        strokeWidth="1.5"
        fill="rgba(56, 189, 248, 0.08)"
      />

      {/* Inner concentric ring */}
      <circle
        cx="24"
        cy="24"
        r="14"
        stroke="var(--border-strong)"
        strokeWidth="1"
        strokeDasharray="2 1.5"
      />

      {/* Quill / Pen nib */}
      <path
        d="M24 12L28 20L25 32L24 35L23 32L20 20Z"
        fill="rgba(56, 189, 248, 0.2)"
        stroke="var(--accent-info)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="22" r="1.5" fill="var(--accent-warning)" />
    </svg>
  );
}
