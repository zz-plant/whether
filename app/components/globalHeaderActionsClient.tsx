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

export function GlobalHeaderActionsClient({ showPresentMode = false }: GlobalHeaderActionsClientProps = {}) {
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showPalette, setShowPalette] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowPalette(true)}
        className="inline-flex min-h-11 sm:min-h-9 min-w-11 items-center justify-center rounded-lg border border-slate-800/80 bg-slate-900/60 text-slate-400 hover:text-slate-100 hover:border-slate-700 hover:bg-slate-800/80 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-sky-400"
        aria-label="Search"
        title="Search ⌘K"
      >
        <Search aria-hidden="true" size={16} strokeWidth={1.8} />
      </button>
      <button
        type="button"
        onClick={() => setShowProfile(true)}
        className="inline-flex min-h-11 sm:min-h-9 min-w-11 items-center justify-center rounded-lg border border-slate-800/80 bg-slate-900/60 text-slate-400 hover:text-slate-100 hover:border-slate-700 hover:bg-slate-800/80 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-sky-400"
        aria-label="History & export"
        title="History & export"
      >
        <History aria-hidden="true" size={16} strokeWidth={1.8} />
      </button>
      {/* The light theme has a full token set in tokens.css and layout.tsx
          restores the saved choice pre-paint, but nothing rendered the control,
          so the theme was unreachable from the UI. Matches the sizing of the
          buttons either side rather than using the component's pill default. */}
      <ThemeToggleButton className="!rounded-lg min-h-11 sm:min-h-9 min-w-11 border border-slate-800/80 bg-slate-900/60 text-slate-400 hover:text-slate-100 hover:border-slate-700 hover:bg-slate-800/80" />
      {showPresentMode ? <PresentModeButton /> : null}
      <button
        type="button"
        onClick={() => setShowSettings(true)}
        className="inline-flex min-h-11 sm:min-h-9 min-w-11 items-center justify-center rounded-lg border border-slate-800/80 bg-slate-900/60 text-slate-400 hover:text-slate-100 hover:border-slate-700 hover:bg-slate-800/80 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-sky-400"
        aria-label="Settings"
        title="Settings"
      >
        <Settings aria-hidden="true" size={16} strokeWidth={1.8} />
      </button>
      {showSettings ? <SettingsPanel onClose={() => setShowSettings(false)} /> : null}
      {showProfile ? <ProfileSheet onClose={() => setShowProfile(false)} /> : null}
      {showPalette ? <CommandPalette onClose={() => setShowPalette(false)} /> : null}
    </>
  );
}

