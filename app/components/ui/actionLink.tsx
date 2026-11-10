import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type ActionLinkVariant = "primary" | "pill" | "ghost" | "inline";

/* `text-fluid-sm`, the size the clipboard buttons beside these are set at
   (`ClipboardActionRow`). At `text-xs` the brief's one primary action, "Build
   this week's plan", printed 2px smaller than the two copy buttons it leads. */
const actionLinkVariantClasses: Record<ActionLinkVariant, string> = {
  primary:
    "weather-button-primary weather-focus-ring weather-press-scale inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-fluid-sm font-semibold tabular-nums",
  pill:
    "weather-pill weather-focus-ring weather-press-scale inline-flex min-h-[44px] items-center px-3 py-2 text-fluid-sm font-semibold tabular-nums text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100",
  ghost:
    "weather-button weather-focus-ring weather-press-scale inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-fluid-sm font-semibold tabular-nums",
  /* Text, not a box (2026-11-10): as a 44px inline-flex box a link inside a sentence
     ("What would change our mind: each score's…") opened a 44px line in the paragraph and
     could not wrap, so the text after it broke early onto a gapped second line.
     `weather-hit` keeps the 44px target as an invisible pseudo-element. */
  inline:
    "weather-hit weather-focus-ring weather-press-scale text-fluid-sm font-semibold tabular-nums text-sky-300 transition-colors hover:text-sky-200",
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



/* A plain anchor, for a link whose hash has to do its work. `Link` moves the hash with
   `pushState`, which fires no `hashchange`, so a control reading the hash never hears; and
   after a client-side move to another route the scroll to its target lands in the wrong
   place on `/operate`, whose steps are still settling. A full load lands on the anchor. */
export function PlainActionLink({
  children,
  variant = "inline",
  className,
  ...anchorProps
}: Omit<ComponentProps<"a">, "className"> & {
  children: ReactNode;
  href: string;
  variant?: ActionLinkVariant;
  className?: string;
}) {
  return (
    <a {...anchorProps} className={joinClasses(actionLinkVariantClasses[variant], className)}>
      {children}
    </a>
  );
}
