"use client";

import { Button } from "@base-ui/react/button";
import { useClipboardCopy } from "./useClipboardCopy";

export function CopySlackBriefButton({ brief }: { brief: string }) {
  const { status, activeTarget, copyToClipboard } = useClipboardCopy();
  const isCopying = status === "copying";

  return (
    <Button
      type="button"
      onClick={() => copyToClipboard(brief, "Slack")}
      disabled={isCopying}
      aria-busy={isCopying}
      className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation"
    >
      {isCopying && activeTarget === "Slack" ? "Copying" : "Copy Slack brief"}
    </Button>
  );
}
