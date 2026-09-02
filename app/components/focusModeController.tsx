"use client";

import { useEffect, useState } from "react";
import { Minimize2 } from "lucide-react";

const defaultMainClassName = "mx-auto max-w-[72rem] px-4 py-4 sm:py-5 transition-all weather-page-enter";
const focusedMainClassName = "mx-auto max-w-[64rem] px-6 py-12 transition-all weather-page-enter shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-white/10 rounded-2xl bg-slate-950/90 my-6";

export function FocusModeController() {
  const [isFocusMode, setIsFocusMode] = useState(false);

  useEffect(() => {
    const main = document.querySelector<HTMLElement>("[data-home-shell-main]");
    if (main) main.className = isFocusMode ? focusedMainClassName : defaultMainClassName;
  }, [isFocusMode]);

  useEffect(() => {
    const handleToggle = () => setIsFocusMode((value) => !value);
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      const isShortcut = (event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "s";

      if (isShortcut || (event.key.toLowerCase() === "f" && !isTyping)) {
        event.preventDefault();
        setIsFocusMode((value) => !value);
      } else if (event.key === "Escape") {
        setIsFocusMode(false);
      }
    };

    document.addEventListener("whether:toggle-focus-mode", handleToggle);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("whether:toggle-focus-mode", handleToggle);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (!isFocusMode) return null;

  return (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-2 rounded-lg border border-sky-500/40 bg-slate-900/90 px-3 py-1.5 shadow-2xl backdrop-blur-md">
      <span className="inline-block size-2 rounded-full bg-sky-400 animate-ping" />
      <span className="text-fluid-nano font-mono font-semibold text-sky-200 uppercase tracking-wide">
        Presentation Focus Mode
      </span>
      <button
        type="button"
        onClick={() => setIsFocusMode(false)}
        className="ml-2 rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
        aria-label="Exit focus mode"
      >
        <Minimize2 size={14} />
      </button>
    </div>
  );
}
