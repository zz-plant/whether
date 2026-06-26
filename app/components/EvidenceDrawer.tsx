"use client";

import { ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";

export function EvidenceDrawer({ children, highlight }: { children?: ReactNode; highlight?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <details className="group weather-card overflow-hidden" onToggle={(e) => { if (e.target instanceof HTMLDetailsElement) setOpen(e.target.open); }}>
      <summary className={`flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-3 text-xs font-semibold tracking-[0.04em] text-white/65 transition-colors select-none hover:bg-white/[0.06] hover:text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-0 [&::-webkit-details-marker]:hidden ${highlight ? "border-l-2 border-l-sky-400/40" : ""}`}>
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="text-white/80">Evidence &amp; scenarios</span>
          {highlight ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-0.5 text-fluid-nano font-semibold tracking-wider text-sky-300 uppercase animate-pulse">
              ★ Active target: {highlight}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.10] bg-white/[0.06] px-2 py-0.5 text-fluid-nano font-medium text-white/60">
              Expand
            </span>
          )}
          <span className="hidden sm:inline text-[0.65rem] text-white/50 truncate">
            Simulator · Signals · Trendline · Shift risk
          </span>
        </div>
        <ChevronRight
          className={`h-5 w-5 shrink-0 transition-transform group-open:rotate-90 group-hover:text-white/60 ${highlight ? "text-sky-300/70" : "text-white/50"}`}
          aria-hidden="true"
        />
      </summary>
      {open ? (
        <div className="px-4 pb-4 space-y-4">
          {children}
        </div>
      ) : null}
    </details>
  );
}
