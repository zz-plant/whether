"use client";

import { useState, type ButtonHTMLAttributes } from "react";
import { useClipboardCopy } from "./useClipboardCopy";
import { trackContentCtaConversion } from "../../lib/contentMeasurement";

type PrimaryActionType = "copy_weekly_brief";

type CopyTarget =
  | "Meeting pack"
  | "Weekly call snapshot"
  | "Weekly operator brief"
  | "Board"
  | "Citation";

type CopyState = "idle" | "copying" | "copied" | "error";
type ActionButtonVariant = "primary" | "secondary" | "confirm" | "danger";

const actionButtonBaseClassName =
  "inline-flex min-h-[44px] items-center justify-center text-xs font-semibold tracking-[0.12em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation";

export const actionButtonVariantClassNames: Record<ActionButtonVariant, string> = {
  primary: `weather-button-primary ${actionButtonBaseClassName} px-4 py-2 hover:border-sky-400/70 hover:text-slate-100`,
  secondary: `weather-button ${actionButtonBaseClassName} w-full px-3 py-2 hover:border-sky-400/70 hover:text-slate-100`,
  confirm: `weather-button-primary ${actionButtonBaseClassName} px-4 py-2`,
  danger: `weather-button ${actionButtonBaseClassName} px-4 py-2 text-rose-100 hover:border-rose-300/70 hover:text-rose-50`,
};

export const resolveCopyActionLabel = (state: CopyState, defaultLabel: string) => {
  if (state === "copying") return "Copying";
  if (state === "copied") return "Copied";
  if (state === "error") return "Retry copy";
  return defaultLabel;
};

function ActionButton({
  variant,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant: ActionButtonVariant }) {
  const variantClassName = actionButtonVariantClassNames[variant];
  return <button {...props} className={className ? `${variantClassName} ${className}` : variantClassName} />;
}

const trackFirstActionConversion = (action: PrimaryActionType) => {
  trackContentCtaConversion({
    pagePath: "/",
    cluster: "tool",
    intent: "board",
    ctaId: `homepage_top_fold_${action}`,
  });
};

export function CopyLeadershipArtifactsButtons({
  weeklyCallSnapshot,
  weeklyOperatorBrief,
  boardSummary,
  citation,
  fallbackActive = false,
}: {
  weeklyCallSnapshot: string;
  weeklyOperatorBrief: string;
  boardSummary: string;
  citation: string;
  fallbackActive?: boolean;
}) {
  const { status, activeTarget, copyToClipboard } = useClipboardCopy();
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const isCopying = status === "copying";

  const copyState = (target: CopyTarget): CopyState =>
    status === "copying" && activeTarget === target
      ? "copying"
      : status === "copied"
        ? "copied"
        : status === "error"
          ? "error"
          : "idle";

  const meetingPackContent = [
    "Weekly call snapshot",
    weeklyCallSnapshot,
    "",
    "WEEKLY OPERATOR BRIEF",
    weeklyOperatorBrief,
    "",
    "BOARD SUMMARY",
    boardSummary,
    "",
    "CITATION",
    citation,
  ].join("\n");

  const runExportPdf = () => {
    window.print();
  };

  const handleExportPdf = () => {
    if (fallbackActive && !window.confirm("Cached snapshot active. Confirm export before sharing this brief.")) {
      return;
    }
    runExportPdf();
  };

  const copyLabel = (target: CopyTarget, label: string) => resolveCopyActionLabel(copyState(target), label);

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label="Primary weekly brief actions">
        <ActionButton
          variant="primary"
          type="button"
          onClick={() => {
            trackFirstActionConversion("copy_weekly_brief");
            copyToClipboard(weeklyCallSnapshot, "Weekly call snapshot");
          }}
          disabled={isCopying}
          aria-busy={isCopying}
        >
          {copyLabel("Weekly call snapshot", "Copy weekly call snapshot")}
        </ActionButton>
        <ActionButton
          variant="primary"
          type="button"
          onClick={() => {
            trackFirstActionConversion("copy_weekly_brief");
            copyToClipboard(meetingPackContent, "Meeting pack");
          }}
          disabled={isCopying}
          aria-busy={isCopying}
        >
          {copyLabel("Meeting pack", "Copy Meeting Pack")}
        </ActionButton>

        <ActionButton
          variant="primary"
          type="button"
          onClick={() => {
            trackFirstActionConversion("copy_weekly_brief");
            copyToClipboard(weeklyOperatorBrief, "Weekly operator brief");
          }}
          disabled={isCopying}
          aria-busy={isCopying}
        >
          {copyLabel("Weekly operator brief", "Copy Weekly Operator Brief")}
        </ActionButton>

        <ActionButton
          variant="secondary"
          type="button"
          className="w-auto gap-1.5 px-4 text-slate-200"
          aria-expanded={moreActionsOpen}
          onClick={() => setMoreActionsOpen((open) => !open)}
        >
            More share actions
            <span aria-hidden="true" className="text-sm">▾</span>
        </ActionButton>
      </div>

      {moreActionsOpen ? (
        <div className="rounded-xl border border-slate-700/80 bg-slate-950/98 p-2 shadow-2xl">
          <div className="grid gap-2 sm:grid-cols-3">
            <ActionButton
              variant="secondary"
              type="button"
              onClick={() => copyToClipboard(boardSummary, "Board")}
              disabled={isCopying}
              aria-busy={isCopying}
            >
              {copyLabel("Board", "Copy board summary")}
            </ActionButton>
            <ActionButton
              variant="secondary"
              type="button"
              onClick={() => copyToClipboard(citation, "Citation")}
              disabled={isCopying}
              aria-busy={isCopying}
            >
              {copyLabel("Citation", "Copy citation")}
            </ActionButton>
            <ActionButton variant="secondary" type="button" onClick={handleExportPdf}>
              Export / print PDF
            </ActionButton>
          </div>
          {fallbackActive ? (
            <p className="mt-2 px-1 text-[10px] text-amber-200">
              Cached snapshot active: confirm irreversible sharing actions before export.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
