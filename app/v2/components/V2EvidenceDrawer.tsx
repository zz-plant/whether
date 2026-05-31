"use client";

import { useState, type ReactNode } from "react";

export function V2EvidenceDrawer({ children, highlight }: { children?: ReactNode; highlight?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <details className="group weather-card" onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="cursor-pointer list-none px-4 py-3 text-xs font-semibold tracking-[0.04em] text-white/40 hover:text-white/70 transition-colors select-none focus-visible:outline-2 focus-visible:outline-sky-400 focus-visible:outline-offset-1 rounded-md">
        <div>
          <span>Evidence &amp; tools</span>
          <span className="ml-2 text-white/20 font-normal">
            {highlight ? (
              <>
                <span className="text-white/40">{highlight}</span>
                <span className="text-white/20"> · Metrics · Trendline · Transition</span>
              </>
            ) : (
              "Simulator · Metrics · Trendline · Transition"
            )}
          </span>
        </div>
        <span className="text-white/20 group-open:rotate-90 transition-transform">▸</span>
      </summary>
      {open ? (
        <div className="px-4 pb-4 space-y-4">
          {children}
        </div>
      ) : null}
    </details>
  );
}
