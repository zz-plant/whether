"use client";

import { useCallback, useState } from "react";
import { useClipboardCopy } from "./useClipboardCopy";
import { Dialog } from "@base-ui/react/dialog";
import { CloseIcon } from "./uiIcons";

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
  const { copyToClipboard, status, copiedTarget } = useClipboardCopy();

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
    copyToClipboard(slackFormatted, "slack");
  }, [copyToClipboard, buildShareText]);

  return (
    <Dialog.Root open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="weather-slide-panel fixed z-50 mt-14 mr-2 w-[calc(100vw-1.5rem)] sm:w-[22rem] sm:mr-4 top-0 right-0 rounded-lg border border-slate-700/70 bg-slate-950/95 p-4 shadow-xl backdrop-blur-xl" aria-label="Share brief">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Share</h2>
          <Dialog.Close className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-sm text-slate-400 hover:bg-slate-800/60 hover:text-slate-200" aria-label="Close share panel">
            <CloseIcon />
          </Dialog.Close>
        </div>

        <div className="mt-4 space-y-3">
          <fieldset>
            <legend className="text-fluid-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Preset</legend>
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

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={includeContext}
              onChange={() => setIncludeContext((v) => !v)}
              className="accent-sky-400"
            />
            Include context for non-users
          </label>

          <div className="border-t border-slate-800/60 pt-3">
            <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-500">Copy as</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="weather-button flex-1 px-3 py-2 text-xs font-semibold"
              >
                {copiedTarget === "plain" ? "Copied!" : "Plain text"}
              </button>
              <button
                type="button"
                onClick={copySlackText}
                className="weather-button flex-1 px-3 py-2 text-xs font-semibold"
              >
                {copiedTarget === "slack" ? "Copied!" : "Slack format"}
              </button>
            </div>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  copyToClipboard(window.location.href, "link");
                }}
                className="weather-button w-full px-3 py-2 text-xs font-semibold"
              >
                {copiedTarget === "link" ? "Link copied!" : "Copy page link"}
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  copyToClipboard(window.location.href, "link");
                }}
                className="weather-button px-3 py-2 text-xs font-semibold"
              >
                {status === "copied" ? "Link copied!" : "Page link"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const decisionSection = document.querySelector('[data-share-section="decision"]');
                  const text = decisionSection?.textContent?.trim() ?? "Decision card not found on this page.";
                  copyToClipboard(text, "section");
                }}
                className="weather-button px-3 py-2 text-xs font-semibold"
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
