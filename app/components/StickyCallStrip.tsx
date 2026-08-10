"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, CopyCheck, ImageIcon } from "lucide-react";
import { useClipboardCopy } from "./useClipboardCopy";
import { buildImageBriefApiPath } from "../../lib/report/imageBriefSearchParams";

type Props = {
  call: string;
  arrow: string;
  boldnessScore: number;
  boldnessDelta: number;
  shareLines?: string[];
};

export function StickyCallStrip({ call, arrow, boldnessScore, boldnessDelta, shareLines }: Props) {
  const { status, copyToClipboard } = useClipboardCopy();
  const isCopied = status === "copied";
  const currentSearchParams = useSearchParams();
  const [showStrip, setShowStrip] = useState(false);
  const imageBriefHref = useMemo(
    () => buildImageBriefApiPath(currentSearchParams),
    [currentSearchParams],
  );

  const deltaLabel = boldnessDelta !== 0
    ? `${boldnessDelta > 0 ? "+" : ""}${boldnessDelta.toFixed(0)} vs last week`
    : "unchanged";
  const deltaColor = boldnessDelta > 0 ? "text-emerald-300" : boldnessDelta < 0 ? "text-rose-300" : "text-white/60";

  useEffect(() => {
    let blockingControlInView = false;

    const updateStripVisibility = () => {
      const revealOffset = Math.min(640, window.innerHeight * 0.72);
      setShowStrip(window.scrollY > revealOffset && !blockingControlInView);
    };

    const blockingTargets = [
      document.getElementById("subscribe-email"),
      ...Array.from(document.querySelectorAll("[data-sticky-strip-hide]")),
    ].filter((target): target is Element => target instanceof Element);

    const observer = blockingTargets.length > 0 && "IntersectionObserver" in window
      ? new IntersectionObserver(
        (entries) => {
          blockingControlInView = entries.some((entry) => entry.isIntersecting);
          updateStripVisibility();
        },
        { rootMargin: "0px 0px 96px 0px", threshold: 0.01 },
      )
      : null;

    if (observer) {
      blockingTargets.forEach((target) => observer.observe(target));
    }
    window.addEventListener("scroll", updateStripVisibility, { passive: true });
    window.addEventListener("resize", updateStripVisibility);
    updateStripVisibility();

    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", updateStripVisibility);
      window.removeEventListener("resize", updateStripVisibility);
    };
  }, []);

  const handleCopy = async () => {
    const text = [
      `Whether · Boldness budget ${boldnessScore}/100 (${deltaLabel})`,
      `${arrow} ${call}`,
      ...(shareLines ?? []),
      "whether.work",
    ].filter(Boolean).join(" — ");
    await copyToClipboard(text, "Weekly call");
  };

  return (
    <>
      <div
        className="h-[calc(4.75rem+env(safe-area-inset-bottom))] lg:hidden"
        aria-hidden="true"
      />
      {showStrip ? (
        <div
          data-testid="sticky-call-strip"
          className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:px-0 lg:pb-0 lg:pt-0 lg:bg-none bg-gradient-to-t from-[var(--bg-body)] via-[var(--bg-body)]/88 to-transparent"
        >
          <div className="pointer-events-auto mx-auto flex max-w-[72rem] items-center gap-2 rounded-xl border border-slate-800/90 bg-slate-900/95 px-3 py-2 shadow-2xl shadow-black/50 backdrop-blur-xl lg:max-w-md lg:shadow-[0_12px_32px_rgba(0,0,0,0.45)]">
            <span className="flex min-w-0 flex-1 items-center gap-2 text-fluid-xs font-semibold leading-tight text-slate-100">
              <span className={`inline-flex size-7 items-center justify-center rounded-lg text-sm font-bold shadow-inner ${
                arrow === "↑" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : arrow === "↓" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
              }`}>{arrow}</span>
              <span className="text-slate-400 font-mono text-xs">{boldnessScore}/100</span>
              <span className="min-w-0 truncate font-medium text-white">{call}</span>
            </span>
            <span className={`hidden flex-shrink-0 text-fluid-xs font-mono font-medium ${deltaColor} min-[430px]:inline`}>{deltaLabel}</span>
            <a
              href={imageBriefHref}
              download="whether-brief.png"
              className="inline-flex min-h-11 min-w-11 flex-shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-800/60 text-fluid-xs font-medium text-slate-300 transition-all hover:border-slate-700 hover:text-white hover:bg-slate-800 active:scale-[0.97] no-underline focus-visible:outline-2 focus-visible:outline-sky-400"
              aria-label="Download decision card image"
            >
              <ImageIcon className="h-4 w-4" aria-hidden="true" />
            </a>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex min-h-11 min-w-11 flex-shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-800/60 px-3 text-fluid-xs font-medium text-slate-300 transition-all hover:border-slate-700 hover:text-white hover:bg-slate-800 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-sky-400"
              aria-label={isCopied ? "Copied weekly call" : "Copy weekly call"}
            >
              {isCopied ? (
                <>
                  <CopyCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  <span className="max-[420px]:sr-only text-emerald-400 font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  <span className="max-[420px]:sr-only font-medium">Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
