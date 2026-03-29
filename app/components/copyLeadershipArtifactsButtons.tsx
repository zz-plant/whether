"use client";

import { useEffect, useState, type ButtonHTMLAttributes } from "react";
import { useClipboardCopy } from "./useClipboardCopy";
import { trackContentCtaConversion } from "../../lib/contentMeasurement";
import { artifactModeLabels, literacyAssistStorageKeys, type ArtifactMode } from "../../lib/literacyAssist";

type PrimaryActionType = "copy_weekly_brief";

type CopyTarget =
  | "Board snippet"
  | "Meeting pack"
  | "Explainer brief"
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
  boardSnippet,
  weeklyCallSnapshot,
  weeklyOperatorBrief,
  boardSummary,
  citation,
  fallbackActive = false,
}: {
  boardSnippet: string;
  weeklyCallSnapshot: string;
  weeklyOperatorBrief: string;
  boardSummary: string;
  citation: string;
  fallbackActive?: boolean;
}) {
  const { status, activeTarget, copyToClipboard } = useClipboardCopy();
  const [artifactMode, setArtifactMode] = useState<ArtifactMode>("operator");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideIndicator, setOverrideIndicator] = useState("");
  const [overrideOwner, setOverrideOwner] = useState("");
  const [overrideReversal, setOverrideReversal] = useState("");
  const isCopying = status === "copying";

  const copyState = (target: CopyTarget): CopyState =>
    status === "copying" && activeTarget === target
      ? "copying"
      : status === "copied"
        ? "copied"
        : status === "error"
          ? "error"
          : "idle";

  const hasOverride = [overrideReason, overrideIndicator, overrideOwner, overrideReversal].every(
    (value) => value.trim().length > 0,
  );
  const overrideLine = hasOverride
    ? `OVERRIDE ACTIVE: ${overrideReason.trim()} · Indicator: ${overrideIndicator.trim()} · Owner: ${overrideOwner.trim()} · Reverse when: ${overrideReversal.trim()}`
    : "";

  useEffect(() => {
    try {
      const storedMode = window.localStorage.getItem(literacyAssistStorageKeys.artifactMode);
      if (storedMode === "operator" || storedMode === "explainer") {
        setArtifactMode(storedMode);
      }
    } catch {
      // Ignore storage errors.
    }
  }, []);

  const applyOverride = (content: string) => (hasOverride ? `${content}\n${overrideLine}` : content);
  const explainerBriefContent = [
    "EXPLAINER BRIEF",
    "",
    "What this call is saying",
    applyOverride(boardSummary),
    "",
    "Plain-English guide",
    "• Tightness = how hard conditions make new long-payback commitments.",
    "• Risk appetite = how willing markets are to fund risk and faster expansion.",
    "• Pause if = the threshold that should stop new commitments.",
    "• Change course if = the signal that reopens this week’s call.",
    "",
    "Weekly operator brief",
    applyOverride(weeklyOperatorBrief),
    "",
    "Citation",
    citation,
  ].join("\n");
  const primaryBriefTarget = artifactMode === "explainer" ? "Explainer brief" : "Weekly operator brief";
  const primaryBriefContent = artifactMode === "explainer"
    ? explainerBriefContent
    : applyOverride(weeklyOperatorBrief);

  const meetingPackContent = [
    "BOARD SNIPPET",
    applyOverride(boardSnippet),
    "",
    "Weekly call snapshot",
    applyOverride(weeklyCallSnapshot),
    "",
    "WEEKLY OPERATOR BRIEF",
    applyOverride(weeklyOperatorBrief),
    "",
    "BOARD SUMMARY",
    applyOverride(boardSummary),
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
      <div className="grid gap-2 sm:grid-cols-2" aria-label="Primary weekly brief actions">
        <ActionButton
          variant="primary"
          type="button"
          onClick={() => {
            trackFirstActionConversion("copy_weekly_brief");
            copyToClipboard(primaryBriefContent, primaryBriefTarget);
          }}
          disabled={isCopying}
          aria-busy={isCopying}
        >
          {copyLabel(primaryBriefTarget, `Copy ${artifactModeLabels[artifactMode].toLowerCase()}`)}
        </ActionButton>
        <ActionButton
          variant="secondary"
          type="button"
          onClick={() => {
            trackFirstActionConversion("copy_weekly_brief");
            copyToClipboard(applyOverride(weeklyCallSnapshot), "Weekly call snapshot");
          }}
          disabled={isCopying}
          aria-busy={isCopying}
        >
          {copyLabel("Weekly call snapshot", "Copy weekly call snapshot")}
        </ActionButton>
      </div>

      <p className="px-1 text-[11px] leading-5 text-slate-400">
        Default share path: use the {artifactModeLabels[artifactMode].toLowerCase()}. Use the snapshot for short chat context; keep board variants and exception handling secondary.
      </p>
      <div className="flex flex-wrap gap-2" aria-label="Artifact mode">
        {(["operator", "explainer"] as const).map((mode) => {
          const active = mode === artifactMode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setArtifactMode(mode);
                try {
                  window.localStorage.setItem(literacyAssistStorageKeys.artifactMode, mode);
                } catch {
                  // Ignore storage errors.
                }
              }}
              aria-pressed={active}
              className={`weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.12em] ${
                active ? "border-sky-300/80 text-slate-100" : "text-slate-300"
              }`}
            >
              {artifactModeLabels[mode]}
            </button>
          );
        })}
      </div>

      <details className="rounded-xl border border-slate-700/70 bg-slate-950/80 px-3 py-3">
        <summary className="min-h-[44px] cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-200">
          Board, print, and company exceptions
        </summary>
        <div className="mt-3 space-y-3 border-t border-slate-800/80 pt-3">
          <div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <ActionButton
                variant="secondary"
                type="button"
                onClick={() => copyToClipboard(applyOverride(boardSnippet), "Board snippet")}
                disabled={isCopying}
                aria-busy={isCopying}
              >
                {copyLabel("Board snippet", "Copy board snippet")}
              </ActionButton>
              <ActionButton
                variant="secondary"
                type="button"
                onClick={() => copyToClipboard(meetingPackContent, "Meeting pack")}
                disabled={isCopying}
                aria-busy={isCopying}
              >
                {copyLabel("Meeting pack", "Copy meeting pack")}
              </ActionButton>
              <ActionButton
                variant="secondary"
                type="button"
                onClick={() => copyToClipboard(applyOverride(boardSummary), "Board")}
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
            <p className="mt-2 px-1 text-[11px] leading-5 text-slate-400">
              Use these after the default weekly brief is aligned and ready to be repackaged.
            </p>
          </div>

          {fallbackActive ? (
            <p className="px-1 text-[10px] text-amber-200">
              Cached snapshot active: confirm irreversible sharing actions before export.
            </p>
          ) : null}

          <div className="rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-3">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                Company-specific exception
              </p>
              <p className="max-w-2xl text-xs leading-5 text-slate-300">
                Keep this separate from routine sharing. Use it only when leadership needs the copied artifact to carry an explicit local override.
              </p>
            </div>

            {hasOverride ? (
              <div className="mt-3 rounded-lg border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-100">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-100">Override active</p>
                <p className="mt-1">{overrideLine}</p>
              </div>
            ) : null}

            <p className="text-xs leading-5 text-slate-400">
              Appropriate when a board- or exec-level call needs an explicit local exception, not for routine sharing or formatting tweaks.
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Reason</span>
                <input
                  className="w-full rounded-lg border border-slate-700/70 bg-slate-950/80 px-3 py-2 text-base text-slate-100"
                  value={overrideReason}
                  onChange={(event) => setOverrideReason(event.target.value)}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Local indicator</span>
                <input
                  className="w-full rounded-lg border border-slate-700/70 bg-slate-950/80 px-3 py-2 text-base text-slate-100"
                  value={overrideIndicator}
                  onChange={(event) => setOverrideIndicator(event.target.value)}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Owner</span>
                <input
                  className="w-full rounded-lg border border-slate-700/70 bg-slate-950/80 px-3 py-2 text-base text-slate-100"
                  value={overrideOwner}
                  onChange={(event) => setOverrideOwner(event.target.value)}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Change course if</span>
                <input
                  className="w-full rounded-lg border border-slate-700/70 bg-slate-950/80 px-3 py-2 text-base text-slate-100"
                  value={overrideReversal}
                  onChange={(event) => setOverrideReversal(event.target.value)}
                />
              </label>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
