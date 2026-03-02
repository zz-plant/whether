import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

const iconBaseProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export const ArrowRightIcon = ({ className = "h-3.5 w-3.5", title, ...props }: IconProps) => (
  <svg {...iconBaseProps} className={className} {...props}>
    {title ? <title>{title}</title> : null}
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

export const ChevronDownIcon = ({ className = "h-4 w-4", title, ...props }: IconProps) => (
  <svg {...iconBaseProps} className={className} {...props}>
    {title ? <title>{title}</title> : null}
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const BoltIcon = ({ className = "h-3.5 w-3.5", title, ...props }: IconProps) => (
  <svg {...iconBaseProps} className={className} {...props}>
    {title ? <title>{title}</title> : null}
    <path d="M13 2 5 13h6l-1 9 8-11h-6z" />
  </svg>
);

export const CircleTargetIcon = ({ className = "h-3.5 w-3.5", title, ...props }: IconProps) => (
  <svg {...iconBaseProps} className={className} {...props}>
    {title ? <title>{title}</title> : null}
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const LayoutGridIcon = ({ className = "h-3.5 w-3.5", title, ...props }: IconProps) => (
  <svg {...iconBaseProps} className={className} {...props}>
    {title ? <title>{title}</title> : null}
    <rect x="4" y="4" width="7" height="7" rx="1" />
    <rect x="13" y="4" width="7" height="7" rx="1" />
    <rect x="4" y="13" width="7" height="7" rx="1" />
    <rect x="13" y="13" width="7" height="7" rx="1" />
  </svg>
);

export const SectionJumpIcon = ({ className = "h-3.5 w-3.5", title, ...props }: IconProps) => (
  <svg {...iconBaseProps} className={className} {...props}>
    {title ? <title>{title}</title> : null}
    <path d="M5 5h6" />
    <path d="M5 10h6" />
    <path d="M5 15h6" />
    <path d="M11 8h8" />
    <path d="m15 4 4 4-4 4" />
  </svg>
);

export const StatusLiveIcon = ({ className = "h-2.5 w-2.5", title, ...props }: IconProps) => (
  <svg viewBox="0 0 8 8" fill="currentColor" className={className} aria-hidden="true" {...props}>
    {title ? <title>{title}</title> : null}
    <circle cx="4" cy="4" r="3" />
  </svg>
);

export const StatusStaticIcon = ({ className = "h-2.5 w-2.5", title, ...props }: IconProps) => (
  <svg viewBox="0 0 8 8" fill="currentColor" className={className} aria-hidden="true" {...props}>
    {title ? <title>{title}</title> : null}
    <rect x="1" y="1" width="6" height="6" rx="0.5" />
  </svg>
);
