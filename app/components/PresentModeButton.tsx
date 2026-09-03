"use client";

import { useCallback } from "react";
import { Maximize2 } from "lucide-react";

type Props = {
  className?: string;
};

export function PresentModeButton({ className = "" }: Props) {
  const handleToggle = useCallback(() => {
    document.dispatchEvent(new CustomEvent("whether:toggle-focus-mode"));
  }, []);

  return (
    <button
      type="button"
      onClick={handleToggle}
      title="Toggle Presentation Focus Mode (Shortcut: F)"
      className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-900/40 px-3 py-1.5 text-fluid-xs font-semibold text-slate-300 hover:bg-slate-800/60 hover:text-white hover:border-slate-600 transition-all weather-press-scale weather-focus-ring ${className}`}
      aria-label="Toggle presentation focus mode"
    >
      <Maximize2 size={13} className="text-slate-400" />
      <span className="hidden sm:inline">Present</span>
    </button>
  );
}
