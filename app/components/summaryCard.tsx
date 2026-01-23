/**
 * Shared summary sharing card for quick copy and API retrieval.
 * Keeps posture guidance shareable across the Regime Station UI.
 */
"use client";

import { Button } from "@base-ui/react/button";
import { useState } from "react";

type SummaryCardProps = {
  summaryCopy: string;
  cadenceLabel: string;
  apiHref: string;
};

export const SummaryCard = ({ summaryCopy, cadenceLabel, apiHref }: SummaryCardProps) => {
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
      await navigator.clipboard.writeText(summaryCopy);
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
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
            Copy-ready summary card
          </p>
          <p className="mt-2 text-sm text-slate-300">
            Share the {cadenceLabel} posture in one pasteable block or pull it from the API for reuse.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={handleCopy}
            disabled={isCopying}
            aria-busy={isCopying}
            className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-300/80 hover:text-white disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation"
          >
            {isCopying ? "Copying" : copied ? "Copied" : "Copy summary"}
          </Button>
          <a
            href={apiHref}
            className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-slate-500/80 hover:text-slate-100 touch-manipulation"
          >
            View {cadenceLabel} API
          </a>
        </div>
      </div>
      <pre className="mt-4 whitespace-pre-wrap rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 text-xs text-slate-100">
        {summaryCopy}
      </pre>
      <div className="mt-2 min-h-[20px] text-xs text-slate-400" role="status" aria-live="polite">
        {copyError ? "Clipboard blocked. Select and copy the text above manually." : ""}
      </div>
    </div>
  );
};
