"use client";

import { useId, useState, useEffect, useRef } from "react";
import { CheckIcon, StatusLiveIcon, StatusStaticIcon } from "./uiIcons";
import { resolveDataStatusGuidance, resolveDataStatusLabel } from "../../lib/report/trustStatus";

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
    ? "text-rose-300"
    : hasDegraded
    ? "text-amber-300"
    : "text-emerald-300";

  return (
    <div ref={containerRef} className="relative flex flex-col items-center justify-center py-1.5">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-11 items-center gap-2 px-3 py-2 rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-nested)] text-fluid-nano text-slate-300 transition-colors hover:border-[color:var(--border-default)] hover:text-white weather-focus-ring weather-press-scale"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        {/* Shape carries the state alongside color: circle = fully live feed, square = static
            input present (snapshot or cached/degraded sources) — and the pulse means "live". */}
        <span className={`inline-flex items-center gap-1 type-badge ${statusColor}`}>
          {showOfflineBadge || hasDegraded ? (
            <StatusStaticIcon className="size-1.5" />
          ) : (
            <StatusLiveIcon className="size-1.5 motion-safe:animate-pulse" />
          )}
          {resolveDataStatusLabel({ isFallbackSnapshot: showOfflineBadge, degradedSourceCount: degradedSourceRows.length })}
        </span>
        <span>{recordDate ? `Data through ${recordDate} · refreshed ${label}` : `Data as of ${label}`}</span>
      </button>

      {open ? (
        <section
          id={menuId}
          aria-label="Data freshness"
          className="absolute top-full left-0 mt-2 z-50 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-[color:var(--border-default)] bg-[var(--bg-raised)] p-4 shadow-2xl backdrop-blur-xl space-y-3 text-left overscroll-contain"
        >
          <div>
            <p className="text-fluid-nano font-semibold tracking-[0.04em] text-slate-400 uppercase">Data status</p>
            <p className="text-fluid-xs text-slate-200 mt-1">
              {resolveDataStatusGuidance({ isFallbackSnapshot: showOfflineBadge, degradedSourceCount: degradedSourceRows.length })}
            </p>
          </div>

          <div className="space-y-1.5 text-fluid-nano border-t border-[color:var(--border-subtle)] pt-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Data date</span>
              <span className="text-slate-200 font-mono">{recordDate ?? "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Refreshed</span>
              <span className="text-slate-200 font-mono">{label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Source</span>
              <span className="text-slate-200 font-mono">{treasurySource ?? "US Treasury"}</span>
            </div>
            {trustStatusLabel ? (
              <div className="flex justify-between">
                <span className="text-slate-400">Trust Rating</span>
                <span className="text-slate-200">{trustStatusLabel}</span>
              </div>
            ) : null}
          </div>

          {degradedSourceRows.length ? (
            <div className="border-t border-[color:var(--border-subtle)] pt-2">
              <p className="text-fluid-nano font-semibold tracking-[0.04em] text-slate-400 uppercase mb-1.5">
                Cached or delayed feeds
              </p>
              <div className="space-y-1">
                {degradedSourceRows.map((row, index) => (
                  <div key={index} className="flex justify-between text-fluid-nano">
                    <span className="text-slate-400 truncate max-w-[12rem]" title={row.sourceName}>{row.sourceName}</span>
                    <span className="text-amber-300/80 font-mono text-fluid-nano" title={`${row.sourceName}: ${row.freshnessStatus}`}>{row.freshnessStatus}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 border-t border-[color:var(--border-subtle)] pt-2 text-fluid-nano text-emerald-300/90">
              <CheckIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
              All macro feeds nominal.
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
