"use client";

import { Check, FileText, AlertCircle } from "lucide-react";
import type { TrackRecord } from "../../../lib/report/trackRecord";
import { useClipboardCopy } from "../useClipboardCopy";

type Props = {
  record: TrackRecord | null;
  className?: string;
};

/*
 * The copied memo is built from the record and nothing else.
 *
 * It used to be headed "Prepared for the Board of Directors" and carry a section
 * asserting, unconditionally, that "management paced organizational investment
 * according to objective capital cost physics", backfilled revenue-critical roles
 * only, enforced a six-month payback bar on refactors and held an 18-month cash
 * buffer — statements about the reader's company that no reading produced, in a
 * document labelled for their board. With no record it still wrote "4 consecutive
 * months". Every line here now names something the archive holds, and the button
 * is disabled rather than inventing a record when there is none.
 */
export const buildRecordSummary = (record: TrackRecord, origin: string) =>
  [
    "# Whether: what the record shows",
    `Prepared from Whether's public record · As of ${record.latestRecordDate}`,
    `Source: Whether (${origin})`,
    "",
    "## The reading",
    `- **Conditions:** ${record.currentRegimeLabel}`,
    `- **Held for:** ${record.currentHoldMonths} consecutive month-end readings`,
    `- **Record length:** ${record.monthsCovered} months of public market data`,
    "",
    "## Sources",
    "- Federal Reserve Economic Data (FRED): Treasury yields, credit spreads, VIX, and the Chicago Fed financial conditions index.",
    "- US Department of the Treasury: constant-maturity daily rates.",
    `- The full record: ${origin}/history`,
  ].join("\n");

export function ExportBoardAnnexButton({ record, className = "" }: Props) {
  /*
   * This used to be `void navigator.clipboard.writeText(...)` inside a
   * try/catch, then `setCopied(true)` on the next line. `void` discards the
   * promise, so a rejected write is an unhandled rejection rather than a
   * synchronous throw and the catch could never fire — the button said "Board
   * Annex Copied!" for a memo that never reached the clipboard. The shared hook
   * awaits the write and separates "clipboard unavailable" from "write failed".
   */
  const { status, copyToClipboard } = useClipboardCopy({ resetDelay: 2500 });
  const copied = status === "copied";
  const failed = status === "error";

  const handleExport = () => {
    if (!record) return;
    void copyToClipboard(buildRecordSummary(record, window.location.origin), "board-annex");
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={!record}
      className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/60 px-3.5 py-1.5 text-fluid-xs font-semibold text-slate-200 hover:bg-slate-800/80 hover:text-white hover:border-sky-500/40 transition-all weather-press-scale weather-focus-ring disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      title="Copy a short memo of what the month-end record shows"
      aria-label="Copy the record summary"
    >
      {copied ? (
        <>
          <Check className="size-3.5 text-emerald-300" />
          <span className="text-emerald-300">Copied</span>
        </>
      ) : failed ? (
        <>
          <AlertCircle className="size-3.5 text-amber-300" />
          <span className="text-amber-300">Copy failed — select the page text</span>
        </>
      ) : (
        <>
          <FileText className="size-3.5 text-sky-400" />
          <span>Copy the record summary</span>
        </>
      )}
    </button>
  );
}
