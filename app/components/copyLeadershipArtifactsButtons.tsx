"use client";

import Link from "next/link";
import { useEffect, useState, type ButtonHTMLAttributes } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useClipboardCopy } from "./useClipboardCopy";
import { trackContentCtaConversion } from "../../lib/contentMeasurement";
import { artifactModeLabels, type ArtifactMode } from "../../lib/literacyAssist";
import { trackOperatorWorkflowEvent } from "../../lib/operatorWorkflowTelemetry";
import { buildExplainerBriefContent } from "../../lib/export/explainerBrief";
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
  | "Plain-English update"
  | "Quick snapshot"
  | "What changed only"
  | "Leadership update"
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
export { buildExplainerBriefContent } from "../../lib/export/explainerBrief";

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
  deltaOnlyBrief,
  boardSummary,
  citation,
  fallbackActive = false,
  initialArtifactMode = "operator",
  moreFormatsHref = "/operations#ops-export-briefs",
}: {
  weeklyCallSnapshot: string;
  weeklyOperatorBrief: string;
  deltaOnlyBrief: string;
  boardSummary: string;
  citation: string;
  fallbackActive?: boolean;
  initialArtifactMode?: ArtifactMode;
  moreFormatsHref?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, activeTarget, copyToClipboard } = useClipboardCopy();
  const [artifactMode, setArtifactMode] = useState<ArtifactMode>(initialArtifactMode);
  const [shareState, setShareState] = useState<ShareState>("idle");
  const isCopying = status === "copying";

  const copyState = (target: CopyTarget): CopyState =>
    status === "copying" && activeTarget === target
      ? "copying"
      : status === "copied"
        ? "copied"
        : status === "error"
          ? "error"
          : "idle";

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

  const explainerBriefContent = buildExplainerBriefContent({
    boardSummary,
    weeklyOperatorBrief,
    citation,
  });
  const primaryBriefTarget = artifactMode === "explainer" ? "Plain-English update" : "Leadership update";
  const primaryBriefContent = artifactMode === "explainer"
    ? explainerBriefContent
    : weeklyOperatorBrief;
  const activeModeLabel = artifactModeLabels[artifactMode];

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
      brief: primaryBriefContent,
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
          ? "Share plain-English update"
          : "Share leadership update";

  return (
    <div className="space-y-3">
      <article className="weather-transmission-card px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200">Share-ready artifact</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{activeModeLabel}</p>
            <p className="mt-1 max-w-xl text-[11px] leading-5 text-slate-300">
              Use this as the default room-ready wording. Open more formats only if the room needs a different reading level.
            </p>
          </div>
          <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
            Default
          </span>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2" aria-label="Primary update actions">
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

        <p className="mt-2 px-1 text-[11px] leading-5 text-slate-400" role="status" aria-live="polite">
          {shareState === "shared"
            ? `${activeModeLabel} shared with its link.`
            : shareState === "copied"
              ? `Copied ${activeModeLabel.toLowerCase()} link.`
              : shareState === "error"
                ? "Share failed. Copy fallback is available."
                : "Default path ready."
          }
        </p>

        <details className="weather-auto-chevron weather-transmission-segment mt-3 px-3 py-3">
          <summary className="cursor-pointer list-none text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300 focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300">
            Choose a room fit
          </summary>

          <div className="mt-3 space-y-3">
            <div className="grid gap-2 sm:grid-cols-2" aria-label="Artifact mode">
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
                        ? "Less shorthand for mixed audiences."
                        : "Default leadership update."
                      }
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <ActionButton
                variant="secondary"
                type="button"
                onClick={() => {
                  trackFirstActionConversion("copy_weekly_brief");
                  copyToClipboard(deltaOnlyBrief, "What changed only");
                }}
                disabled={isCopying}
                aria-busy={isCopying}
              >
                {copyLabel("What changed only", "Copy what changed only")}
              </ActionButton>
              <ActionButton
                variant="secondary"
                type="button"
                onClick={() => {
                  trackFirstActionConversion("copy_weekly_brief");
                  copyToClipboard(weeklyCallSnapshot, "Quick snapshot");
                }}
                disabled={isCopying}
                aria-busy={isCopying}
              >
                {copyLabel("Quick snapshot", "Copy quick snapshot")}
              </ActionButton>
            </div>

            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">Need a heavier package?</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-400">
                  Board, governance, and exception formats live in Planning.
                </p>
              </div>
              <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Deeper export
              </span>
            </div>
            {fallbackActive ? (
              <p className="text-[10px] leading-5 text-amber-200">
                Cached snapshot active: confirm irreversible sharing actions in Planning before circulation.
              </p>
            ) : null}
            <div>
              <Link
                href={moreFormatsHref}
                className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] hover:border-sky-400/70 hover:text-slate-100"
              >
                Open Planning formats
              </Link>
            </div>
          </div>
        </details>
      </article>
    </div>
  );
}
