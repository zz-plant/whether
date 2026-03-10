import {
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Grid2x2,
  Shield,
  Target,
  Waypoints,
  Zap,
  type LucideProps,
} from "lucide-react";
import type { SVGProps } from "react";

type IconProps = LucideProps & { title?: string };

const baseProps: LucideProps = {
  strokeWidth: 1.8,
  "aria-hidden": true,
};

export const ArrowRightIcon = ({ className = "h-3.5 w-3.5", title: _title, ...props }: IconProps) => (
  <ArrowRight className={className} {...baseProps} {...props} />
);

export const ChevronDownIcon = ({ className = "h-4 w-4", title: _title, ...props }: IconProps) => (
  <ChevronDown className={className} {...baseProps} {...props} />
);

export const BoltIcon = ({ className = "h-3.5 w-3.5", title: _title, ...props }: IconProps) => (
  <Zap className={className} {...baseProps} {...props} />
);

export const CircleTargetIcon = ({ className = "h-3.5 w-3.5", title: _title, ...props }: IconProps) => (
  <Target className={className} {...baseProps} {...props} />
);

export const LayoutGridIcon = ({ className = "h-3.5 w-3.5", title: _title, ...props }: IconProps) => (
  <Grid2x2 className={className} {...baseProps} {...props} />
);

export const SectionJumpIcon = ({ className = "h-3.5 w-3.5", title: _title, ...props }: IconProps) => (
  <Waypoints className={className} {...baseProps} {...props} />
);

export const CheckIcon = ({ className = "h-3.5 w-3.5", title: _title, ...props }: IconProps) => (
  <Check className={className} {...baseProps} {...props} />
);

export const CopyIcon = ({ className = "h-3.5 w-3.5", title: _title, ...props }: IconProps) => (
  <Copy className={className} {...baseProps} {...props} />
);

export const DocumentIcon = ({ className = "h-3.5 w-3.5", title: _title, ...props }: IconProps) => (
  <FileText className={className} {...baseProps} {...props} />
);

export const DownloadIcon = ({ className = "h-3.5 w-3.5", title: _title, ...props }: IconProps) => (
  <Download className={className} {...baseProps} {...props} />
);

export const ShieldIcon = ({ className = "h-3.5 w-3.5", title: _title, ...props }: IconProps) => (
  <Shield className={className} {...baseProps} {...props} />
);

export const StatusLiveIcon = ({ className = "h-2.5 w-2.5", title, ...props }: SVGProps<SVGSVGElement> & { title?: string }) => (
  <svg viewBox="0 0 8 8" fill="currentColor" className={className} aria-hidden="true" {...props}>
    {title ? <title>{title}</title> : null}
    <circle cx="4" cy="4" r="3" />
  </svg>
);

export const StatusStaticIcon = ({ className = "h-2.5 w-2.5", title, ...props }: SVGProps<SVGSVGElement> & { title?: string }) => (
  <svg viewBox="0 0 8 8" fill="currentColor" className={className} aria-hidden="true" {...props}>
    {title ? <title>{title}</title> : null}
    <rect x="1" y="1" width="6" height="6" rx="0.5" />
  </svg>
);
