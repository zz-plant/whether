"use client";

import { useCallback, useRef, useState } from "react";
import { CheckIcon, ShareIcon } from "./uiIcons";

function fallbackCopy(text: string): void {
  try {
    void navigator.clipboard.writeText(text);
  } catch {
    // ignore
  }
}

type Props = {
  title?: string;
  text: string;
  /** Labeled decision bullets ("Do now: …", "Pause if: …") appended below the operating call. */
  lines?: string[];
  url?: string;
  className?: string;
  showLabel?: boolean;
  /** Names the artifact this button copies. Two copy controls can share a screen only
   *  when they say what they each copy — DD-005 settled one canonical `Copy Brief` on
   *  `/`, and a second control under that same name is the duplicate it ruled out. */
  label?: string;
  copiedLabel?: string;
};

export function ShareBriefButton({
  title = "Whether Weekly Brief",
  text,
  lines,
  url = typeof window !== "undefined" ? window.location.href : "",
  className = "",
  showLabel = false,
  label = "Copy Brief",
  copiedLabel = "Brief Copied",
}: Props) {
  const [didCopy, setDidCopy] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback(() => {
    const bulletBlock = lines && lines.length > 0 ? `\n${lines.map((line) => `• ${line}`).join("\n")}` : "";
    const payload = { title, text: `${text}${bulletBlock}`, url };
    const canNativeShare = typeof navigator !== "undefined" && "canShare" in navigator && navigator.canShare(payload);
    if (canNativeShare) {
      void navigator.share(payload);
      return;
    }
    // `title` names the artifact, so the pasted block has to use it. Hardcoding the
    // weekly heading here meant a monthly or quarterly call arrived in Slack labelled
    // "Whether Weekly Brief" — the wrong horizon on a message people act on.
    const formattedSlackBrief = `*${title}*\n> *Operating Call:* ${text}${bulletBlock}\n\n*Full brief:* ${url || "https://whether.work"}`;
    fallbackCopy(formattedSlackBrief);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setDidCopy(true);
    timeoutRef.current = setTimeout(() => setDidCopy(false), 2000);
  }, [title, text, lines, url]);

  return (
    <button
      type="button"
      onClick={handleClick}
      title={`${label} — copies to the clipboard, or shares if the browser offers it`}
      data-premium-intent="export_brief"
      data-premium-cta="share_brief_button"
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-fluid-xs font-semibold text-sky-200 hover:bg-sky-500/20 hover:border-sky-500/50 transition-colors weather-press-scale weather-focus-ring ${className}`}
      aria-label={label}
    >
      {didCopy ? (
        <CheckIcon className="size-4 text-emerald-300" />
      ) : (
        <ShareIcon className="size-4" />
      )}
      {showLabel ? <span>{didCopy ? copiedLabel : label}</span> : null}
    </button>
  );
}
