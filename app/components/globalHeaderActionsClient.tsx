"use client";

import { useState } from "react";
import { Search, Settings, User } from "lucide-react";
import { SettingsPanel } from "./settingsPanel";
import { ProfileSheet } from "./profileSheet";
import { CommandPalette } from "./commandPalette";

export function GlobalHeaderActionsClient() {
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showPalette, setShowPalette] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowPalette(true)}
        className="inline-flex min-h-11 sm:min-h-9 min-w-11 items-center justify-center rounded-sm border border-slate-800/60 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
        aria-label="Search"
        title="Search ⌘K"
      >
        <Search aria-hidden="true" size={16} strokeWidth={1.8} />
      </button>
      <button
        type="button"
        onClick={() => setShowProfile(true)}
        className="inline-flex min-h-11 sm:min-h-9 min-w-11 items-center justify-center rounded-sm border border-slate-800/60 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
        aria-label="History & export"
        title="History & export"
      >
        <User aria-hidden="true" size={16} strokeWidth={1.8} />
      </button>
      <button
        type="button"
        onClick={() => setShowSettings(true)}
        className="inline-flex min-h-11 sm:min-h-9 min-w-11 items-center justify-center rounded-sm border border-slate-800/60 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
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

