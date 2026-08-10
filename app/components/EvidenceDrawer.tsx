"use client";

import { ChevronRight } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

export function EvidenceDrawer({ children, highlight }: { children?: ReactNode; highlight?: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <section className="group rounded-xl border border-slate-800/80 bg-slate-900/50 shadow-md backdrop-blur-md overflow-hidden transition-all duration-200" aria-label="Evidence and scenarios">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className={`flex w-full min-h-12 cursor-pointer items-center justify-between gap-3 px-4 py-3.5 text-left text-fluid-xs font-medium text-slate-200 transition-colors hover:bg-slate-800/40 select-none weather-focus-ring weather-press-scale ${
          highlight ? "border-l-4 border-l-sky-400" : ""
        }`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="font-semibold text-white">Evidence &amp; scenarios</span>
          {highlight ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-400/15 px-2.5 py-0.5 text-fluid-nano font-mono font-semibold text-sky-200 shadow-[0_0_10px_rgba(56,189,248,0.15)]">
              ★ {highlight}
            </span>
          ) : null}
          <span className="hidden sm:inline-block h-3 w-px bg-slate-700/60" aria-hidden="true" />
          <span className="truncate text-fluid-nano text-slate-400 font-mono">
            Simulator · Signals · Trendline · Shift risk
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 group-hover:text-white transition-colors">
          <span className="text-fluid-nano font-mono uppercase tracking-wider">{open ? "Hide evidence" : "Inspect data"}</span>
          <ChevronRight
            className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "rotate-90 text-sky-400" : ""} ${highlight ? "text-sky-300" : ""}`}
            aria-hidden="true"
          />
        </div>
      </button>
      <div id={panelId} hidden={!open}>
        <div className="px-4 pb-4 pt-1 border-t border-slate-800/60 space-y-4">
          <div className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-3">
            <p className="text-fluid-nano text-slate-400 leading-relaxed font-mono">
              <span className="text-sky-400 font-semibold">Simulator:</span> test macro shocks · <span className="text-sky-400 font-semibold">Signals:</span> U.S. market drivers · <span className="text-sky-400 font-semibold">Trendline:</span> regime history · <span className="text-sky-400 font-semibold">Shift risk:</span> transition probability.
            </p>
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}
