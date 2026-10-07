import type { LucideProps } from "lucide-react";

import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Moon,
  Share2,
  SlidersHorizontal,
  Sun,
  Target,
  TrendingUp,
  TriangleAlert,
  Loader2,
  X,
} from 'lucide-react';


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

export const CircleTargetIcon = ({ className = "h-3.5 w-3.5", title: _title, ...props }: IconProps) => (
  <Target className={className} {...baseProps} {...props} />
);

export const CheckIcon = ({ className = "h-3.5 w-3.5", title: _title, ...props }: IconProps) => (
  <Check className={className} {...baseProps} {...props} />
);

export const CopyIcon = ({ className = "h-3.5 w-3.5", title: _title, ...props }: IconProps) => (
  <Copy className={className} {...baseProps} {...props} />
);

/* The toast's warning and error mark. Both used to be text glyphs ("⚠", "!"),
   which read at a different weight from every other icon and announced as
   punctuation. */
export const AlertTriangleIcon = ({ className = "h-3.5 w-3.5", title: _title, ...props }: IconProps) => (
  <TriangleAlert className={className} {...baseProps} {...props} />
);

export const CloseIcon = ({ className = "h-4 w-4", title: _title, ...props }: IconProps) => (
  <X className={className} {...baseProps} {...props} />
);

export const ChevronLeftIcon = ({ className = "h-4 w-4", title: _title, ...props }: IconProps) => (
  <ChevronLeft className={className} {...baseProps} {...props} />
);

export const ChevronRightIcon = ({ className = "h-4 w-4", title: _title, ...props }: IconProps) => (
  <ChevronRight className={className} {...baseProps} {...props} />
);

export const TrendUpIcon = ({ className = "h-3.5 w-3.5", title: _title, ...props }: IconProps) => (
  <TrendingUp className={className} {...baseProps} {...props} />
);

export const SlidersIcon = ({ className = "h-3.5 w-3.5", title: _title, ...props }: IconProps) => (
  <SlidersHorizontal className={className} {...baseProps} {...props} />
);

export const SunIcon = ({ className = "h-4 w-4", title: _title, ...props }: IconProps) => (
  <Sun className={className} {...baseProps} {...props} />
);

export const MoonIcon = ({ className = "h-4 w-4", title: _title, ...props }: IconProps) => (
  <Moon className={className} {...baseProps} {...props} />
);

export const ShareIcon = ({ className = "h-3.5 w-3.5", title: _title, ...props }: IconProps) => (
  <Share2 className={className} {...baseProps} {...props} />
);

/**
 * The one in-progress spinner. Four panels drew their own
 * `animate-spin rounded-full border-2 border-t-transparent` ring, none with a
 * reduced-motion path; this one spins only under `motion-safe:` and sits still
 * otherwise, which is the end state the standards ask for.
 */
export const SpinnerIcon = ({ className = "h-3.5 w-3.5", title: _title, ...props }: IconProps) => (
  <Loader2 className={`motion-safe:animate-spin ${className}`} {...baseProps} {...props} />
);
