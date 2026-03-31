"use client";

import { useEffect, useState, type ButtonHTMLAttributes } from "react";
import { usePathname } from "next/navigation";
import { useClipboardCopy } from "./useClipboardCopy";
import { trackContentCtaConversion } from "../../lib/contentMeasurement";
import { artifactModeLabels, literacyAssistStorageKeys, type ArtifactMode } from "../../lib/literacyAssist";
import { trackOperatorWorkflowEvent } from "../../lib/operatorWorkflowTelemetry";
import {
  buildArtifactModeHref,
  buildArtifactShareText,
  buildArtifactShareTitle,
  isArtifactMode,
  parseArtifactModeFromSearch,
} from "../../lib/shareArtifacts";

type PrimaryActionType = "copy_weekly_brief";

type CopyTarget =
  | "Board note"
  | "Meeting pack"
  | "Explainer brief"
  | "Call snapshot"
  | "Operator brief"
  | "Board summary"
  | "Citation";

type CopyState = "idle" | "copying" | "copied" | "error";
type ActionButtonVariant = "primary" | "secondary" | "confirm" | "danger";
type ShareState = "idle" | "sharing" | "shared" | "copied" | "error";

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
  initialArtifactMode = "operator",
}: {
  boardSnippet: string;
  weeklyCallSnapshot: string;
  weeklyOperatorBrief: string;
  boardSummary: string;
  citation: string;
  fallbackActive?: boolean;
  initialArtifactMode?: ArtifactMode;
}) {
  const pathname = usePathname();
  const { status, activeTarget, copyToClipboard } = useClipboardCopy();
  const [artifactMode, setArtifactMode] = useState<ArtifactMode>(initialArtifactMode);
  const [shareState, setShareState] = useState<ShareState>("idle");
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
    const syncArtifactModeFromLocation = () => {
      const urlMode = parseArtifactModeFromSearch(window.location.search);

      if (urlMode) {
        setArtifactMode(urlMode);
        try {
          window.localStorage.setItem(literacyAssistStorageKeys.artifactMode, urlMode);
        } catch {
          // Ignore storage errors.
        }
        return;
      }

      try {
        const storedMode = window.localStorage.getItem(literacyAssistStorageKeys.artifactMode);
        if (isArtifactMode(storedMode)) {
          setArtifactMode(storedMode);
          const nextUrl = buildArtifactModeHref(window.location.href, storedMode);
          window.history.replaceState({}, "", nextUrl);
        }
      } catch {
        // Ignore storage errors.
      }
    };

    syncArtifactModeFromLocation();

    const onPopState = () => {
      syncArtifactModeFromLocation();
    };

    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [initialArtifactMode]);

  useEffect(() => {
    try {
      const nextUrl = buildArtifactModeHref(window.location.href, artifactMode);
      if (nextUrl !== window.location.href) {
        window.history.replaceState({}, "", nextUrl);
      }
      window.localStorage.setItem(literacyAssistStorageKeys.artifactMode, artifactMode);
    } catch {
      // Ignore storage/history errors.
    }
  }, [artifactMode]);

  const applyOverride = (content: string) => (hasOverride ? `${content}\n${overrideLine}` : content);
  const explainerBriefContent = [
    "EXPLAINER BRIEF",
    "",
    "What this call is saying",
    applyOverride(boardSummary),
    "",
    "Plain-English guide",
    "• Tightness = how hard it is to make long-payback commitments.",
    "• Risk appetite = how willing markets are to support faster expansion.",
    "• Pause if = the stop line.",
    "• Change course if = the reopen line.",
    "",
    "Operator brief",
    applyOverride(weeklyOperatorBrief),
    "",
    "Citation",
    citation,
  ].join("\n");
  const primaryBriefTarget = artifactMode === "explainer" ? "Explainer brief" : "Operator brief";
  const primaryBriefContent = artifactMode === "explainer"
    ? explainerBriefContent
    : applyOverride(weeklyOperatorBrief);
  const activeModeLabel = artifactModeLabels[artifactMode];
  const activeModeNote =
    artifactMode === "explainer"
      ? "Same call, with plain-English translation."
      : "Default share path for leadership.";

  const meetingPackContent = [
    "BOARD NOTE",
    applyOverride(boardSnippet),
    "",
    "Call snapshot",
    applyOverride(weeklyCallSnapshot),
    "",
    "OPERATOR BRIEF",
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

  const handleNativeShare = async () => {
    if (shareState === "sharing") {
      return;
    }

    trackContentCtaConversion({
      pagePath: "/",
      cluster: "tool",
      intent: "board",
      ctaId: "homepage_top_fold_share_weekly_brief",
    });

    const currentUrl = buildArtifactModeHref(window.location.href, artifactMode);
    const shareText = buildArtifactShareText({
      mode: artifactMode,
      summary: activeModeLabel,
      brief: applyOverride(primaryBriefContent),
      url: currentUrl,
    });
    const payload = {
      title: buildArtifactShareTitle(artifactMode),
      text: shareText,
      url: currentUrl,
    };

    const shareApi = navigator.share;
    if (typeof shareApi !== "function") {
      setShareState("sharing");
      const copied = await copyToClipboard(shareText, activeModeLabel);
      setShareState(copied ? "copied" : "error");
      return;
    }

    try {
      setShareState("sharing");
      if (typeof navigator.canShare === "function" && !navigator.canShare(payload)) {
        throw new Error("Native share payload not supported.");
      }

      await shareApi.call(navigator, payload);
      setShareState("shared");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setShareState("idle");
        return;
      }

      const copied = await copyToClipboard(shareText, activeModeLabel);
      setShareState(copied ? "copied" : "error");
    }
  };

  const copyLabel = (target: CopyTarget, label: string) => resolveCopyActionLabel(copyState(target), label);
  const shareLabel = shareState === "sharing"
    ? "Sharing…"
    : shareState === "shared"
      ? "Shared"
      : shareState === "copied"
        ? "Copied link"
      : shareState === "error"
        ? "Retry share"
        : artifactMode === "explainer"
          ? "Share explainer brief"
          : "Share operator brief";

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-3" aria-label="Primary weekly brief actions">
        <ActionButton
          variant="primary"
          type="button"
          onClick={handleNativeShare}
          disabled={shareState === "sharing" || isCopying}
          aria-busy={shareState === "sharing"}
        >
          {shareLabel}
        </ActionButton>
        <ActionButton
          variant="secondary"
          type="button"
          onClick={() => {
            trackFirstActionConversion("copy_weekly_brief");
            copyToClipboard(primaryBriefContent, primaryBriefTarget);
          }}
          disabled={isCopying}
          aria-busy={isCopying}
        >
          {copyLabel(primaryBriefTarget, `Copy ${activeModeLabel.toLowerCase()}`)}
        </ActionButton>
        <ActionButton
          variant="secondary"
          type="button"
          onClick={() => {
            trackFirstActionConversion("copy_weekly_brief");
            copyToClipboard(applyOverride(weeklyCallSnapshot), "Call snapshot");
          }}
          disabled={isCopying}
          aria-busy={isCopying}
        >
          {copyLabel("Call snapshot", "Copy call snapshot")}
        </ActionButton>
      </div>
      <p className="px-1 text-[11px] leading-5 text-slate-400" role="status" aria-live="polite">
        {shareState === "shared"
          ? `${activeModeLabel} shared with its link.`
          : shareState === "copied"
            ? `Copied ${activeModeLabel.toLowerCase()} link.`
          : shareState === "error"
            ? "Share failed. Copy fallback is available."
            : `Use the share button for ${activeModeLabel.toLowerCase()} or copy a brief below.`
        }
      </p>

      <p className="px-1 text-[11px] leading-5 text-slate-400">
        {activeModeLabel}: {activeModeNote} The URL keeps the selected artifact mode so shared links reopen the same brief.
      </p>
      <div className="grid gap-2 sm:grid-cols-2" aria-label="Artifact mode">
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
                  const nextUrl = buildArtifactModeHref(window.location.href, mode);
                  window.history.replaceState({}, "", nextUrl);
                } catch {
                  // Ignore storage errors.
                }
                setShareState("idle");
                if (mode !== artifactMode) {
                  trackOperatorWorkflowEvent({
                    type: "artifact_mode_selected",
                    path: pathname,
                    artifactMode: mode,
                  });
                }
              }}
              aria-pressed={active}
              className={`weather-pill inline-flex min-h-[44px] flex-col items-start px-3 py-2 text-left text-xs font-semibold tracking-[0.12em] ${
                active ? "border-sky-300/80 text-slate-100" : "text-slate-300"
              }`}
            >
              <span>{artifactModeLabels[mode]}</span>
              <span className="mt-1 text-[10px] font-normal tracking-normal text-slate-400">
                {mode === "explainer"
                  ? "Plain-English terms for mixed-literacy rooms."
                  : "Default brief for leadership and operators."}
              </span>
            </button>
          );
        })}
      </div>

      <details className="weather-auto-chevron rounded-xl border border-slate-700/70 bg-slate-950/80 px-3 py-3">
        <summary className="min-h-[44px] cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-200">
          More formats
        </summary>
        <div className="mt-3 space-y-3 border-t border-slate-800/80 pt-3">
          <div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <ActionButton
                variant="secondary"
                type="button"
                onClick={() => copyToClipboard(applyOverride(boardSnippet), "Board note")}
                disabled={isCopying}
                aria-busy={isCopying}
              >
                {copyLabel("Board note", "Copy board note")}
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
                onClick={() => copyToClipboard(applyOverride(boardSummary), "Board summary")}
                disabled={isCopying}
                aria-busy={isCopying}
              >
                {copyLabel("Board summary", "Copy board summary")}
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
                Print / PDF
              </ActionButton>
            </div>
            <p className="mt-2 px-1 text-[11px] leading-5 text-slate-400">
              Use these after the operator brief is aligned and ready to be repackaged.
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
