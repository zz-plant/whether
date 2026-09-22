"use client";

import Link from "next/link";
import { Popover } from "@base-ui/react/popover";
import { Info } from "lucide-react";
import { formatConfidenceChipLabel } from "../../lib/report/reportFormatting";
import { Tag } from "./ui/tag";

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

const POPOVER_LINK_CLASS =
  "mt-1 inline-flex min-h-[44px] items-center text-[11px] font-medium text-sky-400 underline decoration-sky-400/30 underline-offset-2 hover:text-sky-300";

/**
 * The confidence chip beside the week title, and behind it the sources, the
 * record date and the track record.
 *
 * The popover is Base UI's, like every other one here: it owned a fourth copy of
 * the outside-click and Escape listeners that `thresholdsPanel` and
 * `dataProvenanceStrip` had already stopped writing. The chip used to carry a
 * pulsing dot with nothing live behind it — the confidence is a fact about a
 * distance, computed once a week — so the dot is gone rather than given a
 * reduced-motion path.
 */
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
  if (isHistorical) {
    return <Tag tone="amber">Past week</Tag>;
  }

  return (
    <Popover.Root>
      <Popover.Trigger className="weather-chip inline-flex min-h-11 items-center gap-1.5 text-sky-200 sm:min-h-8">
        <span>{formatConfidenceChipLabel(confidenceLabel)}</span>
        <Info size={12} className="text-sky-400/80" aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8} className="z-50">
          <Popover.Popup
            aria-label="Sources and freshness"
            className="w-72 rounded-xl border border-slate-800 bg-slate-950/95 p-3.5 text-xs shadow-2xl"
          >
            <Popover.Title className="mb-2.5 border-b border-white/[0.08] pb-2 text-xs font-semibold text-white">
              Sources
            </Popover.Title>

            <div className="space-y-2 text-xs">
              {/* The series codes sit under each row rather than beside it. A
                  reader who knows FRED can check the input in one click; one who
                  does not loses nothing, because the row still names the source
                  in words. */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Treasury rates:</span>
                  <span className="max-w-[140px] truncate font-medium text-sky-300" title={treasurySource}>
                    {describeTreasurySource(treasurySource)}
                  </span>
                </div>
                <p className="text-right font-mono text-[10px] text-slate-500">
                  St. Louis Fed (FRED) · {SERIES_CODES.yieldCurve.join(" · ")}
                </p>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Credit &amp; stress:</span>
                  <span className="font-medium text-sky-300">St. Louis Fed (FRED)</span>
                </div>
                <p className="text-right font-mono text-[10px] text-slate-500">
                  FRED · {SERIES_CODES.creditAndStress.join(" · ")}
                </p>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Status:</span>
                <span className="font-medium text-white">
                  {degradedCount === 0 ? "All sources live" : `${degradedCount} not live`}
                </span>
              </div>
              {recordDateLabel && (
                <div className="flex items-center justify-between border-t border-white/[0.04] pt-1 text-slate-300">
                  <span className="text-slate-400">Record date:</span>
                  <span className="text-slate-300 tabular-nums">{recordDateLabel}</span>
                </div>
              )}
              {fetchedAtLabel && (
                <div className="flex items-center justify-between text-slate-300">
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
              <div className="mt-3 border-t border-white/[0.08] pt-2 text-xs text-slate-300">
                <p className="tabular-nums">
                  {MONTHS.format(record.monthsCovered)} months on record · {describeRecord(record, regime)}
                </p>
                <Link href="/history#track-record" className={POPOVER_LINK_CLASS}>
                  See the record
                </Link>
              </div>
            ) : null}

            <div className="mt-3 flex items-center justify-between border-t border-white/[0.08] pt-2">
              <span className="text-[10px] text-slate-500">Same rule every week</span>
              <Link href="/trust" className={POPOVER_LINK_CLASS}>
                How the score is built
              </Link>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
