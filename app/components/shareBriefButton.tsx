"use client";

import { useCallback, useRef, useState } from "react";
import { Share2, Check } from "lucide-react";

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
};

export function ShareBriefButton({
  title = "Whether Weekly Brief",
  text,
  lines,
  url = typeof window !== "undefined" ? window.location.href : "",
  className = "",
  showLabel = false,
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
    const formattedSlackBrief = `*Whether Weekly Brief*\n> *Operating Call:* ${text}${bulletBlock}\n\n*Full Weekly Brief:* ${url || "https://whether.work"}`;
    fallbackCopy(formattedSlackBrief);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setDidCopy(true);
    timeoutRef.current = setTimeout(() => setDidCopy(false), 2000);
  }, [title, text, lines, url]);

  return (
      <button
        type="button"
        onClick={handleClick}
        title="Copy brief to clipboard or share"
        className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-fluid-xs font-semibold text-sky-200 hover:bg-sky-500/20 hover:border-sky-500/50 transition-colors weather-press-scale weather-focus-ring ${className}`}
        aria-label="Copy brief"
      >
      {didCopy ? (
        <Check aria-hidden="true" size={16} strokeWidth={2} className="text-emerald-300" />
      ) : (
        <Share2 aria-hidden="true" size={16} strokeWidth={2} />
      )}
      {showLabel ? <span>{didCopy ? "Brief Copied" : "Copy Brief"}</span> : null}
    </button>
  );
}
