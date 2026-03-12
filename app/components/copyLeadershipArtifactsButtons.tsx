"use client";

import { Button } from "@base-ui/react/button";
import { Dialog } from "@base-ui/react/dialog";
import { Popover } from "@base-ui/react/popover";
import { useState } from "react";
import { useClipboardCopy } from "./useClipboardCopy";
import { useHapticFeedback } from "./useHapticFeedback";
import { trackContentCtaConversion } from "../../lib/contentMeasurement";

type PrimaryActionType = "copy_weekly_brief";

type CopyTarget =
  | "Meeting pack"
  | "Weekly call snapshot"
  | "Weekly operator brief"
  | "Board"
  | "Citation";

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
  const haptic = useHapticFeedback();
  const [confirmPrintOpen, setConfirmPrintOpen] = useState(false);
  const isCopying = status === "copying";

  const copyState = (target: CopyTarget) =>
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
    haptic.confirm();
    window.print();
  };

  const handleExportPdf = () => {
    if (fallbackActive) {
      setConfirmPrintOpen(true);
      return;
    }
    runExportPdf();
  };

  const copyLabel = (target: CopyTarget, label: string) => {
    const state = copyState(target);
    if (state === "copying") return "Copying";
    if (state === "copied") return "Copied";
    if (state === "error") return "Retry copy";
    return label;
  };

  const secondaryActionClassName =
    "weather-button inline-flex min-h-[44px] w-full items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation";

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label="Primary weekly brief actions">
        <Button
          type="button"
          onClick={() => {
            trackFirstActionConversion("copy_weekly_brief");
            copyToClipboard(weeklyCallSnapshot, "Weekly call snapshot");
          }}
          disabled={isCopying}
          aria-busy={isCopying}
          className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation"
        >
          {copyLabel("Weekly call snapshot", "Copy weekly call snapshot")}
        </Button>
        <Button
          type="button"
          onClick={() => {
            trackFirstActionConversion("copy_weekly_brief");
            copyToClipboard(meetingPackContent, "Meeting pack");
          }}
          disabled={isCopying}
          aria-busy={isCopying}
          className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation"
        >
          {copyLabel("Meeting pack", "Copy Meeting Pack")}
        </Button>

        <Button
          type="button"
          onClick={() => {
            trackFirstActionConversion("copy_weekly_brief");
            copyToClipboard(weeklyOperatorBrief, "Weekly operator brief");
          }}
          disabled={isCopying}
          aria-busy={isCopying}
          className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation"
        >
          {copyLabel("Weekly operator brief", "Copy Weekly Operator Brief")}
        </Button>

        <Popover.Root>
          <Popover.Trigger className="weather-button inline-flex min-h-[44px] items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200 hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 touch-manipulation">
            More share actions
            <span aria-hidden="true" className="text-sm">▾</span>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner sideOffset={8}>
              <Popover.Popup className="z-50 w-64 rounded-xl border border-slate-700/80 bg-slate-950/98 p-2 shadow-2xl">
                <div className="space-y-2">
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
                  <Button type="button" onClick={handleExportPdf} className={secondaryActionClassName}>
                    Export / print PDF
                  </Button>
                  {fallbackActive ? (
                    <p className="px-1 text-[10px] text-amber-200">
                      Cached snapshot active: confirm irreversible sharing actions before export.
                    </p>
                  ) : null}
                </div>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </div>

      <Dialog.Root open={confirmPrintOpen} onOpenChange={setConfirmPrintOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-slate-950/75" />
          <Dialog.Popup className="fixed inset-x-4 top-1/2 z-50 mx-auto w-full max-w-lg -translate-y-1/2 rounded-2xl border border-amber-400/50 bg-slate-950/98 p-4 shadow-2xl">
            <Dialog.Title className="text-sm font-semibold tracking-[0.08em] text-amber-100">
              Cached snapshot active — confirm export
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-xs text-slate-200">
              You are exporting while live data fallback is active. Keep decisions to hold/revisit path and avoid irreversible approvals until live refresh resumes.
            </Dialog.Description>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Dialog.Close className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200">
                Cancel
              </Dialog.Close>
              <Button
                type="button"
                onClick={() => {
                  setConfirmPrintOpen(false);
                  runExportPdf();
                }}
                className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]"
              >
                Continue export
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
