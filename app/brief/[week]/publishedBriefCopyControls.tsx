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
    <section className="weather-panel space-y-4 px-6 max-sm:px-0 py-6" aria-labelledby="share-brief-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="share-brief-title" className="text-lg font-semibold text-slate-100">
            Share this week&apos;s guidance
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
        {/* The clip needs to read as "there is more", not as a rendering fault.
            max-h-64 cuts horizontally through a line of glyphs, and macOS
            overlay scrollbars stay hidden until you scroll, so the block just
            appeared sliced in half on the most linkable page on the site. */}
        <div className="relative">
          {/* The block and its fade share one token so the fade is the block's
              own colour on both themes; a slate-950 gradient stayed black on
              the light theme while the remap turned the block near-white. */}
          <pre className="max-h-64 overflow-auto overscroll-contain whitespace-pre-wrap rounded-md border border-slate-800/80 bg-[color:var(--bg-nested)] p-3 text-xs leading-relaxed text-slate-200 font-mono">
            {activeText}
          </pre>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-px bottom-px h-10 rounded-b-md bg-gradient-to-t from-[color:var(--bg-nested)] to-transparent"
          />
        </div>
      </div>
    </section>
  );
}
