import type { LucideProps } from "lucide-react";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right.js";
import Check from "lucide-react/dist/esm/icons/check.js";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.js";
import Copy from "lucide-react/dist/esm/icons/copy.js";
import Download from "lucide-react/dist/esm/icons/download.js";
import FileText from "lucide-react/dist/esm/icons/file-text.js";
import Grid2x2 from "lucide-react/dist/esm/icons/grid-2x2.js";
import History from "lucide-react/dist/esm/icons/history.js";
import ScanSearch from "lucide-react/dist/esm/icons/scan-search.js";
import Shield from "lucide-react/dist/esm/icons/shield.js";
import Target from "lucide-react/dist/esm/icons/target.js";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up.js";
import Waypoints from "lucide-react/dist/esm/icons/waypoints.js";
import Zap from "lucide-react/dist/esm/icons/zap.js";
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

export const HistoryIcon = ({ className = "h-3.5 w-3.5", title: _title, ...props }: IconProps) => (
  <History className={className} {...baseProps} {...props} />
);

export const AuditIcon = ({ className = "h-3.5 w-3.5", title: _title, ...props }: IconProps) => (
  <ScanSearch className={className} {...baseProps} {...props} />
);

export const TrendUpIcon = ({ className = "h-3.5 w-3.5", title: _title, ...props }: IconProps) => (
  <TrendingUp className={className} {...baseProps} {...props} />
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
