"use client";

import { Button } from "@base-ui/react/button";
import { Dialog } from "@base-ui/react/dialog";
import { Popover } from "@base-ui/react/popover";
import { useState, type ComponentProps } from "react";
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
}: ComponentProps<typeof Button> & { variant: ActionButtonVariant }) {
  const variantClassName = actionButtonVariantClassNames[variant];
  return <Button {...props} className={className ? `${variantClassName} ${className}` : variantClassName} />;
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
  const haptic = useHapticFeedback();
  const [confirmPrintOpen, setConfirmPrintOpen] = useState(false);
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

        <Popover.Root>
          <Popover.Trigger
            className={`${actionButtonVariantClassNames.secondary} w-auto gap-1.5 px-4 text-slate-200`}
          >
            More share actions
            <span aria-hidden="true" className="text-sm">▾</span>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner sideOffset={8}>
              <Popover.Popup className="z-50 w-64 rounded-xl border border-slate-700/80 bg-slate-950/98 p-2 shadow-2xl">
                <div className="space-y-2">
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
              <Dialog.Close className={`${actionButtonVariantClassNames.secondary} w-auto px-4 text-slate-200`}>
                Cancel
              </Dialog.Close>
              <ActionButton
                variant="confirm"
                type="button"
                onClick={() => {
                  setConfirmPrintOpen(false);
                  runExportPdf();
                }}
              >
                Continue export
              </ActionButton>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
