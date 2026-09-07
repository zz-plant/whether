"use client";

import { useCallback } from "react";
import { Maximize2 } from "lucide-react";

type Props = {
  className?: string;
};

/**
 * Puts the page into presentation focus mode.
 *
 * This lived in `DecisionHero`, in the row that runs Copy Brief · Copy Meeting
 * Slide · Track in Memory — three controls that act on the brief artifact,
 * under a comment reading "One copy control per artifact". Present acts on the
 * viewport instead, so it sat one layer too deep: display modes belong beside
 * theme and settings in the global header, which is also where this app already
 * puts them.
 *
 * The header renders it only on the home brief, because focus mode targets
 * `[data-home-shell-main]` and `Shell` — the only component that renders it —
 * serves that one route.
 *
 * It is icon-only now. A prior comment here insisted on a visible label at every
 * width, because hiding it below `sm` left one bare glyph at the end of a
 * wrapping row of three labelled buttons. That row is no longer its parent; in
 * the header cluster every sibling is a 44px icon button, so a label is what
 * would look out of place.
 */
export function PresentModeButton({ className = "" }: Props) {
  const handleToggle = useCallback(() => {
    document.dispatchEvent(new CustomEvent("whether:toggle-focus-mode"));
  }, []);

  return (
    <button
      type="button"
      onClick={handleToggle}
      title="Presentation focus mode (F)"
      className={`inline-flex min-h-11 sm:min-h-9 min-w-11 items-center justify-center rounded-lg border border-slate-800/80 bg-slate-900/60 text-slate-400 transition-all duration-150 hover:border-slate-700 hover:bg-slate-800/80 hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-sky-400 ${className}`}
      aria-label="Toggle presentation focus mode"
    >
      <Maximize2 aria-hidden="true" size={16} strokeWidth={1.8} />
    </button>
  );
}
