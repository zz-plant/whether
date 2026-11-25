"use client";

import type { ReactNode } from "react";

type GlobalHeaderScrollWrapperProps = {
  scrolled?: boolean;
  mode?: "nav" | "reading";
  regime?: string | null;
  children: ReactNode;
};

/**
 * Full-bleed sticky Forecast masthead shell.
 *
 * Replaces the previous hide-on-scroll-down inset rounded card (`md:px-4 md:rounded-b-md`),
 * which slid away and forced a second fixed `RunningHead` to stack beneath it on scroll-up.
 * This single bar stays anchored at the top edge and morphs its contents in place.
 */
export function GlobalHeaderScrollWrapper({
  scrolled = false,
  mode = "nav",
  regime = null,
  children,
}: GlobalHeaderScrollWrapperProps) {
  return (
    <header
      className="site-masthead print:hidden"
      data-scrolled={scrolled ? "true" : undefined}
      data-masthead-mode={mode}
      data-regime={mode === "reading" && regime ? regime : undefined}
    >
      {children}
    </header>
  );
}
