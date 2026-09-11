import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type ActionLinkVariant = "primary" | "pill" | "ghost" | "inline";

const actionLinkVariantClasses: Record<ActionLinkVariant, string> = {
  primary:
    "weather-button-primary weather-focus-ring weather-press-scale inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tabular-nums tracking-[0.12em]",
  pill:
    "weather-pill weather-focus-ring weather-press-scale inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tabular-nums tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100",
  ghost:
    "weather-button weather-focus-ring weather-press-scale inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tabular-nums tracking-[0.12em]",
  inline:
    "weather-focus-ring weather-press-scale inline-flex min-h-[44px] items-center type-badge tabular-nums text-sky-300 transition-colors hover:text-sky-200",
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

export type { ActionLinkVariant };
