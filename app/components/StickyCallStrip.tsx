"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, CopyCheck, ImageIcon } from "lucide-react";
import { useClipboardCopy } from "./useClipboardCopy";
import { buildImageBriefApiPath } from "../../lib/report/imageBriefSearchParams";
import { TrendGlyph, trendDirectionFromDelta, trendToneClass, type TrendDirection } from "./illustrations/TrendGlyph";
import { DIRECTION_ARROW, DIRECTION_LABEL, type SignalDirection } from "../viewModel";
import { OPERATING_LATITUDE_LABEL } from "../../lib/report/reportCopy";

type Props = {
  call: string;
  /** Weekly posture direction. Names the movement; the glyph is drawn from it. */
  direction: SignalDirection;
  boldnessScore: number;
  boldnessDelta: number;
  shareLines?: string[];
};

/**
 * Rendered from `md` up only. Below `md` the bottom tab bar owns the thumb zone,
 * and this strip used to sit on top of it — two fixed bars, roughly 128px of a
 * 932px viewport, plus a spacer the strip reserved for itself even while hidden.
 * With the brief at about three phone screens the hero's Copy Brief is one flick
 * away, which is what the strip existed to shortcut. (Reverses the 2026-08
 * thumb-zone strip in docs/design-improvements-priority.md, P0 #1.)
 *
 * The badge is the only place the weekly direction appears once scrolled, so it
 * states the direction in words rather than leaving a bare arrow character for
 * a screen reader to announce as "upwards arrow".
 */
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

    // Only the subscribe field hides the strip now. The `[data-sticky-strip-hide]`
    // hook it also honoured was set by the stress-test quick card, which left
    // the homepage on 2026-09-15; a selector nothing sets is what Invariant 11
    // exists to catch.
    const subscribeField = document.getElementById("subscribe-email");
    const blockingTargets: Element[] = subscribeField ? [subscribeField] : [];

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
      `Whether · ${OPERATING_LATITUDE_LABEL} ${boldnessScore}/100 (${deltaLabel})`,
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
      {showStrip ? (
        <div
          data-testid="sticky-call-strip"
          className="pointer-events-none fixed inset-x-0 bottom-0 z-40 hidden px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 md:block lg:inset-x-auto lg:bottom-6 lg:right-6 lg:px-0 lg:pb-0 lg:pt-0 lg:bg-none bg-gradient-to-t from-[var(--bg-body)] via-[var(--bg-body)]/88 to-transparent"
        >
          {/* One elevation, from the ladder: the strip floats over the page, so it
              takes the top surface step rather than a hand-mixed pair of shadows. */}
          <div className="pointer-events-auto mx-auto flex max-w-[72rem] items-center gap-2 rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--bg-raised)]/95 px-3 py-2 shadow-[var(--elev-4)] backdrop-blur-xl lg:max-w-md">
            <span className="flex min-w-0 flex-1 items-center gap-2 text-fluid-xs font-semibold leading-tight text-slate-100">
              <span
                className={`inline-flex size-7 items-center justify-center rounded-lg text-sm font-bold ${DIRECTION_BADGE[direction].tone}`}
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
            <span className={`flex-shrink-0 text-fluid-xs tabular-nums font-medium ${deltaColor}`}>{deltaLabel}</span>
            {/* Both actions are the shared ghost button; a plain `<a>` with its own
                class chain drops the control radius, the press and the focus ring
                the class carries. The download is an API path, so it stays an
                anchor rather than a router Link. */}
            <a
              href={imageBriefHref}
              download="whether-brief.png"
              className="weather-button weather-focus-ring weather-press-scale inline-flex flex-shrink-0 items-center justify-center text-fluid-xs"
              aria-label="Download decision card image"
            >
              <ImageIcon className="h-4 w-4" aria-hidden="true" />
            </a>
            <button
              type="button"
              onClick={handleCopy}
              className="weather-button weather-focus-ring weather-press-scale inline-flex flex-shrink-0 items-center justify-center gap-1.5 text-fluid-xs"
              aria-label={isCopied ? "Copied weekly call" : "Copy weekly call"}
            >
              {isCopied ? (
                <>
                  <CopyCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-400 font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  <span className="font-medium">Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
