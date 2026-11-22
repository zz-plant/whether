"use client";

import { useCallback } from "react";
import { Presentation } from "lucide-react";

type Props = {
  className?: string;
};

/**
 * Puts the page into presentation focus mode (3-slide meeting deck).
 *
 * Rendered only on the home brief (`Shell` owns `[data-home-shell-main]`).
 * Styled in Forecast's flat ink register (no dark bordered dashboard cage):
 * presentation glyph on compact desktop, expanding to "Present" + `F` keycap on wide screens.
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
      className={`weather-header-action weather-focus-ring inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-2 text-[var(--app-text-muted)] transition-colors duration-150 hover:bg-[var(--bg-nested)] hover:text-[var(--app-text)] ${className}`}
    >
      <Presentation aria-hidden="true" size={16} strokeWidth={1.8} />
      <span className="sr-only lg:not-sr-only lg:inline lg:text-fluid-sm lg:font-medium">Present</span>
      <span className="sr-only"> 3-slide deck</span>
      <kbd aria-hidden="true" className="weather-kbd hidden xl:inline-flex">F</kbd>
    </button>
  );
}
