"use client";

import { useId, useState, useEffect, useRef } from "react";

export type FreshnessDotProps = {
  label: string;
  recordDate?: string;
  treasurySource?: string;
  trustStatusLabel?: string;
  degradedSourceRows?: Array<{
    sourceName: string;
    modeLabel: string;
    freshnessStatus: string;
  }>;
  showOfflineBadge?: boolean;
};

export function FreshnessDot({
  label,
  recordDate,
  treasurySource,
  trustStatusLabel,
  degradedSourceRows = [],
  showOfflineBadge,
}: FreshnessDotProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const clickAway = (event: MouseEvent) => {
      if (event.target instanceof Node && containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", clickAway);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", clickAway);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const hasDegraded = degradedSourceRows.length > 0;
  const statusColor = showOfflineBadge
    ? "bg-rose-400/80"
    : hasDegraded
    ? "bg-amber-400/80"
    : "bg-emerald-400/80";

  return (
    <div ref={containerRef} className="relative flex flex-col items-center justify-center py-1.5">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-white/[0.06] bg-white/[0.03] text-fluid-nano text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${statusColor} animate-pulse`} aria-hidden="true" />
        <span>Updated {label}</span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="region"
          aria-label="Data freshness"
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-72 rounded-xl border border-white/[0.08] bg-[var(--bg-raised)]/96 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl space-y-3 text-left"
        >
          <div>
            <p className="text-fluid-nano font-semibold tracking-[0.04em] text-white/45 uppercase">Data Freshness</p>
            <p className="text-fluid-xs text-white/80 mt-1">
              {showOfflineBadge ? "Offline Backup Mode" : "Live Macro Feeds Active"}
            </p>
          </div>

          <div className="space-y-1.5 text-fluid-nano border-t border-white/[0.04] pt-2">
            <div className="flex justify-between">
              <span className="text-white/40">Record Date</span>
              <span className="text-white/70 font-mono">{recordDate ?? "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Refreshed</span>
              <span className="text-white/70 font-mono">{label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Primary Source</span>
              <span className="text-white/70 font-mono">{treasurySource ?? "US Treasury"}</span>
            </div>
            {trustStatusLabel ? (
              <div className="flex justify-between">
                <span className="text-white/40">Trust Rating</span>
                <span className="text-white/70">{trustStatusLabel}</span>
              </div>
            ) : null}
          </div>

          {degradedSourceRows.length ? (
            <div className="border-t border-white/[0.04] pt-2">
              <p className="text-fluid-nano font-semibold tracking-[0.04em] text-white/45 uppercase mb-1.5">
                Upstream Feed Details
              </p>
              <div className="space-y-1">
                {degradedSourceRows.map((row, index) => (
                  <div key={index} className="flex justify-between text-fluid-nano">
                    <span className="text-white/50 truncate max-w-[12rem]">{row.sourceName}</span>
                    <span className="text-amber-300/80 font-mono text-[0.6rem]">{row.freshnessStatus}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="border-t border-white/[0.04] pt-2 text-fluid-nano text-emerald-300/80">
              ✓ All upstream feeds checked & online.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
