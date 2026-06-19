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
  url?: string;
  className?: string;
  showLabel?: boolean;
};

export function ShareBriefButton({
  title = "Whether Weekly Brief",
  text,
  url = typeof window !== "undefined" ? window.location.href : "",
  className = "",
  showLabel = false,
}: Props) {
  const [didCopy, setDidCopy] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback(() => {
    const payload = { title, text, url };
    const canNativeShare = typeof navigator !== "undefined" && "canShare" in navigator && navigator.canShare(payload);
    if (canNativeShare) {
      void navigator.share(payload);
      return;
    }
    const clipboardText = url ? `${text} — ${url}` : text;
    fallbackCopy(clipboardText);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setDidCopy(true);
    timeoutRef.current = setTimeout(() => setDidCopy(false), 1500);
  }, [title, text, url]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-white/[0.08] px-2.5 py-1.5 text-fluid-xs font-medium text-white/60 hover:text-white/80 hover:border-white/[0.14] transition-colors active:scale-[0.97] ${className}`}
      aria-label="Share brief"
    >
      {didCopy ? (
        <Check aria-hidden="true" size={16} strokeWidth={1.8} className="text-emerald-300" />
      ) : (
        <Share2 aria-hidden="true" size={16} strokeWidth={1.8} />
      )}
      {showLabel ? <span>{didCopy ? "Copied" : "Share"}</span> : null}
    </button>
  );
}
