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
      {/* Labelled at every width. Hiding it below sm left one bare ⤢ box at the
          end of a wrapping row of three labelled buttons — it saved no row,
          since the row had already wrapped, and "presentation focus mode" is
          not a glyph anyone reads cold. */}
      <span>Present</span>
    </button>
  );
}
