"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, CopyCheck, ImageIcon } from "lucide-react";
import { useClipboardCopy } from "./useClipboardCopy";
import { useScrollDirection } from "./useScrollDirection";
import { buildImageBriefApiPath } from "../../lib/report/imageBriefSearchParams";
import { TrendGlyph, type TrendDirection } from "./illustrations/TrendGlyph";
import { DIRECTION_ARROW, DIRECTION_LABEL, type SignalDirection } from "../viewModel";
import { HOME_SECTIONS } from "../../lib/report/home/homeSectionModel";

type Props = {
  call: string;
  /** Weekly posture direction. Names the movement; the glyph is drawn from it. */
  direction: SignalDirection;
  /** The weather word, so the strip states the call the way the hero does. */
  weatherWord: string;
  /** The confidence word ("High", "Medium", "Low"); the strip adds "confidence", since a bare "High" beside the call does not say what is high. */
  confidenceWord: string;
  shareLines?: string[];
};

/**
 * Two strips, one per width, and neither in the thumb zone.
 *
 * From `md` up the strip is the floating pill at the foot of the page, shown
 * once the reader has scrolled past the hero. Below `md` the bottom tab bar
 * owns the thumb zone, and this strip used to sit on top of it — two fixed
 * bars, roughly 128px of a 932px viewport, plus a spacer the strip reserved for
 * itself even while hidden. (Reverses the 2026-08 thumb-zone strip in
 * docs/design-improvements-priority.md, P0 #1.)
 *
 * The phone variant is one line at the *top*, under the header, shown once
 * the hero has left the viewport: weather word, the call, confidence, and a
 * jump to what the call changes. The top is what keeps it out of the thumb
 * zone. It follows the header's own hide-on-scroll: when the header slides
 * away the strip moves up into its place, by transform, on the same curve.
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

/** The hero, which both variants watch: the strip has a job only once it is gone. */
const HERO_ID = "share-ready-artifact";

export function StickyCallStrip({ call, direction, weatherWord, confidenceWord, shareLines }: Props) {
  const { status, copyToClipboard } = useClipboardCopy();
  const isCopied = status === "copied";
  const currentSearchParams = useSearchParams();
  const [showStrip, setShowStrip] = useState(false);
  const [heroLeft, setHeroLeft] = useState(false);
  const { direction: scrollDirection, isPastThreshold } = useScrollDirection();
  const headerHidden = isPastThreshold && scrollDirection === "down";
  const imageBriefHref = useMemo(
    () => buildImageBriefApiPath(currentSearchParams),
    [currentSearchParams],
  );

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

  /* The phone line watches the hero itself rather than a scroll offset: it
     appears exactly when the call has scrolled off the top, whatever sits
     above the hero on this visit (a banner, a since-last-visit line, nothing). */
  useEffect(() => {
    const hero = document.getElementById(HERO_ID);
    if (!hero || !("IntersectionObserver" in window)) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        setHeroLeft(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  const handleCopy = async () => {
    const text = [
      `Whether · ${weatherWord} · ${confidenceWord} confidence`,
      // Plain-text artifact, so the compact glyph is right here — sourced from
      // the shared map rather than re-derived.
      `${DIRECTION_ARROW[direction]} ${call}`,
      ...(shareLines ?? []),
      "whether.work",
    ].filter(Boolean).join(" — ");
    await copyToClipboard(text, "Weekly guidance");
  };

  return (
    <>
      {heroLeft ? (
        <div
          data-testid="phone-call-strip"
          className={`fixed inset-x-0 top-[calc(env(safe-area-inset-top)+3.25rem)] z-40 px-3 pt-1.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden ${
            headerHidden ? "-translate-y-[3.25rem]" : "translate-y-0"
          }`}
        >
          <p className="flex items-center gap-2 rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--bg-raised)]/95 px-3 py-2 text-fluid-xs leading-tight text-slate-100 shadow-[var(--elev-4)] backdrop-blur-xl">
            <span className="shrink-0 font-bold uppercase tracking-wider" style={{ color: "var(--regime-ink)" }}>
              {weatherWord}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium text-white">{call}</span>
            <span className="shrink-0 text-slate-400">{confidenceWord} confidence</span>
            <a
              href={`#${HOME_SECTIONS.consequences.id}`}
              className="weather-focus-ring inline-flex min-h-[44px] shrink-0 items-center text-sky-300 underline decoration-sky-700 underline-offset-4"
            >
              What it changes
            </a>
          </p>
        </div>
      ) : null}
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
              {/* The weather word, not the operating-latitude score it used to
                  print: the page no longer shows that number anywhere, and a
                  strip that restates the call should restate it in the words
                  the hero uses. */}
              <span className="shrink-0 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--regime-ink)" }}>
                {weatherWord}
              </span>
              <span className="min-w-0 truncate font-medium text-white">{call}</span>
            </span>
            <span className="flex-shrink-0 text-fluid-xs text-slate-400">{confidenceWord} confidence</span>
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
              aria-label={isCopied ? "Copied weekly guidance" : "Copy weekly guidance"}
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
