"use client";

import { useState } from "react";
import { History, Search, Settings } from "lucide-react";
import { SettingsPanel } from "./settingsPanel";
import { ProfileSheet } from "./profileSheet";
import { CommandPalette } from "./commandPalette";
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

/**
 * One bordered group, not four or five boxes.
 *
 * Each control used to carry its own border and fill, so the right edge of the
 * header read as a strip of identical squares — five of them on the home brief
 * once Present moved up here — competing with the cadence control beside it for
 * the same "this is a bordered group" reading. The border is now on the
 * container; the buttons are hairline-divided cells inside it.
 *
 * The group rounds its corners through its children rather than through
 * `overflow-hidden`. Clipping cost the theme toggle its focus ring:
 * `.weather-pill:focus-visible` draws an outward 2px outline plus a halo from
 * unlayered CSS, which outranks any Tailwind offset utility, so the top and
 * bottom of the ring were cut off — and `PresentModeButton`, with no offset at
 * all, lost its edges the same way. Rounding the end cells keeps the shape and
 * removes the clip, so a child added later cannot silently lose its ring.
 */
const CELL =
  "inline-flex min-h-11 sm:min-h-9 min-w-11 items-center justify-center text-slate-400 transition-colors duration-150 hover:bg-slate-800/70 hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky-400";

export function GlobalHeaderActionsClient({ showPresentMode = false }: GlobalHeaderActionsClientProps = {}) {
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showPalette, setShowPalette] = useState(false);

  return (
    <>
      <div className="inline-flex items-stretch rounded-lg border border-slate-800/80 bg-slate-900/60 divide-x divide-slate-800/80 [&>*:first-child]:rounded-l-[7px] [&>*:last-child]:rounded-r-[7px]">
        <button type="button" onClick={() => setShowPalette(true)} className={CELL} aria-label="Search" title="Search ⌘K">
          <Search aria-hidden="true" size={16} strokeWidth={1.8} />
          <span className="hidden lg:inline text-fluid-nano text-slate-400" aria-hidden="true">⌘K</span>
        </button>
        <button type="button" onClick={() => setShowProfile(true)} className={CELL} aria-label="History & export" title="History & export">
          <History aria-hidden="true" size={16} strokeWidth={1.8} />
          <span className="hidden lg:inline text-fluid-nano text-slate-400" aria-hidden="true">Export</span>
        </button>
        {/* The light theme has a full token set in tokens.css and layout.tsx
            restores the saved choice pre-paint, but nothing rendered the control,
            so the theme was unreachable from the UI. Takes the cell class rather
            than its own pill default, like the buttons either side. */}
        <ThemeToggleButton className={`!rounded-none !shadow-none !outline-offset-[-2px] ${CELL}`} />
        {showPresentMode ? (
          <PresentModeButton className="!rounded-none !border-0 !bg-transparent focus-visible:outline-offset-[-2px]" />
        ) : null}
        <button type="button" onClick={() => setShowSettings(true)} className={CELL} aria-label="Settings" title="Settings">
          <Settings aria-hidden="true" size={16} strokeWidth={1.8} />
        </button>
      </div>
      {showSettings ? <SettingsPanel onClose={() => setShowSettings(false)} /> : null}
      {showProfile ? <ProfileSheet onClose={() => setShowProfile(false)} /> : null}
      {showPalette ? <CommandPalette onClose={() => setShowPalette(false)} /> : null}
    </>
  );
}

