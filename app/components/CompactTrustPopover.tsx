"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Info, ExternalLink } from "lucide-react";
import { formatConfidenceChipLabel } from "../../lib/report/reportFormatting";

/**
 * The published series behind each row, by FRED code. Written here rather than
 * read off the ingestion families because those name a series per signal and
 * the popover names one per *row*; the codes are the same literals
 * `lib/ingestion/families.ts` fetches, and `/trust` spells out what each is.
 */
const SERIES_CODES = {
  yieldCurve: ["DGS1MO", "DGS2", "DGS10"],
  creditAndStress: ["BAMLH0A0HYM2", "VIXCLS"],
} as const;

/** The part of `TrackRecord` (`lib/report/trackRecord.ts`) the popover states. */
type CompactTrustRecord = {
  monthsCovered: number;
  currentHoldMonths: number;
  currentRegime: string;
  currentRegimeLabel: string;
};

/**
 * The record is a month-end series and the call is a weekly read, so inside a
 * month they can disagree: on 2026-09-15 the record's latest month was Sunny
 * and the hero said Freezing. "Sunny has held 9 months" beside a Freezing call
 * reads as a contradiction, and the honest sentence is the other one — the
 * call moved this month, after Sunny held nine.
 */
export const describeRecord = (record: CompactTrustRecord, regime: string | undefined) => {
  const held = `${record.currentHoldMonths} ${record.currentHoldMonths === 1 ? "month" : "months"}`;
  return regime && regime !== record.currentRegime
    ? `Call moved this month, after ${record.currentRegimeLabel} held ${held}`
    : `${record.currentRegimeLabel} has held ${held}`;
};

/** The source in words. A FRED series URL is what the shell carries once the
 *  Treasury read has fallen back to FRED, and a URL is not a source name. */
const describeTreasurySource = (source: string) =>
  source.includes("Treasury")
    ? "Daily Treasury Par"
    : source.includes("fred.stlouisfed.org")
      ? "St. Louis Fed (FRED)"
      : source;

interface CompactTrustPopoverProps {
  confidenceLabel: string;
  isHistorical?: boolean;
  fetchedAtLabel?: string;
  recordDateLabel?: string;
  treasurySource?: string;
  degradedCount?: number;
  /** Absent when the archive is too short to state a hold (`TRACK_RECORD_MIN_MONTHS`). */
  record?: CompactTrustRecord | null;
  /** The regime the hero states, so the record can say whether it still holds. */
  regime?: string;
}

const MONTHS = new Intl.NumberFormat("en-US");

export function CompactTrustPopover({
  confidenceLabel,
  isHistorical = false,
  fetchedAtLabel,
  recordDateLabel,
  treasurySource = "U.S. Department of the Treasury",
  degradedCount = 0,
  record = null,
  regime,
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
        <span>{formatConfidenceChipLabel(confidenceLabel)}</span>
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
            {/* The series codes sit under each row rather than beside it. A
                reader who knows FRED can check the input in one click; one who
                does not loses nothing, because the row still names the source
                in words. */}
            <div className="space-y-0.5">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Yield Curve:</span>
                <span className="font-medium text-teal-300 truncate max-w-[140px]" title={treasurySource}>
                  {describeTreasurySource(treasurySource)}
                </span>
              </div>
              <p className="text-right font-mono text-[10px] text-slate-500">
                FRED {SERIES_CODES.yieldCurve.join(" · ")}
              </p>
            </div>
            <div className="space-y-0.5">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Credit &amp; stress:</span>
                <span className="font-medium text-teal-300">St. Louis Fed (FRED)</span>
              </div>
              <p className="text-right font-mono text-[10px] text-slate-500">
                FRED {SERIES_CODES.creditAndStress.join(" · ")}
              </p>
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

          {/* Consistency, not accuracy: the engine does not forecast, so the
              one thing the record can honestly claim is how far back the same
              rule has been applied and how long the current call has stood.
              The same figures head /history, which is where the link lands. */}
          {record ? (
            <div className="mt-3 pt-2 border-t border-white/[0.08] text-xs text-slate-300">
              <p className="tabular-nums">
                {MONTHS.format(record.monthsCovered)} months on record · {describeRecord(record, regime)}
              </p>
              <Link
                href="/history#track-record"
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-teal-400 hover:text-teal-300 no-underline"
              >
                <span>Audit the record</span>
                <ExternalLink size={10} />
              </Link>
            </div>
          ) : null}

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
