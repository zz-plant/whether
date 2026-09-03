"use client";

import { useCallback, useState, useId } from "react";
import { useClipboardCopy } from "./useClipboardCopy";
import { useSlackPreviewOverlay } from "./useSlackPreviewOverlay";
import { Dialog } from "@base-ui/react/dialog";
import { Switch } from "@base-ui/react/switch";
import { CloseIcon } from "./uiIcons";
import { CalendarButton } from "./calendarButton";

type SharePreset = "ceo" | "finance" | "team" | "custom";

const presetLabels: Record<SharePreset, string> = {
  ceo: "Share with CEO",
  finance: "Share with finance lead",
  team: "Share with team",
  custom: "Custom message",
};

export function ShareRail({ onClose }: { onClose: () => void }) {
  const [preset, setPreset] = useState<SharePreset>("team");
  const [includeContext, setIncludeContext] = useState(true);
  const { active: slackOverlayActive, toggle: handleToggleSlackOverlay } = useSlackPreviewOverlay();
  const includeContextLabelId = useId();
  const slackOverlayLabelId = useId();
  const { copyToClipboard, copiedTarget } = useClipboardCopy();

  const buildShareText = useCallback(() => {
    const context = includeContext
      ? "Whether tracks US macro signals and translates them into a weekly operating posture for startup and product leaders.\n\n"
      : "";
    const briefUrl = `${window.location.origin}/`;

    switch (preset) {
      case "ceo":
        return `${context}This week's operating call: review the posture and decide if any thresholds have shifted.\n${briefUrl}`;
      case "finance":
        return `${context}Weekly brief with trust markers and freshness details.\n${briefUrl}/trust`;
      case "team":
        return `${context}This week's macro brief — posture, decisions, and evidence.\n${briefUrl}`;
      default:
        return `${context}Weekly operating brief from Whether.\n${briefUrl}`;
    }
  }, [preset, includeContext]);

  const handleCopy = useCallback(() => {
    copyToClipboard(buildShareText(), "plain");
  }, [copyToClipboard, buildShareText]);

  const copySlackText = useCallback(() => {
    const text = buildShareText();
    const slackFormatted = `*Whether Weekly Brief*\n\n${text}`;
    void copyToClipboard(slackFormatted, "slack");
  }, [copyToClipboard, buildShareText]);

  const copyStatusMessage =
    copiedTarget === "plain"
      ? "Plain text copied."
      : copiedTarget === "slack"
      ? "Slack format copied."
      : copiedTarget === "link"
      ? "Page link copied."
      : copiedTarget === "section"
      ? "Decision card copied."
      : "";

  return (
    <Dialog.Root open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="weather-slide-panel fixed z-50 bottom-0 right-0 w-full max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain rounded-t-2xl border border-slate-700/70 bg-slate-950/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl backdrop-blur-xl sm:top-0 sm:bottom-auto sm:mt-14 sm:mr-4 sm:w-[22rem] sm:rounded-lg" aria-label="Share brief">
        <div className="flex items-center justify-between gap-3">
          <h2 className="type-eyebrow text-slate-300">Share</h2>
          <Dialog.Close className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-sm text-slate-400 hover:bg-slate-800/60 hover:text-slate-200" aria-label="Close share panel">
            <CloseIcon />
          </Dialog.Close>
        </div>

        <div className="mt-4 space-y-3">
          <fieldset>
            <legend className="type-eyebrow">Preset</legend>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {(Object.keys(presetLabels) as SharePreset[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPreset(key)}
                  className={`rounded-md px-3 py-2 text-left text-xs font-medium transition-colors ${
                    preset === key
                      ? "bg-sky-500/12 text-sky-100 border border-sky-500/30"
                      : "text-slate-300 border border-transparent hover:bg-slate-800/50"
                  }`}
                >
                  {presetLabels[key]}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex items-center gap-2 text-sm text-slate-300" htmlFor={`${includeContextLabelId}-control`}>
            <Switch.Root
              id={`${includeContextLabelId}-control`}
              checked={includeContext}
              onCheckedChange={setIncludeContext}
              aria-labelledby={includeContextLabelId}
              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors data-[checked]:bg-sky-500 bg-slate-700"
            >
              <Switch.Thumb className="inline-block h-4 w-4 translate-x-0.5 rounded-full bg-white transition-transform data-[checked]:translate-x-[18px]" />
            </Switch.Root>
            <span id={includeContextLabelId}>Include context for non-users</span>
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer" htmlFor={`${slackOverlayLabelId}-control`}>
            <Switch.Root
              id={`${slackOverlayLabelId}-control`}
              checked={slackOverlayActive}
              onCheckedChange={handleToggleSlackOverlay}
              aria-labelledby={slackOverlayLabelId}
              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors data-[checked]:bg-sky-500 bg-slate-700"
            >
              <Switch.Thumb className="inline-block h-4 w-4 translate-x-0.5 rounded-full bg-white transition-transform data-[checked]:translate-x-[18px]" />
            </Switch.Root>
            <span id={slackOverlayLabelId}>Slack preview overlay (1.91:1)</span>
          </label>

          <div className="border-t border-slate-800/60 pt-3">
            <div className="mb-3">
              <CalendarButton
                title="Whether Weekly Brief"
                description="Review the weekly operating brief from Whether."
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
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                data-premium-intent="export_brief"
                data-premium-cta="share_rail_copy_plain"
                className="weather-button inline-flex flex-1 min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold"
              >
                {copiedTarget === "plain" ? "Copied!" : "Plain text"}
              </button>
              <button
                type="button"
                onClick={copySlackText}
                data-premium-intent="export_brief"
                data-premium-cta="share_rail_copy_slack"
                className="weather-button inline-flex flex-1 min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold"
              >
                {copiedTarget === "slack" ? "Copied!" : "Slack format"}
              </button>
            </div>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  void copyToClipboard(window.location.href, "link");
                }}
                className="weather-button inline-flex w-full min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold"
              >
                {copiedTarget === "link" ? "Link copied!" : "Copy page link"}
              </button>
            </div>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  const decisionSection = document.querySelector('[data-share-section="decision"]');
                  const text = decisionSection?.textContent?.trim() ?? "Decision card not found on this page.";
                  void copyToClipboard(text, "section");
                }}
                data-premium-intent="export_brief"
                data-premium-cta="share_rail_copy_decision_card"
                className="weather-button inline-flex w-full min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold"
              >
                {copiedTarget === "section" ? "Copied!" : "Decision card"}
              </button>
            </div>
          </div>
        </div>
      </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
