"use client";

import { useCallback, useRef, useState } from "react";
import { CopyIcon, CheckIcon } from "./uiIcons";
import { formatMeetingSlideHtml, formatMeetingSlideMarkdown, type MeetingSlidePayload } from "../../lib/export/meetingSlideExport";

export interface CopyMeetingSlideButtonProps {
  payload: MeetingSlidePayload;
  className?: string;
}

export function CopyMeetingSlideButton({
  payload,
  className = "",
}: CopyMeetingSlideButtonProps) {
  const [didCopy, setDidCopy] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
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
  }, [payload]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy 16:9 Meeting Stance formatted for Notion, Keynote, or Google Slides"
      className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-xs font-semibold text-slate-200 shadow-sm transition hover:border-slate-500 hover:bg-slate-800 hover:text-white ${className}`}
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
