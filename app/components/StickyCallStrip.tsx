"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, CopyCheck, ImageIcon } from "lucide-react";
import { useClipboardCopy } from "./useClipboardCopy";
import { ShareBriefButton } from "./shareBriefButton";
import { buildImageBriefApiPath } from "../../lib/report/imageBriefSearchParams";

type Props = {
  call: string;
  arrow: string;
  boldnessScore: number;
  boldnessDelta: number;
  guardrail?: string;
};

export function StickyCallStrip({ call, arrow, boldnessScore, boldnessDelta, guardrail }: Props) {
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
      if (window.innerWidth >= 1024) {
        setShowStrip(false);
        return;
      }
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
      `Whether · Boldness Budget ${boldnessScore}/100 (${deltaLabel})`,
      `${arrow} ${call}`,
      guardrail ? `Watch: ${guardrail}` : null,
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
          className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 lg:hidden bg-gradient-to-t from-[var(--bg-body)] via-[var(--bg-body)]/88 to-transparent"
        >
          <div className="pointer-events-auto mx-auto flex max-w-[72rem] items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[var(--bg-raised)]/94 px-2 py-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.26)] backdrop-blur">
            <span className="flex min-w-0 flex-1 items-center gap-1.5 text-fluid-xs font-semibold leading-tight text-white/85">
              <span className={`inline-flex size-7 items-center justify-center rounded-sm text-sm font-bold ${
                arrow === "↑" ? "bg-rose-500/20 text-rose-300" : arrow === "↓" ? "bg-emerald-500/20 text-emerald-300" : "bg-sky-500/20 text-sky-300"
              }`}>{arrow}</span>
              <span className="text-white/60">{boldnessScore}/100</span>
              <span className="min-w-0 truncate">{call}</span>
            </span>
            <span className={`hidden flex-shrink-0 text-fluid-xs font-semibold ${deltaColor} min-[430px]:inline`}>{deltaLabel}</span>
            <a
              href={imageBriefHref}
              download="whether-brief.png"
              className="inline-flex min-h-11 min-w-11 flex-shrink-0 items-center justify-center rounded-sm border border-white/[0.08] text-fluid-xs font-medium text-white/60 transition-colors hover:border-white/[0.14] hover:text-white/80 active:scale-[0.97] no-underline focus-visible:outline-2 focus-visible:outline-sky-400"
              aria-label="Download decision card image"
            >
              <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            <ShareBriefButton
              text={[`Whether · Boldness Budget ${boldnessScore}/100 (${deltaLabel})`, `${arrow} ${call}`, guardrail ? `Watch: ${guardrail}` : null, "whether.work"].filter(Boolean).join(" — ")}
              className="flex-shrink-0"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex min-h-11 min-w-11 flex-shrink-0 items-center justify-center gap-1.5 rounded-sm border border-white/[0.08] px-2.5 text-fluid-xs font-medium text-white/60 transition-colors hover:border-white/[0.14] hover:text-white/80 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-sky-400"
              aria-label={isCopied ? "Copied weekly call" : "Copy weekly call"}
            >
              {isCopied ? (
                <>
                  <CopyCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="max-[420px]:sr-only">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="max-[420px]:sr-only">Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
