/**
 * Shared summary sharing card for quick copy and API retrieval.
 * Keeps posture guidance shareable across the Regime Station UI.
 */
"use client";

import { Button } from "@base-ui/react/button";
import { Toast } from "@base-ui/react/toast";
import { Tooltip } from "@base-ui/react/tooltip";
import { useEffect, useRef } from "react";
import { useClipboardCopy, type ClipboardCopyState } from "./useClipboardCopy";

type SummaryCardProps = {
  summaryCopy: string;
  cadenceLabel: string;
  apiHref: string;
};

export const SummaryCard = ({ summaryCopy, cadenceLabel, apiHref }: SummaryCardProps) => {
  const { status, error, copyToClipboard } = useClipboardCopy();
  const lastStatusRef = useRef<ClipboardCopyState["status"]>("idle");
  const lastErrorRef = useRef<"blocked" | "failed" | null>(null);
  const { add } = Toast.useToastManager();

  useEffect(() => {
    if (status === lastStatusRef.current) {
      return;
    }
    if (status === "copied") {
      add({
        title: "Summary copied",
        description: "Paste the posture card wherever you need it.",
      });
      lastErrorRef.current = null;
    }
    if (status === "error") {
      const isBlocked = lastErrorRef.current === "blocked";
      add({
        title: isBlocked ? "Clipboard blocked" : "Copy failed",
        description: isBlocked
          ? "Select the summary block to copy it manually."
          : "Select the summary text and copy it manually.",
      });
    }
    if (status === "idle") {
      lastErrorRef.current = null;
    }
    lastStatusRef.current = status;
  }, [add, status]);

  const handleCopy = async () => {
    if (status === "copying") {
      return;
    }
    lastErrorRef.current = navigator.clipboard?.writeText ? "failed" : "blocked";
    await copyToClipboard(summaryCopy);
  };

  const isCopying = status === "copying";
  const copied = status === "copied";
  const copyError = error;
  const errorMessage =
    lastErrorRef.current === "blocked"
      ? "Clipboard blocked. Select and copy the text above manually."
      : "Copy failed. Select and copy the text above manually.";

  return (
    <div className="weather-surface mt-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
              Copy-ready summary card
            </p>
            <Tooltip.Root>
              <Tooltip.Trigger
                type="button"
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-800/80 text-[10px] font-semibold text-slate-400 transition-colors hover:border-slate-600/70 hover:text-slate-200"
                aria-label="Summary card details"
              >
                i
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Positioner side="top" align="center" sideOffset={8}>
                  <Tooltip.Popup className="max-w-[220px] rounded-xl border border-slate-700/80 bg-slate-950/95 px-3 py-2 text-xs text-slate-200 shadow-lg">
                    Includes the posture summary plus API pointers for sharing with stakeholders.
                  </Tooltip.Popup>
                </Tooltip.Positioner>
              </Tooltip.Portal>
            </Tooltip.Root>
          </div>
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
      <pre
        tabIndex={0}
        aria-label="Summary card text"
        className="mt-4 whitespace-pre-wrap rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 text-xs text-slate-100"
      >
        {summaryCopy}
      </pre>
      <div className="mt-2 min-h-[20px] text-xs text-slate-400" role="status" aria-live="polite">
        {copyError ? errorMessage : copied ? "Summary copied to clipboard." : ""}
      </div>
    </div>
  );
};
