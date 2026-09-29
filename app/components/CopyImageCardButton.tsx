"use client";

import { useCallback, useRef, useState } from "react";
import { ClipboardActionRow } from "./clipboardActionRow";
import { trackActivationEvent } from "../../lib/activationFunnel";
import { buildImageBriefApiPath } from "../../lib/report/imageBriefSearchParams";
import { CheckIcon, CopyIcon, SpinnerIcon } from "./uiIcons";
import { useBriefArtifact } from "./useBriefArtifact";

interface CopyImageCardButtonProps {
  className?: string;
}

type Outcome = "copied" | "saved";

/**
 * The brief card (`/api/image/brief`, the PNG `/share` lists) onto the clipboard,
 * for a thread or a chat that will not render the slide's SVG.
 *
 * The image is built from the address at click time, like the sticky strip's
 * link, so the card carries the cadence and company context on screen rather
 * than the default reading.
 *
 * The `ClipboardItem` takes the fetch as a promise instead of an awaited blob.
 * Safari only allows a clipboard write inside the click that asked for it, and
 * awaiting the render first spends that permission, so the write was refused
 * on every Safari click. Where the write is refused anyway, the card is saved
 * as a file and the button says "Saved", not "Copied", because "Copied" is
 * shown only after a write resolved (docs/feature-specs-current.md 1.1.10).
 */
export function CopyImageCardButton({
  className = "",
}: CopyImageCardButtonProps) {
  const artifact = useBriefArtifact();
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied" | "error">("idle");
  const [outcome, setOutcome] = useState<Outcome>("copied");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const settle = useCallback((next: "idle" | "copied" | "error", resetAfterMs: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setCopyState(next);
    timeoutRef.current = setTimeout(() => setCopyState("idle"), resetAfterMs);
  }, []);

  const handleCopy = useCallback(async () => {
    setCopyState("copying");
    const imagePath = buildImageBriefApiPath(new URLSearchParams(window.location.search));
    const render = fetch(imagePath).then(async (res) => {
      if (!res.ok) throw new Error(`Brief card answered HTTP ${res.status}`);
      return new Blob([await res.arrayBuffer()], { type: "image/png" });
    });

    const writeImage = async () => {
      if (typeof navigator === "undefined" || !navigator.clipboard || typeof ClipboardItem === "undefined") {
        return false;
      }
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": render })]);
        return true;
      } catch {
        return false;
      }
    };

    const saveImage = (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const dateTag = artifact?.recordDateLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-") ?? "weekly";
      link.download = `whether-brief-${dateTag}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    };

    try {
      if (await writeImage()) {
        setOutcome("copied");
      } else {
        saveImage(await render);
        setOutcome("saved");
      }
    } catch {
      settle("error", 3000);
      return;
    }

    trackActivationEvent({ step: "committed", path: window.location.pathname, commitment: "copied_brief" });
    settle("copied", 2500);
  }, [artifact, settle]);

  return (
    <ClipboardActionRow
      compact
      className={className}
      label="Copy as an image"
      state={copyState}
      onClick={() => void handleCopy()}
      leadingIcon={<CopyIcon className="text-slate-400" />}
      stateIcons={{
        copying: <SpinnerIcon className="text-slate-400" />,
        copied: <CheckIcon className="text-emerald-400" />,
      }}
      buttonLabels={{
        copying: <span className="text-slate-300">Rendering…</span>,
        copied: (
          <span className="text-emerald-300">
            {outcome === "saved" ? "Saved the image" : "Copied the image"}
          </span>
        ),
        error: <span className="text-rose-400">Copy failed</span>,
      }}
      buttonProps={{
        title: "Copy this week's guidance as a 1200×800 PNG, to paste into Slack, a thread or a doc",
      }}
    />
  );
}
