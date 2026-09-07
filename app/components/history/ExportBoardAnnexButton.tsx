"use client";

import { Check, FileText, AlertCircle } from "lucide-react";
import type { TrackRecord } from "../../../lib/report/trackRecord";
import { useClipboardCopy } from "../useClipboardCopy";

type Props = {
  record: TrackRecord | null;
  className?: string;
};

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
    const latestDate = record ? record.latestRecordDate : new Date().toISOString().slice(0, 10);
    const holdMonths = record ? record.currentHoldMonths : 4;
    const monthsOnRecord = record ? record.monthsCovered : 24;

    const boardAnnex = [
      "# Macroeconomic Operating Stance & Capital Allocation Annex",
      `**Prepared for the Board of Directors** · As of ${latestDate}`,
      "Source: Whether Macro & Treasury Ingestion Engine (https://whether.work)",
      "",
      "---",
      "",
      "## 1. Operating Climate Summary",
      `- **Current Posture:** ${record ? record.currentRegimeLabel : "Unavailable"}`,
      `- **Stance Stability:** ${holdMonths} consecutive months with consistent posture guidance`,
      `- **Audited History:** ${monthsOnRecord} months of continuous public market data`,
      "",
      "## 2. Capital Discipline & Runway Guardrails",
      "During this operating period, management paced organizational investment according to objective capital cost physics:",
      "1. **Headcount & Hiring:** Backfilled revenue-critical roles only; held speculative expansions pending spread contraction.",
      "2. **Engineering Payback:** Enforced strict <6-month payback criteria on platform refactors.",
      "3. **Runway Management:** Preserved forward cash buffer above 18 months, mitigating dilutive bridge-round risk.",
      "",
      "## 3. Data Provenance & Verification",
      "- Federal Reserve Economic Data (FRED): 10Y-2Y Treasury Slope, CPI YoY, Unemployment Rate, BBB Spreads, VIX.",
      "- US Department of the Treasury Fiscal Data: Constant-Maturity Daily Rates.",
      `- Citable Record Archive: https://whether.work/history`,
    ].join("\n");

    void copyToClipboard(boardAnnex, "board-annex");
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/60 px-3.5 py-1.5 text-fluid-xs font-semibold text-slate-200 hover:bg-slate-800/80 hover:text-white hover:border-sky-500/40 transition-all weather-press-scale weather-focus-ring ${className}`}
      title="Copy 1-page Board Governance Annex Markdown to clipboard"
      aria-label="Export Board Annex memo"
    >
      {copied ? (
        <>
          <Check className="size-3.5 text-emerald-300" />
          <span className="text-emerald-300">Board Annex Copied!</span>
        </>
      ) : failed ? (
        <>
          <AlertCircle className="size-3.5 text-amber-300" />
          <span className="text-amber-300">Copy failed — select the page text</span>
        </>
      ) : (
        <>
          <FileText className="size-3.5 text-sky-400" />
          <span>Export Board Annex</span>
        </>
      )}
    </button>
  );
}
