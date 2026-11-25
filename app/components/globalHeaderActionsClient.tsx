"use client";

import { Search, Share2 } from "lucide-react";
import { openShareRail } from "./globalShareRail";
import { ThemeToggleButton } from "./themeToggleButton";
import { PresentModeButton } from "./PresentModeButton";

type GlobalHeaderActionsClientProps = {
  /**
   * Renders the presentation-mode control. Off everywhere but the home brief:
   * focus mode targets `[data-home-shell-main]`, and `Shell` — its only
   * renderer — serves that route alone, so the button would do nothing here.
   */
  showPresentMode?: boolean;
};

const ICON_ACTION =
  "weather-header-action weather-focus-ring inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-2 text-[var(--app-text-muted)] transition-colors duration-150 hover:bg-[var(--bg-nested)] hover:text-[var(--app-text)]";

/**
 * Forecast-native masthead actions: flat ink controls on paper, zero dark utility cage.
 *
 * - Search (`⌘K`) and Share (`⇧S`) are consistent across every route on BOTH mobile and
 *   desktop (fixing the empty mobile `/` header and eliminating the duplicate "Share and
 *   embed" link beside the Share icon on desktop).
 * - Present (`F`) renders on the home brief at `md+`.
 * - Theme sits at the far right on `md+` (on mobile it lives inside the Menu drawer so
 *   the 48px mobile bar stays calm with Brand + Search + Share).
 *
 * The two `md+`-only controls hide through a wrapper, not by adding `hidden` to their
 * own class list: `ICON_ACTION` carries `inline-flex`, and Tailwind emits `.inline-flex`
 * after `.hidden`, so a `hidden md:inline-flex` on the same element loses and Present and
 * Theme rendered on a phone (found in the 2026-11-22 capture). The wrapper is the same
 * fix `commandPalette` uses for the `ESC` badge.
 */
export function GlobalHeaderActionsClient({ showPresentMode = false }: GlobalHeaderActionsClientProps = {}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
      <button
        type="button"
        onClick={() => document.dispatchEvent(new CustomEvent("whether-open-command-palette"))}
        className={`${ICON_ACTION} xl:w-44 xl:justify-between xl:border xl:border-[color:var(--border-subtle)] xl:bg-[var(--bg-nested)] xl:px-2.5 xl:text-fluid-sm xl:hover:border-[color:var(--border-strong)]`}
        aria-label="Search"
        title="Search or jump to… ⌘K"
      >
        <span className="inline-flex items-center gap-2">
          <Search aria-hidden="true" size={16} strokeWidth={1.8} />
          <span className="hidden xl:inline text-[var(--app-text-muted)]">Search…</span>
        </span>
        <span className="hidden xl:inline">
          <kbd aria-hidden="true" className="weather-kbd">⌘K</kbd>
        </span>
      </button>
      {showPresentMode ? (
        <span className="hidden md:inline-flex">
          <PresentModeButton />
        </span>
      ) : null}
      <button
        type="button"
        onClick={openShareRail}
        className={`${ICON_ACTION} lg:px-2.5`}
        aria-label="Share this page"
        title="Share this page ⇧S"
      >
        <Share2 aria-hidden="true" size={16} strokeWidth={1.8} />
        <span className="hidden lg:inline text-fluid-sm font-medium">Share</span>
      </button>
      <span className="hidden md:inline-flex">
        <ThemeToggleButton className={ICON_ACTION} />
      </span>
    </div>
  );
}
