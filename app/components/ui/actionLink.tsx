import Link, { type LinkProps } from "next/link";
import type { ReactNode } from "react";

type ActionLinkVariant = "primary" | "pill" | "ghost" | "inline";

const actionLinkVariantClasses: Record<ActionLinkVariant, string> = {
  primary:
    "weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] touch-manipulation",
  pill:
    "weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation",
  ghost:
    "weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] touch-manipulation",
  inline:
    "inline-flex min-h-[44px] items-center text-xs font-semibold uppercase tracking-[0.12em] text-sky-300 transition-colors hover:text-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation",
};

const joinClasses = (...values: Array<string | undefined>) => values.filter(Boolean).join(" ");

type ActionLinkProps = LinkProps & {
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
