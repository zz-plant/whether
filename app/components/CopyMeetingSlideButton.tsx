"use client";

import { useCallback, useRef, useState } from "react";
import { CopyIcon, CheckIcon } from "./uiIcons";
import { formatMeetingSlideHtml, formatMeetingSlideMarkdown } from "../../lib/export/meetingSlideExport";
import { briefArtifactToSlidePayload } from "../../lib/report/briefArtifact";
import { useBriefArtifact } from "./useBriefArtifact";

export interface CopyMeetingSlideButtonProps {
  className?: string;
}

/**
 * Reads the published brief island rather than taking a payload prop.
 *
 * `DecisionHero` used to assemble a `MeetingSlidePayload` inline at the call
 * site — twelve lines of literal, with its own fallback strings for the pause
 * and reversal copy. That made the hero a second place where the artifact was
 * defined, beside the route that publishes it, and the two could disagree
 * without anything noticing. One artifact, one adapter.
 */
export function CopyMeetingSlideButton({
  className = "",
}: CopyMeetingSlideButtonProps) {
  const artifact = useBriefArtifact();
  const [didCopy, setDidCopy] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
    if (!artifact) return;
    const payload = briefArtifactToSlidePayload(artifact, window.location.origin);
    const markdown = formatMeetingSlideMarkdown(payload);
    const html = formatMeetingSlideHtml(payload);

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        if (typeof ClipboardItem !== "undefined") {
          const item = new ClipboardItem({
            "text/plain": new Blob([markdown], { type: "text/plain" }),
            "text/html": new Blob([html], { type: "text/html" }),
          });
          await navigator.clipboard.write([item]);
        } else {
          await navigator.clipboard.writeText(markdown);
        }

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setDidCopy(true);
        timeoutRef.current = setTimeout(() => setDidCopy(false), 2500);
      }
    } catch {
      // Fallback
      void navigator?.clipboard?.writeText(markdown);
      setDidCopy(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setDidCopy(false), 2500);
    }
  }, [artifact]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy 16:9 Meeting Stance formatted for Notion, Keynote, or Google Slides"
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs font-semibold text-slate-200 shadow-sm transition hover:border-slate-500 hover:bg-slate-800 hover:text-white weather-focus-ring weather-press-scale ${className}`}
    >
      {didCopy ? (
        <>
          <CheckIcon className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-emerald-300">Copied Meeting Slide!</span>
        </>
      ) : (
        <>
          <CopyIcon className="h-3.5 w-3.5 text-slate-400" />
          <span>Copy for Meeting / Notion</span>
        </>
      )}
    </button>
  );
}
