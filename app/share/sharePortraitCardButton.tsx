"use client";

import { useCallback, useEffect, useState } from "react";
import { trackActivationEvent } from "../../lib/activationFunnel";
import { resolveSharedBriefUrl } from "../../lib/report/briefArtifact";
import { buildImageBriefApiPath } from "../../lib/report/imageBriefSearchParams";
import { ClipboardActionRow } from "../components/clipboardActionRow";
import { useHydrated } from "../components/browserSource";
import { CheckIcon, ShareIcon, SpinnerIcon } from "../components/uiIcons";
import { useBriefArtifact } from "../components/useBriefArtifact";

/**
 * The portrait card (`/api/image/brief?size=portrait`) handed to the system
 * share sheet as a file, so it posts straight into the LinkedIn, Instagram,
 * WhatsApp, or Messages app with the brief's link beside it. Copying an image
 * works on a desktop; on a phone the share sheet is how a picture reaches an app.
 *
 * The card is fetched when the button mounts, not on click. A share must happen
 * inside the tap that asked for it, and Safari treats an awaited render as the
 * tap having ended, so a fetch-then-share refused every iPhone tap. The edge
 * caches the card for an hour, so the early fetch costs one cached read.
 *
 * Shown only where the browser can share files; elsewhere the copy button and
 * the "Open portrait card" link beside it do the job.
 */
const canShareFiles = () => {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare({ files: [new File([""], "probe.png", { type: "image/png" })] });
  } catch {
    return false;
  }
};

export function SharePortraitCardButton() {
  const hydrated = useHydrated();
  const artifact = useBriefArtifact();
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<"idle" | "copying" | "copied" | "error">("idle");
  const supported = hydrated && canShareFiles();

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    const path = buildImageBriefApiPath(new URLSearchParams(window.location.search));
    const portrait = `${path}${path.includes("?") ? "&" : "?"}size=portrait`;
    fetch(portrait)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Portrait card answered HTTP ${response.status}`);
        const blob = await response.blob();
        if (!cancelled) setFile(new File([blob], "whether-weekly-guidance.png", { type: "image/png" }));
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [supported]);

  const handleShare = useCallback(() => {
    if (!file) return;
    /* The guidance and the link travel with the picture, as every paste carries them. */
    const text = artifact
      ? `${artifact.regimeLabel}: ${artifact.call}\n${resolveSharedBriefUrl(artifact, window.location.origin)}`
      : window.location.origin;
    navigator
      .share({ files: [file], title: "Whether: this week's guidance", text })
      .then(() => {
        trackActivationEvent({ step: "committed", path: window.location.pathname, commitment: "copied_social" });
        setState("copied");
      })
      /* A dismissed sheet rejects too; that is the reader changing their mind, not a failure. */
      .catch(() => setState("idle"));
  }, [artifact, file]);

  if (!supported) return null;

  return (
    <ClipboardActionRow
      compact
      label="Share the portrait card"
      state={file || state === "error" ? state : "copying"}
      onClick={handleShare}
      leadingIcon={<ShareIcon className="text-slate-400" />}
      stateIcons={{
        copying: <SpinnerIcon className="text-slate-400" />,
        copied: <CheckIcon className="text-emerald-400" />,
      }}
      buttonLabels={{
        copying: <span className="text-slate-300">Rendering…</span>,
        copied: <span className="text-emerald-300">Shared</span>,
        error: <span className="text-rose-400">Card unavailable</span>,
      }}
      buttonProps={{
        title: "Share this week's guidance as a 1080×1350 picture, to LinkedIn, Instagram, or a chat app",
      }}
    />
  );
}
