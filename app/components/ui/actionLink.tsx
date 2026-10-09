import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type ActionLinkVariant = "primary" | "pill" | "ghost" | "inline";

/* `text-fluid-xs`, the size the clipboard buttons beside these are set at
   (`ClipboardActionRow`). At `text-xs` the brief's one primary action, "Build
   this week's plan", printed 2px smaller than the two copy buttons it leads. */
const actionLinkVariantClasses: Record<ActionLinkVariant, string> = {
  primary:
    "weather-button-primary weather-focus-ring weather-press-scale inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-fluid-xs font-semibold tabular-nums",
  pill:
    "weather-pill weather-focus-ring weather-press-scale inline-flex min-h-[44px] items-center px-3 py-2 text-fluid-xs font-semibold tabular-nums text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100",
  ghost:
    "weather-button weather-focus-ring weather-press-scale inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-fluid-xs font-semibold tabular-nums",
  inline:
    "weather-focus-ring weather-press-scale inline-flex min-h-[44px] items-center text-fluid-xs font-semibold tabular-nums text-sky-300 transition-colors hover:text-sky-200",
};

const joinClasses = (...values: Array<string | undefined>) => values.filter(Boolean).join(" ");

type ActionLinkProps = Omit<ComponentProps<typeof Link>, "className"> & {
  children: ReactNode;
  className?: string;
  variant?: ActionLinkVariant;
};

export function ActionLink({ children, className, variant = "pill", ...linkProps }: ActionLinkProps) {
  return (
    <Link {...linkProps} className={joinClasses(actionLinkVariantClasses[variant], className)}>
      {children}
    </Link>
  );
}


