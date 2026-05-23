"use client";

import { useClipboardCopy } from "../useClipboardCopy";

type StatusLineProps = {
  tightness: number;
  reliabilityScore?: number;
  postureLabel?: string;
  pauseThreshold?: number;
  trendLabel?: string;
  recordDate?: string;
};

export function StatusLine({
  tightness,
  reliabilityScore,
  postureLabel,
  pauseThreshold = 80,
  trendLabel,
  recordDate,
}: StatusLineProps) {
  const { status, copyToClipboard } = useClipboardCopy();

  const ptsToPause = pauseThreshold - tightness;
  const isClose = ptsToPause <= 3;
  const statusColor = ptsToPause <= 0 ? "bg-rose-500" : isClose ? "bg-amber-500" : "bg-emerald-500";

  const statusText = [
    `Tightness ${tightness}`,
    reliabilityScore != null ? `· ${reliabilityScore}% reliable` : null,
    postureLabel ? `· ${postureLabel}` : null,
    ptsToPause > 0 ? `· ${ptsToPause} pts to pause` : `· PAUSE TRIGGERED`,
    trendLabel ? `· ${trendLabel}` : null,
    `· whether.work`,
  ].filter(Boolean).join(" ");

  const handleCopy = async () => {
    await copyToClipboard(statusText, "Status line");
  };

  return (
    <div className="flex items-center gap-3 text-fluid-xs">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${statusColor}`} aria-hidden="true" />
        <span className="text-slate-300 truncate">{statusText}</span>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="flex-shrink-0 rounded px-2 py-0.5 text-fluid-micro text-slate-500 hover:text-sky-300 transition-colors"
        title="Copy status line"
      >
        {status === "copied" ? "Copied" : "Copy"}
      </button>
      {recordDate ? (
        <span className="text-slate-600 flex-shrink-0 hidden sm:inline">{recordDate}</span>
      ) : null}
    </div>
  );
}
