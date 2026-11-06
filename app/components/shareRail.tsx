"use client";

import { useCallback, useMemo, useState, useId } from "react";
import { useClipboardCopy } from "./useClipboardCopy";
import { useSlackPreviewOverlay } from "./useSlackPreviewOverlay";
import { useBriefArtifact } from "./useBriefArtifact";
import { BriefFormatPicker } from "./briefFormatPicker";
import {
  BRIEF_FORMATS,
  formatBriefArtifact,
  type BriefFormatId,
} from "../../lib/report/briefArtifact";
import { siteUrl } from "../../lib/siteUrl";
import { Dialog } from "@base-ui/react/dialog";
import { Switch } from "@base-ui/react/switch";
import { CloseIcon } from "./uiIcons";
import { CalendarButton, buildMondayAgendaDescription } from "./calendarButton";
import { CLOSE_CONTROL_CLASS } from "./ui/closeControl";
import { SegmentedControl } from "./ui/segmentedControl";

type SharePreset = "ceo" | "finance" | "team" | "custom";

/* A list, not a record keyed for its own `Object.keys` to be cast back. The
 * order is the rendered order, and the union still checks every entry. */
const SHARE_PRESETS: readonly { id: SharePreset; label: string }[] = [
  { id: "ceo", label: "Share with CEO" },
  { id: "finance", label: "Share with finance lead" },
  { id: "team", label: "Share with team" },
  { id: "custom", label: "Custom message" },
];

const COPY_STATUS_MESSAGE: Record<string, string> = {
  plain: "Plain text copied.",
  slack: "Slack format copied.",
  link: "Page link copied.",
};

/**
 * The generic half of "Copy as": what the panel offers on a route with no
 * weekly call. The brief half is `BriefFormatPicker`, shared with `/share`.
 */
const GenericSharePresets = ({
  copiedTarget,
  onCopyPlain,
  onCopySlack,
}: {
  copiedTarget: string | null;
  onCopyPlain: () => void;
  onCopySlack: () => void;
}) => (
<div className="mt-2 flex gap-2">
  <button
    type="button"
    onClick={onCopyPlain}
    className="weather-button inline-flex flex-1 min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold"
  >
    {copiedTarget === "plain" ? "Copied" : "Plain text"}
  </button>
  <button
    type="button"
    onClick={onCopySlack}
    className="weather-button inline-flex flex-1 min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold"
  >
    {copiedTarget === "slack" ? "Copied" : "Slack format"}
  </button>
</div>
);

/* Slack is its own destination in the funnel; the plain text, the brief and the
   link are all a copy of this week's guidance (the reason `/share` gives for not
   widening the commitment union). */
const shareRailCommitment = (target: string | null) => (target === "slack" ? "copied_slack" : "copied_brief");

export function ShareRail({ onClose }: { onClose: () => void }) {
  const [preset, setPreset] = useState<SharePreset>("team");
  const [includeContext, setIncludeContext] = useState(true);
  const [format, setFormat] = useState<BriefFormatId>("slack");
  const artifact = useBriefArtifact();
  const { active: slackOverlayActive, toggle: handleToggleSlackOverlay } = useSlackPreviewOverlay();
  const includeContextLabelId = useId();
  const slackOverlayLabelId = useId();
  const { copyToClipboard, copiedTarget } = useClipboardCopy({ commitment: shareRailCommitment });

  const buildShareText = useCallback(() => {
    const context = includeContext
      ? "Whether is weekly guidance on what interest rates and credit mean for a startup's hiring, spend and raise.\n\n"
      : "";
    const briefUrl = `${window.location.origin}/`;

    switch (preset) {
      case "ceo":
        return `${context}This week's guidance, in case it changes anything on your side.\n${briefUrl}`;
      case "finance":
        return `${context}This week's guidance, with its sources and how fresh the data is.\n${briefUrl}/trust`;
      case "team":
        return `${context}This week's guidance, the move it calls for, and the evidence behind it.\n${briefUrl}`;
      default:
        return `${context}This week's guidance from Whether.\n${briefUrl}`;
    }
  }, [preset, includeContext]);

  const handleCopy = useCallback(() => {
    void copyToClipboard(buildShareText(), "plain");
  }, [copyToClipboard, buildShareText]);

  const copySlackText = useCallback(() => {
    const text = buildShareText();
    const slackFormatted = `*Whether Weekly Brief*\n\n${text}`;
    void copyToClipboard(slackFormatted, "slack");
  }, [copyToClipboard, buildShareText]);

  const activeFormat = BRIEF_FORMATS.find((option) => option.id === format) ?? BRIEF_FORMATS[0];

  /* The canonical origin, not `window.location.origin` (2026-11-02): the same
     string is now what Copy Brief under the call copies, and a paste outlives
     the host it was made on. A preview deployment writing its own hostname into
     a Slack message leaves a dead link behind it. */
  const briefText = useMemo(
    () => (artifact ? formatBriefArtifact(artifact, format, siteUrl) : ""),
    [artifact, format],
  );

  const copyBrief = useCallback(() => {
    if (!briefText) return;
    void copyToClipboard(briefText, "brief");
  }, [briefText, copyToClipboard]);

  /* A lookup, not a ternary chain. Only the brief's message varies, because it
     names the format that was picked; the rest are fixed strings keyed by the
     copy target, and a chain of them hid that. */
  const copyStatusMessage =
    copiedTarget === "brief"
      ? `${activeFormat.label} format copied.`
      : COPY_STATUS_MESSAGE[copiedTarget ?? ""] ?? "";

  return (
    <Dialog.Root open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[var(--z-overlay)] bg-black/40" />
        <Dialog.Popup className="weather-slide-panel fixed z-[var(--z-modal)] bottom-0 right-0 w-full max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain rounded-t-2xl border border-[color:var(--border-strong)] bg-[color:var(--bg-panel)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl sm:top-0 sm:bottom-auto sm:mt-14 sm:mr-4 sm:w-[22rem] sm:rounded-lg" aria-label="Share this page">
        <div className="flex items-center justify-between gap-3">
          <h2 className="type-eyebrow text-slate-300">Share</h2>
          <Dialog.Close className={CLOSE_CONTROL_CLASS} aria-label="Close share panel">
            <CloseIcon />
          </Dialog.Close>
        </div>

        <div className="mt-4 space-y-3">
          {/* A preset writes a sentence about the product and links to it. Beside
              a picker that copies the actual call, it is a second, weaker copy
              path for the same intent — DD-005 rules those out — so it renders
              only where there is no call to copy. */}
          {artifact ? null : (
            <>
              {/* The site's segmented control (2026-11-06). The presets were hand-drawn
                  buttons with no pressed state, so a screen reader heard four buttons and
                  never which one was chosen. */}
              <div>
                <p className="type-eyebrow" aria-hidden="true">Preset</p>
                <SegmentedControl
                  className="mt-1.5"
                  layout="choices"
                  ariaLabel="Preset"
                  options={SHARE_PRESETS.map((option) => ({ key: option.id, label: option.label }))}
                  value={preset}
                  onSelect={setPreset}
                />
              </div>

            {/* The row is the target: 44px, not the 20px switch alone (§II). */}
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-300" htmlFor={`${includeContextLabelId}-control`}>
              <Switch.Root
                id={`${includeContextLabelId}-control`}
                checked={includeContext}
                onCheckedChange={setIncludeContext}
                aria-labelledby={includeContextLabelId}
                className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors data-[checked]:bg-sky-500 bg-slate-700"
              >
                <Switch.Thumb className="inline-block h-4 w-4 translate-x-0.5 rounded-full bg-white transition-transform data-[checked]:translate-x-[18px] data-[checked]:bg-[var(--bg-body)]" />
              </Switch.Root>
              <span id={includeContextLabelId}>Add a one-line explanation of the site</span>
            </label>
            </>
          )}

          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-300" htmlFor={`${slackOverlayLabelId}-control`}>
            <Switch.Root
              id={`${slackOverlayLabelId}-control`}
              checked={slackOverlayActive}
              onCheckedChange={handleToggleSlackOverlay}
              aria-labelledby={slackOverlayLabelId}
              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors data-[checked]:bg-sky-500 bg-slate-700"
            >
              <Switch.Thumb className="inline-block h-4 w-4 translate-x-0.5 rounded-full bg-white transition-transform data-[checked]:translate-x-[18px] data-[checked]:bg-[var(--bg-body)]" />
            </Switch.Root>
            <span id={slackOverlayLabelId}>Slack preview overlay</span>
          </label>

          <div className="border-t border-slate-800/60 pt-3">
            <div className="mb-3">
              <CalendarButton
                title="Whether Weekly Brief"
                description={buildMondayAgendaDescription()}
                date={(() => {
                  const d = new Date();
                  d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
                  return d.toISOString().split("T")[0];
                })()}
              />
            </div>
            <p className="type-eyebrow">Copy as</p>
            <output aria-live="polite" className="sr-only">
              {copyStatusMessage}
            </output>
            {artifact ? (
              <BriefFormatPicker
                format={format}
                activeFormat={activeFormat}
                briefText={briefText}
                copiedTarget={copiedTarget}
                onSelect={setFormat}
                onCopy={copyBrief}
              />
            ) : (
              <GenericSharePresets
                copiedTarget={copiedTarget}
                onCopyPlain={handleCopy}
                onCopySlack={copySlackText}
              />
            )}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  void copyToClipboard(window.location.href, "link");
                }}
                className="weather-button inline-flex w-full min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold"
              >
                {copiedTarget === "link" ? "Copied" : "Copy page link"}
              </button>
            </div>
          </div>
        </div>
      </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
