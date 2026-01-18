/**
 * Weekly summary sharing card for quick copy and API retrieval.
 * Provides copy-ready text with direct access to the weekly summary endpoint.
 */
"use client";

import { useState } from "react";
import type { WeeklySummary } from "../../lib/weeklySummary";

export const WeeklySummaryCard = ({ summary }: { summary: WeeklySummary }) => {
  const [isCopying, setIsCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const handleCopy = async () => {
    if (isCopying) {
      return;
    }
    if (!navigator.clipboard?.writeText) {
      setCopyError(true);
      return;
    }
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(summary.copy);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div className="weather-surface mt-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Copy-ready summary card
          </p>
          <p className="mt-2 text-sm text-slate-300">
            Share the weekly posture in one pasteable block or pull it from the API for reuse.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={isCopying}
            aria-busy={isCopying}
            className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs uppercase tracking-[0.2em] transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
          >
            {isCopying ? "Copying" : copied ? "Copied" : "Copy summary"}
          </button>
          <a
            href="/api/weekly"
            className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs uppercase tracking-[0.2em] transition-colors hover:border-sky-400/70 hover:text-slate-100"
          >
            View weekly API
          </a>
        </div>
      </div>
      <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-slate-800/80 bg-slate-950/80 p-4 text-xs text-slate-100">
        {summary.copy}
      </pre>
      <div className="mt-2 min-h-[20px] text-xs text-slate-400" role="status" aria-live="polite">
        {copyError ? "Clipboard blocked. Select and copy the text above manually." : ""}
      </div>
    </div>
  );
};
