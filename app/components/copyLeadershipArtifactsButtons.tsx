"use client";

import { useEffect, useState, type ButtonHTMLAttributes } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useClipboardCopy } from "./useClipboardCopy";
import { trackContentCtaConversion } from "../../lib/contentMeasurement";
import { artifactModeLabels, type ArtifactMode } from "../../lib/literacyAssist";
import { trackOperatorWorkflowEvent } from "../../lib/operatorWorkflowTelemetry";
import { publicDecisionLabels } from "../../lib/report/reportFormatting";
import {
  ARTIFACT_MODE_QUERY_PARAM,
  buildArtifactShareText,
  buildArtifactShareTitle,
  isArtifactMode,
} from "../../lib/shareArtifacts";

type PrimaryActionType = "copy_weekly_brief";

type CopyTarget =
  | "Board note"
  | "Meeting pack"
  | "Explainer brief"
  | "Call snapshot"
  | "Delta brief"
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

export const buildExplainerBriefContent = ({
  boardSummary,
  weeklyOperatorBrief,
  citation,
}: {
  boardSummary: string;
  weeklyOperatorBrief: string;
  citation: string;
}) => [
  "EXPLAINER BRIEF",
  "",
  "What this call is saying",
  boardSummary,
  "",
  "Plain-English guide",
  "• Tightness = how hard it is to make long-payback commitments.",
  "• Risk appetite = how willing markets are to support faster expansion.",
  `• ${publicDecisionLabels.call} = the standing weekly operating summary.`,
  `• ${publicDecisionLabels.action} = what to do this week.`,
  `• ${publicDecisionLabels.threshold} = the trip line that pauses or tightens the call.`,
  `• ${publicDecisionLabels.reversal} = what must improve before loosening again.`,
  "",
  "Operator brief",
  weeklyOperatorBrief,
  "",
  "Citation",
  citation,
].join("\n");

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
  deltaOnlyBrief,
  boardSummary,
  citation,
  fallbackActive = false,
  initialArtifactMode = "operator",
}: {
  boardSnippet: string;
  weeklyCallSnapshot: string;
  weeklyOperatorBrief: string;
  deltaOnlyBrief: string;
  boardSummary: string;
  citation: string;
  fallbackActive?: boolean;
  initialArtifactMode?: ArtifactMode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
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
    const requestedMode = searchParams.get(ARTIFACT_MODE_QUERY_PARAM);
    setArtifactMode(isArtifactMode(requestedMode) ? requestedMode : "operator");
  }, [searchParams]);

  const buildArtifactModeRoute = (mode: ArtifactMode) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (mode === "operator") {
      nextParams.delete(ARTIFACT_MODE_QUERY_PARAM);
    } else {
      nextParams.set(ARTIFACT_MODE_QUERY_PARAM, mode);
    }

    const nextQuery = nextParams.toString();
    return nextQuery.length > 0 ? `${pathname}?${nextQuery}` : pathname;
  };

  const applyOverride = (content: string) => (hasOverride ? `${content}\n${overrideLine}` : content);
  const explainerBriefContent = buildExplainerBriefContent({
    boardSummary: applyOverride(boardSummary),
    weeklyOperatorBrief: applyOverride(weeklyOperatorBrief),
    citation,
  });
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

    const currentUrl = `${window.location.origin}${buildArtifactModeRoute(artifactMode)}`;
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
    <div className="space-y-3">
      <article className="rounded-xl border border-slate-700/70 bg-[linear-gradient(180deg,rgba(14,165,233,0.08),rgba(2,6,23,0.8))] px-3 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200">Recommended path</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{activeModeLabel}</p>
          </div>
          <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
            Routine sharing
          </span>
        </div>

        <p className="mt-2 text-[11px] leading-5 text-slate-300">
          {activeModeNote} Shared links reopen the same artifact mode.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2" aria-label="Artifact mode">
          {(["operator", "explainer"] as const).map((mode) => {
            const active = mode === artifactMode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setArtifactMode(mode);
                  router.push(buildArtifactModeRoute(mode), { scroll: false });
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
                  active ? "border-sky-300/80 bg-sky-500/10 text-slate-100" : "text-slate-300"
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

        <div className="mt-3 grid gap-2 sm:grid-cols-2" aria-label="Primary weekly brief actions">
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
        </div>
      </article>

      <article className="rounded-xl border border-slate-700/70 bg-slate-950/80 px-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">Quick variants</p>
          <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Repeat readers
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-5 text-slate-400">
          Use the delta brief when the room only needs what changed. Use the call snapshot when chat needs the shortest possible version.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <ActionButton
            variant="secondary"
            type="button"
            onClick={() => {
              trackFirstActionConversion("copy_weekly_brief");
              copyToClipboard(applyOverride(deltaOnlyBrief), "Delta brief");
            }}
            disabled={isCopying}
            aria-busy={isCopying}
          >
            {copyLabel("Delta brief", "Copy delta brief")}
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
        <p className="mt-2 px-1 text-[11px] leading-5 text-slate-400" role="status" aria-live="polite">
          {shareState === "shared"
            ? `${activeModeLabel} shared with its link.`
            : shareState === "copied"
              ? `Copied ${activeModeLabel.toLowerCase()} link.`
              : shareState === "error"
                ? "Share failed. Copy fallback is available."
                : `Share the ${activeModeLabel.toLowerCase()} by default. Use quick variants only when the room needs a shorter artifact.`
          }
        </p>
      </article>

      <details className="weather-auto-chevron rounded-xl border border-slate-700/70 bg-slate-950/80 px-3 py-3">
        <summary className="min-h-[44px] cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-200">
          Board and governance formats
        </summary>
        <div className="mt-3 space-y-3 border-t border-slate-800/80 pt-3">
          <p className="text-[11px] leading-5 text-slate-400">
            Open these only after the routine weekly brief is aligned. This lane is for repackaging the same call for board, finance, or documentation-heavy rooms.
          </p>
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
          {fallbackActive ? (
            <p className="px-1 text-[10px] text-amber-200">
              Cached snapshot active: confirm irreversible sharing actions before export.
            </p>
          ) : null}
        </div>
      </details>

      <details className="weather-auto-chevron rounded-xl border border-amber-400/25 bg-amber-500/8 px-3 py-3">
        <summary className="min-h-[44px] cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-100">
          Company-specific exception
        </summary>
        <div className="mt-3 space-y-3 border-t border-amber-400/15 pt-3">
          <p className="max-w-2xl text-xs leading-5 text-amber-50">
            Keep this separate from routine sharing. Use it only when leadership needs the copied artifact to carry an explicit local override.
          </p>

          {hasOverride ? (
            <div className="rounded-lg border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-100">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-100">Override active</p>
              <p className="mt-1">{overrideLine}</p>
            </div>
          ) : null}

          <p className="text-xs leading-5 text-amber-100/80">
            Appropriate when a board- or exec-level call needs an explicit local exception, not for routine sharing or formatting tweaks.
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-100/80">Reason</span>
              <input
                className="w-full rounded-lg border border-amber-300/20 bg-slate-950/80 px-3 py-2 text-base text-slate-100"
                value={overrideReason}
                onChange={(event) => setOverrideReason(event.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-100/80">Local indicator</span>
              <input
                className="w-full rounded-lg border border-amber-300/20 bg-slate-950/80 px-3 py-2 text-base text-slate-100"
                value={overrideIndicator}
                onChange={(event) => setOverrideIndicator(event.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-100/80">Owner</span>
              <input
                className="w-full rounded-lg border border-amber-300/20 bg-slate-950/80 px-3 py-2 text-base text-slate-100"
                value={overrideOwner}
                onChange={(event) => setOverrideOwner(event.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-100/80">Change course if</span>
              <input
                className="w-full rounded-lg border border-amber-300/20 bg-slate-950/80 px-3 py-2 text-base text-slate-100"
                value={overrideReversal}
                onChange={(event) => setOverrideReversal(event.target.value)}
              />
            </label>
          </div>
        </div>
      </details>
    </div>
  );
}
