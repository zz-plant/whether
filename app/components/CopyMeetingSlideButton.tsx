"use client";

import { useCallback, useRef, useState } from "react";
import { ClipboardActionRow } from "./clipboardActionRow";
import { trackActivationEvent } from "../../lib/activationFunnel";
import { CopyIcon, CheckIcon } from "./uiIcons";
import { formatMeetingSlideHtml, formatMeetingSlideMarkdown } from "../../lib/export/meetingSlideExport";
import { briefArtifactToSlidePayload } from "../../lib/report/briefArtifact";
import { useBriefArtifact } from "./useBriefArtifact";

interface CopyMeetingSlideButtonProps {
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

    /* The rich copy first, then plain text. "Copied" shows only after a write
       resolved: the fallback used to be fired without waiting and the button
       said "Copied the slide" whether or not anything reached the clipboard,
       the defect `docs/feature-specs-current.md` 1.1.10 records for the other
       copy controls. */
    const writeSlide = async () => {
      if (typeof navigator === "undefined" || !navigator.clipboard) return false;
      if (typeof ClipboardItem !== "undefined") {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              "text/plain": new Blob([markdown], { type: "text/plain" }),
              "text/html": new Blob([html], { type: "text/html" }),
            }),
          ]);
          return true;
        } catch {
          // Fall through to plain text.
        }
      }
      try {
        await navigator.clipboard.writeText(markdown);
        return true;
      } catch {
        return false;
      }
    };

    if (!(await writeSlide())) return;
    trackActivationEvent({ step: "committed", path: window.location.pathname, commitment: "copied_meeting" });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setDidCopy(true);
    timeoutRef.current = setTimeout(() => setDidCopy(false), 2500);
  }, [artifact]);

  /* The shared row, so this and "Copy Brief" beside it are one control drawn
     twice. It used to carry its own slate-and-shadow class chain, the second
     of three button styles in the hero's action row. */
  return (
    <ClipboardActionRow
      compact
      className={className}
      label="Copy as a slide"
      state={didCopy ? "copied" : "idle"}
      onClick={() => void handleCopy()}
      leadingIcon={<CopyIcon className="text-slate-400" />}
      stateIcons={{ copied: <CheckIcon className="text-emerald-400" /> }}
      buttonLabels={{ copied: <span className="text-emerald-300">Copied the slide</span> }}
      buttonProps={{
        title: "Copy this week's guidance as one slide, formatted for Notion, Keynote or Google Slides",
      }}
    />
  );
}
