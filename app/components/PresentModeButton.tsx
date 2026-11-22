"use client";

import { useCallback } from "react";
import { Presentation } from "lucide-react";

type Props = {
  className?: string;
};

/**
 * Puts the page into presentation focus mode (3-slide meeting deck).
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
 * Shows a presentation-slide glyph on compact screens and expands to a visible
 * "Present" label with its `F` keycap on wide screens, matching the Search cell
 * in the same header group so the 3-slide meeting deck is discoverable at a glance.
 */
export function PresentModeButton({ className = "" }: Props) {
  const handleToggle = useCallback(() => {
    document.dispatchEvent(new CustomEvent("whether:toggle-focus-mode"));
  }, []);

  return (
    <button
      type="button"
      onClick={handleToggle}
      title="Present 3-slide deck (F)"
      className={`weather-header-action inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-800/80 bg-slate-900/60 text-slate-400 transition-colors duration-150 hover:border-slate-700 hover:bg-slate-800/80 hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-sky-400 ${className}`}
    >
      <Presentation aria-hidden="true" size={16} strokeWidth={1.8} />
      <span className="sr-only lg:not-sr-only lg:inline lg:text-fluid-sm lg:font-medium">Present</span>
      <span className="sr-only"> 3-slide deck</span>
      <kbd aria-hidden="true" className="weather-kbd hidden xl:inline-flex">F</kbd>
    </button>
  );
}
