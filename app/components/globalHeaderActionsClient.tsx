"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Settings, Share2 } from "lucide-react";
import { ThemeToggleButton } from "./themeToggleButton";
import { SettingsPanel } from "./settingsPanel";
import { ShareRail } from "./shareRail";
import { HistoryIcon } from "./uiIcons";

export function GlobalHeaderActionsClient() {
  const [showSettings, setShowSettings] = useState(false);
  const [showShare, setShowShare] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowShare(true)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/[0.08] px-2.5 py-1.5 text-fluid-xs font-medium text-white/60 hover:text-white/80 hover:border-white/[0.14] transition-colors active:scale-[0.97]"
        aria-label="Share brief"
      >
        <Share2 aria-hidden="true" size={16} strokeWidth={1.8} />
        <span className="ml-1.5 hidden sm:inline">Share</span>
      </button>
      <Link
        href="/history"
        className="hidden sm:inline-flex min-h-11 items-center gap-1 rounded-full border border-white/[0.08] px-2.5 py-1.5 text-fluid-xs font-medium text-white/60 hover:text-white/80 hover:border-white/[0.14] no-underline transition-colors active:scale-[0.97]"
        aria-label="History"
      >
        <HistoryIcon />
        <span className="ml-1.5">History</span>
      </Link>
      <Link
        href="/resolve"
        className="hidden sm:inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-slate-800/60 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
        aria-label="Search"
      >
        <Search aria-hidden="true" size={16} strokeWidth={1.8} />
      </Link>
      <button
        type="button"
        onClick={() => setShowSettings(true)}
        className="hidden sm:inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-slate-800/60 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
        aria-label="Settings"
      >
        <Settings aria-hidden="true" size={16} strokeWidth={1.8} />
      </button>
      <ThemeToggleButton className="min-h-11" />
      {showSettings ? <SettingsPanel onClose={() => setShowSettings(false)} /> : null}
      {showShare ? <ShareRail onClose={() => setShowShare(false)} /> : null}
    </>
  );
}
