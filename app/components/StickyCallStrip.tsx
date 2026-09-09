"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, CopyCheck, ImageIcon } from "lucide-react";
import { useClipboardCopy } from "./useClipboardCopy";
import { buildImageBriefApiPath } from "../../lib/report/imageBriefSearchParams";
import { TrendGlyph, trendDirectionFromDelta, trendToneClass, type TrendDirection } from "./illustrations/TrendGlyph";
import { DIRECTION_ARROW, DIRECTION_LABEL, type SignalDirection } from "../viewModel";

type Props = {
  call: string;
  /** Weekly posture direction. Names the movement; the glyph is drawn from it. */
  direction: SignalDirection;
  boldnessScore: number;
  boldnessDelta: number;
  shareLines?: string[];
};

/** The badge is the only place the weekly direction appears once scrolled, so it
 *  states the direction in words rather than leaving a bare arrow character for
 *  a screen reader to announce as "upwards arrow". */
const DIRECTION_BADGE: Record<SignalDirection, { glyph: TrendDirection; tone: string }> = {
  tighten: { glyph: "up", tone: "bg-rose-500/20 text-rose-300 border border-rose-500/30" },
  ease: { glyph: "down", tone: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" },
  hold: { glyph: "flat", tone: "bg-sky-500/20 text-sky-300 border border-sky-500/30" },
};

export function StickyCallStrip({ call, direction, boldnessScore, boldnessDelta, shareLines }: Props) {
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
  // Boldness rising is the favourable direction, so it resolves through the
  // shared delta palette rather than a local emerald/rose pair.
  const deltaColor = trendToneClass(trendDirectionFromDelta(boldnessDelta), true);

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
      // Plain-text artifact, so the compact glyph is right here — sourced from
      // the shared map rather than re-derived.
      `${DIRECTION_ARROW[direction]} ${call}`,
      ...(shareLines ?? []),
      "whether.work",
    ].filter(Boolean).join(" — ");
    await copyToClipboard(text, "Weekly call");
  };

  return (
    <>
      <div
        className="h-[4.75rem] lg:hidden"
        aria-hidden="true"
      />
      {showStrip ? (
        <div
          data-testid="sticky-call-strip"
          className="pointer-events-none fixed inset-x-0 bottom-[calc(3.25rem+env(safe-area-inset-bottom))] z-40 px-3 pb-2 pt-2 md:bottom-0 md:pb-[max(0.65rem,env(safe-area-inset-bottom))] lg:inset-x-auto lg:bottom-6 lg:right-6 lg:px-0 lg:pb-0 lg:pt-0 lg:bg-none bg-gradient-to-t from-[var(--bg-body)] via-[var(--bg-body)]/88 to-transparent"
        >
          <div className="pointer-events-auto mx-auto flex max-w-[72rem] items-center gap-2 rounded-xl border border-slate-800/90 bg-slate-900/95 px-3 py-2 shadow-2xl shadow-black/50 backdrop-blur-xl lg:max-w-md lg:shadow-[0_12px_32px_rgba(0,0,0,0.45)]">
            <span className="flex min-w-0 flex-1 items-center gap-2 text-fluid-xs font-semibold leading-tight text-slate-100">
              <span
                className={`inline-flex size-7 items-center justify-center rounded-lg text-sm font-bold shadow-inner ${DIRECTION_BADGE[direction].tone}`}
              >
                <TrendGlyph direction={DIRECTION_BADGE[direction].glyph} className="h-4 w-4" />
                <span className="sr-only">{`${DIRECTION_LABEL[direction]} this week.`}</span>
              </span>
              {/* The hero sets this same score in the sans; mono here made one
                  number look like two quantities. Columns get mono, readouts
                  beside a label get tabular figures — see tokens.css. */}
              <span className="text-slate-400 tabular-nums text-xs">{boldnessScore}/100</span>
              <span className="min-w-0 truncate font-medium text-white">{call}</span>
            </span>
            <span className={`hidden flex-shrink-0 text-fluid-xs tabular-nums font-medium ${deltaColor} min-[430px]:inline`}>{deltaLabel}</span>
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
