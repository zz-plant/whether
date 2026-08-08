"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Settings, Share2, Download, Check, Maximize2, Calendar } from "lucide-react";
import { ThemeToggleButton } from "./themeToggleButton";
import { SettingsPanel } from "./settingsPanel";
import { ShareRail } from "./shareRail";
import { HistoryIcon } from "./uiIcons";
import { TimeMachineDatePicker } from "./timeMachineDatePicker";
import { buildMondayCalendarUrl } from "./calendarButton";

export function GlobalHeaderActionsClient() {
  const [showSettings, setShowSettings] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [copiedSlack, setCopiedSlack] = useState(false);

  const handleCopySlackBrief = async () => {
    try {
      const briefText = `*WHETHER WEEKLY OPERATING BRIEF*\n> *Posture:* EXPANSION / Volatile\n> *Action:* Tighten capital allocation & fence long-payback projects.\n> *Reversal:* 10Y-2Y slope flips positive (> +15 bps).\n_Source: Whether Regime Engine (US Treasury & FRED)_`;
      await navigator.clipboard.writeText(briefText);
      setCopiedSlack(true);
      setTimeout(() => setCopiedSlack(false), 2500);
    } catch {
      // Fallback
    }
  };

  const toggleFocusMode = () => {
    document.dispatchEvent(new CustomEvent("whether:toggle-focus-mode"));
    setShowQuickMenu(false);
  };

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowQuickMenu((v) => !v)}
          className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-sm border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-fluid-xs font-semibold text-sky-300 hover:bg-sky-500/20 transition-colors active:scale-[0.97]"
          aria-label="Quick Export options"
          aria-expanded={showQuickMenu}
        >
          <Download aria-hidden="true" size={15} strokeWidth={2} />
          <span>Export</span>
        </button>

        {showQuickMenu ? (
          <div
            className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl border border-white/10 bg-[var(--bg-raised,#0f172a)]/95 p-2 shadow-2xl backdrop-blur-xl space-y-1 text-left"
            role="menu"
          >
            <button
              type="button"
              onClick={handleCopySlackBrief}
              className="w-full text-left flex items-center justify-between px-3 py-2 text-fluid-xs font-medium text-white/80 hover:bg-white/[0.08] hover:text-white rounded-lg transition-colors"
            >
              <span>Copy Slack Snippet</span>
              {copiedSlack ? <Check size={14} className="text-emerald-400" /> : <span className="text-[10px] text-white/40 font-mono">MD</span>}
            </button>
            <button
              type="button"
              onClick={toggleFocusMode}
              className="w-full text-left flex items-center justify-between px-3 py-2 text-fluid-xs font-medium text-white/80 hover:bg-white/[0.08] hover:text-white rounded-lg transition-colors"
            >
              <span>Focus Presentation</span>
              <Maximize2 size={13} className="text-sky-400" />
            </button>
            <button
              type="button"
              onClick={() => {
                setShowQuickMenu(false);
                setShowShare(true);
              }}
              className="w-full text-left flex items-center justify-between px-3 py-2 text-fluid-xs font-medium text-white/80 hover:bg-white/[0.08] hover:text-white rounded-lg transition-colors"
            >
              <span>Full Briefing Pack</span>
              <Share2 size={13} className="text-white/40" />
            </button>
            <a
              href={buildMondayCalendarUrl()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShowQuickMenu(false)}
              className="w-full text-left flex items-center justify-between px-3 py-2 text-fluid-xs font-medium text-white/80 hover:bg-white/[0.08] hover:text-white rounded-lg transition-colors"
            >
              <span>Add Monday Calendar Sync</span>
              <Calendar size={13} className="text-emerald-400" />
            </a>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setShowShare(true)}
        className="inline-flex min-h-11 sm:min-h-9 min-w-11 items-center justify-center rounded-sm border border-white/[0.08] px-2.5 py-1.5 text-fluid-xs font-medium text-white/60 hover:text-white/80 hover:border-white/[0.14] transition-colors active:scale-[0.97]"
        aria-label="Share brief"
      >
        <Share2 aria-hidden="true" size={16} strokeWidth={1.8} />
        <span className="ml-1.5 hidden sm:inline">Share</span>
      </button>

      <button
        type="button"
        onClick={() => setShowDatePicker(true)}
        className="hidden sm:inline-flex min-h-11 sm:min-h-9 items-center gap-1 rounded-sm border border-white/[0.08] px-2.5 py-1.5 text-fluid-xs font-medium text-white/60 hover:text-white/80 hover:border-white/[0.14] transition-colors active:scale-[0.97]"
        aria-label="History"
      >
        <HistoryIcon />
        <span className="ml-1.5">History</span>
      </button>

      <Link
        href="/resolve"
        className="hidden sm:inline-flex min-h-11 sm:min-h-9 min-w-11 items-center justify-center rounded-sm border border-slate-800/60 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
        aria-label="Search"
      >
        <Search aria-hidden="true" size={16} strokeWidth={1.8} />
      </Link>
      <button
        type="button"
        onClick={() => setShowSettings(true)}
        className="hidden sm:inline-flex min-h-11 sm:min-h-9 min-w-11 items-center justify-center rounded-sm border border-slate-800/60 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
        aria-label="Settings"
      >
        <Settings aria-hidden="true" size={16} strokeWidth={1.8} />
      </button>
      <ThemeToggleButton className="min-h-11 sm:min-h-9" />
      {showSettings ? <SettingsPanel onClose={() => setShowSettings(false)} /> : null}
      {showShare ? <ShareRail onClose={() => setShowShare(false)} /> : null}
      {showDatePicker ? <TimeMachineDatePicker onClose={() => setShowDatePicker(false)} /> : null}
    </>
  );
}

