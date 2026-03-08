"use client";

import { Button } from "@base-ui/react/button";
import { useClipboardCopy } from "./useClipboardCopy";

export function CopyLeadershipArtifactsButtons({
  slackBrief,
  boardSummary,
  citation,
}: {
  slackBrief: string;
  boardSummary: string;
  citation: string;
}) {
  const { status, activeTarget, copyToClipboard } = useClipboardCopy();
  const isCopying = status === "copying";

  const copyLabel = (target: "Slack" | "Board" | "Citation", label: string) =>
    isCopying && activeTarget === target ? "Copying" : label;

  const secondaryActionClassName = "weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        onClick={() => copyToClipboard(slackBrief, "Slack")}
        disabled={isCopying}
        aria-busy={isCopying}
        className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation"
      >
        {copyLabel("Slack", "Copy Slack brief")}
      </Button>

      <div className="hidden flex-wrap items-center gap-2 sm:flex">
        <Button
          type="button"
          onClick={() => copyToClipboard(boardSummary, "Board")}
          disabled={isCopying}
          aria-busy={isCopying}
          className={secondaryActionClassName}
        >
          {copyLabel("Board", "Copy board summary")}
        </Button>
        <Button
          type="button"
          onClick={() => copyToClipboard(citation, "Citation")}
          disabled={isCopying}
          aria-busy={isCopying}
          className={secondaryActionClassName}
        >
          {copyLabel("Citation", "Copy citation")}
        </Button>
        <Button
          type="button"
          onClick={() => window.print()}
          className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 touch-manipulation"
        >
          Export PDF
        </Button>
      </div>

      <Button
        type="button"
        onClick={() => copyToClipboard(citation, "Citation")}
        disabled={isCopying}
        aria-busy={isCopying}
        className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation sm:hidden"
      >
        {copyLabel("Citation", "Copy citation")}
      </Button>

      <details className="w-full sm:hidden">
        <summary className="weather-button inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200">
          More actions
        </summary>
        <div className="mt-2 grid gap-2">
          <Button
            type="button"
            onClick={() => copyToClipboard(boardSummary, "Board")}
            disabled={isCopying}
            aria-busy={isCopying}
            className={secondaryActionClassName}
          >
            {copyLabel("Board", "Copy board summary")}
          </Button>
          <Button
            type="button"
            onClick={() => window.print()}
            className={secondaryActionClassName}
          >
            Export PDF
          </Button>
        </div>
      </details>
    </div>
  );
}
