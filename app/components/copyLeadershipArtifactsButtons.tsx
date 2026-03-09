"use client";

import Link from "next/link";
import { Button } from "@base-ui/react/button";
import { useClipboardCopy } from "./useClipboardCopy";
import { useHapticFeedback } from "./useHapticFeedback";
import { trackContentCtaConversion } from "../../lib/contentMeasurement";

type PrimaryActionType = "copy_weekly_brief" | "view_action_playbook" | "inspect_evidence";

const trackFirstActionConversion = (action: PrimaryActionType) => {
  trackContentCtaConversion({
    pagePath: "/",
    cluster: "tool",
    intent: "board",
    ctaId: `homepage_top_fold_${action}`,
    internalPath:
      action === "view_action_playbook"
        ? "/operations"
        : action === "inspect_evidence"
          ? "/signals"
          : undefined,
  });
};

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
  const haptic = useHapticFeedback();
  const isCopying = status === "copying";

  const handleExportPdf = () => {
    haptic.confirm();
    window.print();
  };

  const copyLabel = (target: "Slack" | "Board" | "Citation", label: string) =>
    isCopying && activeTarget === target ? "Copying" : label;

  const secondaryActionClassName = "weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation";

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-3" aria-label="Primary weekly brief actions">
        <Button
          type="button"
          onClick={() => {
            trackFirstActionConversion("copy_weekly_brief");
            copyToClipboard(slackBrief, "Slack");
          }}
          disabled={isCopying}
          aria-busy={isCopying}
          className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation"
        >
          {copyLabel("Slack", "Copy weekly brief")}
        </Button>

        <Link
          href="/operations"
          onClick={() => {
            haptic.navigate();
            trackFirstActionConversion("view_action_playbook");
          }}
          className={secondaryActionClassName}
        >
          View action playbook
        </Link>

        <Link
          href="/signals"
          onClick={() => {
            haptic.navigate();
            trackFirstActionConversion("inspect_evidence");
          }}
          className={secondaryActionClassName}
        >
          Inspect evidence
        </Link>
      </div>

      <details className="w-full">
        <summary className="weather-button inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200 sm:w-auto">
          More artifact actions
        </summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
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
            onClick={handleExportPdf}
            className={secondaryActionClassName}
          >
            Export PDF
          </Button>
        </div>
      </details>
    </div>
  );
}
