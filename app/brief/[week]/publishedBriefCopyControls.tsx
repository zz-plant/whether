"use client";

import { useState } from "react";
import { ClipboardActionRow } from "../../components/clipboardActionRow";
import {
  getClipboardUiState,
  isClipboardTargetDisabled,
  useClipboardCopy,
} from "../../components/useClipboardCopy";
import { CopyIcon } from "../../components/uiIcons";

type PublishedBriefCopyControlsProps = {
  recordDateLabel: string;
  slackUpdate: string;
  emailUpdate: string;
  permanentUrl: string;
};

type ActiveFormat = "slack" | "email";

export function PublishedBriefCopyControls({
  recordDateLabel,
  slackUpdate,
  emailUpdate,
  permanentUrl,
}: PublishedBriefCopyControlsProps) {
  const [activeFormat, setActiveFormat] = useState<ActiveFormat>("slack");
  const { status, error, activeTarget, copiedTarget, copyToClipboard } = useClipboardCopy();

  const activeText = activeFormat === "slack" ? slackUpdate : emailUpdate;

  const clipboardState = (target: string) =>
    getClipboardUiState(target, { status, error, activeTarget, copiedTarget });

  const isCopyDisabled = (target: string) =>
    isClipboardTargetDisabled(target, { status, activeTarget });

  const handleCopy = async (text: string, label: string) => {
    if (status === "copying") return;
    await copyToClipboard(text, label);
  };

  return (
    <section className="weather-panel space-y-4 px-6 py-6" aria-labelledby="share-brief-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="share-brief-title" className="text-lg font-semibold text-slate-100">
            Share this week&apos;s call
          </h2>
          <p className="text-xs text-slate-400">
            Copy date-pinned leadership updates into Slack or email.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveFormat("slack")}
            className={`rounded px-3 py-1 text-xs font-semibold transition-colors ${
              activeFormat === "slack"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Slack
          </button>
          <button
            type="button"
            onClick={() => setActiveFormat("email")}
            className={`rounded px-3 py-1 text-xs font-semibold transition-colors ${
              activeFormat === "email"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Email
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <ClipboardActionRow
          label={
            <span className="inline-flex items-center gap-1.5">
              <CopyIcon className="h-3.5 w-3.5" aria-hidden="true" />
              Copy {activeFormat === "slack" ? "Slack update" : "Email update"}
            </span>
          }
          state={clipboardState(activeFormat === "slack" ? "Slack update" : "Email update")}
          disabled={isCopyDisabled(activeFormat === "slack" ? "Slack update" : "Email update")}
          onClick={() =>
            void handleCopy(activeText, activeFormat === "slack" ? "Slack update" : "Email update")
          }
          className="weather-button-primary"
        />
        <ClipboardActionRow
          label={
            <span className="inline-flex items-center gap-1.5">
              <CopyIcon className="h-3.5 w-3.5" aria-hidden="true" />
              Copy permanent link
            </span>
          }
          state={clipboardState("Permanent link")}
          disabled={isCopyDisabled("Permanent link")}
          onClick={() => void handleCopy(permanentUrl, "Permanent link")}
          buttonVariant="pill"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            {activeFormat === "slack" ? "Slack preview" : "Email preview"} ({recordDateLabel})
          </span>
          <span className="font-mono text-fluid-nano text-slate-500">Date-pinned record</span>
        </div>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-slate-800/80 bg-slate-950/80 p-3 text-xs leading-relaxed text-slate-200 font-mono">
          {activeText}
        </pre>
      </div>
    </section>
  );
}
