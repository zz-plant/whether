/**
 * Weekly summary card with copy-ready output and API link for sharing.
 */
"use client";

import { useRef, useState } from "react";
import type { WeeklySummary } from "../../lib/weeklySummary";

type WeeklySummaryCardProps = {
  summary: WeeklySummary;
  apiHref: string;
};

const statusLabels = {
  idle: "Copy the summary for chat, email, or docs.",
  copying: "Copying summary to clipboard.",
  copied: "Summary copied to clipboard.",
  failed: "Copy failed. Select and copy manually.",
} as const;

export const WeeklySummaryCard = ({ summary, apiHref }: WeeklySummaryCardProps) => {
  const [status, setStatus] = useState<keyof typeof statusLabels>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCopying = status === "copying";

  const handleCopy = async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setStatus("copying");
    try {
      await navigator.clipboard.writeText(summary.summaryText);
      setStatus("copied");
    } catch {
      setStatus("failed");
    } finally {
      timeoutRef.current = setTimeout(() => {
        setStatus("idle");
      }, 2400);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-slate-800/70 bg-slate-950/70 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="type-label text-slate-400">This week's whether</p>
          <p className="mt-2 text-sm text-slate-200">
            <span className="text-slate-100">{summary.regimeLabel}.</span>{" "}
            {summary.actionGuidance}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCopy}
            disabled={isCopying}
            className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation"
          >
            {isCopying ? "Copying..." : "Copy summary"}
          </button>
          <a
            href={apiHref}
            className="touch-target inline-flex min-h-[44px] items-center text-xs uppercase tracking-[0.2em] text-slate-300 underline decoration-slate-700 underline-offset-4 hover:text-slate-100 touch-manipulation"
          >
            API /weekly
          </a>
        </div>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-slate-200">
        {summary.constraints.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-slate-500" aria-hidden="true">
              •
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-500">Record date</span>
          <span className="mono text-slate-200">{summary.recordDateLabel}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-500">Fetched</span>
          <span className="mono text-slate-200">{summary.fetchedAtLabel}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-500">Source</span>
          <a
            href={summary.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="touch-target inline-flex min-h-[44px] items-center text-slate-200 underline decoration-slate-700 underline-offset-4 hover:text-slate-100 touch-manipulation"
          >
            {summary.sourceLabel}
          </a>
        </div>
      </div>
      <p className="mt-3 min-h-[18px] text-[11px] text-slate-400" aria-live="polite">
        {statusLabels[status]}
      </p>
    </div>
  );
};
