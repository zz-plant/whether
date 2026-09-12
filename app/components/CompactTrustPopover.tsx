"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Info, ExternalLink } from "lucide-react";

export interface CompactTrustPopoverProps {
  confidenceLabel: string;
  isHistorical?: boolean;
  fetchedAtLabel?: string;
  recordDateLabel?: string;
  treasurySource?: string;
  degradedCount?: number;
}

export function CompactTrustPopover({
  confidenceLabel,
  isHistorical = false,
  fetchedAtLabel,
  recordDateLabel,
  treasurySource = "U.S. Department of the Treasury",
  degradedCount = 0,
}: CompactTrustPopoverProps) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (e.target instanceof Node && popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  if (isHistorical) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300">
        <span className="h-2 w-2 rounded-full bg-amber-400" />
        <span>Archived Snapshot</span>
      </span>
    );
  }

  return (
    <div ref={popoverRef} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 rounded-md border border-teal-500/30 bg-teal-500/10 px-2.5 py-1 text-xs font-medium text-teal-300 hover:bg-teal-500/20 transition-colors cursor-pointer"
      >
        <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
        <span>{confidenceLabel}</span>
        <Info size={12} className="text-teal-400/70 ml-0.5" />
      </button>

      {open && (
        <div
          aria-label="Data provenance and trust status"
          className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-slate-800 bg-slate-950/95 p-3.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-white/[0.08]">
            <ShieldCheck size={16} className="text-teal-400" />
            <h4 className="text-xs font-semibold text-white">Provenance &amp; Trust</h4>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">Yield Curve:</span>
              <span className="font-medium text-teal-300 truncate max-w-[140px]" title={treasurySource}>
                {treasurySource.includes("Treasury") ? "Daily Treasury Par" : treasurySource}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">Credit Spreads:</span>
              <span className="font-medium text-teal-300">St. Louis Fed (FRED)</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">Feed Health:</span>
              <span className="font-medium text-white">
                {degradedCount === 0 ? "100% Verified Primary" : `${degradedCount} degraded`}
              </span>
            </div>
            {recordDateLabel && (
              <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-white/[0.04]">
                <span className="text-slate-400">Record date:</span>
                <span className="text-slate-300 tabular-nums">{recordDateLabel}</span>
              </div>
            )}
            {fetchedAtLabel && (
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Refreshed:</span>
                <span className="text-slate-300 tabular-nums">{fetchedAtLabel}</span>
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-white/[0.08] flex justify-between items-center">
            <span className="text-[10px] text-slate-500">Deterministic model</span>
            <Link
              href="/trust"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-400 hover:text-teal-300 no-underline"
            >
              <span>Full methodology</span>
              <ExternalLink size={10} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
