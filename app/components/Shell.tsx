"use client";

import { useState, useEffect, type ReactNode } from "react";
import { ShareRail } from "./shareRail";
import { Minimize2 } from "lucide-react";

export function Shell({
  children,
  loading,
  regime,
}: {
  children?: ReactNode;
  loading?: boolean;
  regime?: string;
}) {
  const [showShare, setShowShare] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  useEffect(() => {
    const handleToggle = () => setIsFocusMode((v) => !v);
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setIsFocusMode((v) => !v);
      } else if (e.key.toLowerCase() === "f" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setIsFocusMode((v) => !v);
      } else if (e.key === "Escape" && isFocusMode) {
        setIsFocusMode(false);
      }
    };
    document.addEventListener("whether:toggle-focus-mode", handleToggle);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("whether:toggle-focus-mode", handleToggle);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFocusMode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-body)] text-[var(--app-text)]">
        <main id="main-content" className="mx-auto max-w-[72rem] px-4 py-4 sm:py-5">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_18rem] lg:gap-8">
            <div className="space-y-6 min-w-0">
              <div className="weather-card">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0 space-y-4">
                    <div className="space-y-2">
                      <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
                      <div className="h-9 w-full max-w-xl rounded bg-white/15 animate-pulse" />
                    </div>
                    <div className="h-4 w-full max-w-md rounded bg-white/10 animate-pulse" />
                    <div className="h-8 w-full max-w-sm rounded bg-white/10 animate-pulse" />
                  </div>
                  <div className="space-y-2 sm:text-right">
                    <div className="h-20 w-20 rounded-full bg-white/15 animate-pulse mx-auto sm:mr-0" />
                    <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="weather-card h-40 animate-pulse" />
              <div className="weather-card h-56 animate-pulse" />
            </div>
            <div className="space-y-4 lg:col-start-2">
              <div className="weather-card h-32 animate-pulse" />
              <div className="weather-card h-48 animate-pulse" />
            </div>
            <div className="space-y-6 min-w-0">
              <div className="weather-card h-64 animate-pulse" />
              <div className="weather-card h-32 animate-pulse" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  const regimeLower = (regime ?? "").toLowerCase();
  // Tint tokens are theme-aware and fade to transparent, so --bg-body stays the
  // base surface. The previous via-slate-950/to-slate-950 stops were a fixed
  // near-black, which painted the light theme with a grey wash.
  const atmosphereTint = regimeLower === "expansion" ? "var(--atmosphere-expansion)"
    : regimeLower === "defensive" ? "var(--atmosphere-defensive)"
    : regimeLower === "scarcity" ? "var(--atmosphere-scarcity)"
    : regimeLower === "volatile" ? "var(--atmosphere-volatile)"
    : "";

  return (
    <div
      className="min-h-screen bg-[var(--bg-body)] text-[var(--app-text)] transition-all"
      style={atmosphereTint ? { backgroundImage: `linear-gradient(to bottom, ${atmosphereTint} 0%, transparent 60%)` } : undefined}
    >
      {isFocusMode ? (
        <div className="fixed top-3 right-3 z-50 flex items-center gap-2 rounded-full border border-sky-500/40 bg-slate-900/90 px-3 py-1.5 shadow-2xl backdrop-blur-md">
          <span className="inline-block size-2 rounded-full bg-sky-400 animate-ping" />
          <span className="text-fluid-nano font-mono font-semibold text-sky-200 uppercase tracking-wide">
            Presentation Focus Mode
          </span>
          <button
            type="button"
            onClick={() => setIsFocusMode(false)}
            className="ml-2 rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Exit focus mode"
          >
            <Minimize2 size={14} />
          </button>
        </div>
      ) : null}

      <main
        id="main-content"
        className={`mx-auto transition-all ${
          isFocusMode
            ? "max-w-[64rem] px-6 py-12 shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-white/10 rounded-2xl bg-slate-950/90 my-6"
            // The sticky header is already 109px of chrome across two bordered
            // bands, so the old py-6/sm:py-8 pushed the first real element about
            // 157px down the page before anything was readable.
            : "max-w-[72rem] px-4 py-4 sm:py-5"
        }`}
      >
        {children}
      </main>

      {showShare ? <ShareRail onClose={() => setShowShare(false)} /> : null}
    </div>
  );
}
