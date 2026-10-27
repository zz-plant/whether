"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, CopyCheck, ImageIcon } from "lucide-react";
import { useClipboardCopy } from "./useClipboardCopy";
import { buildImageBriefApiPath } from "../../lib/report/imageBriefSearchParams";
import { TrendGlyph, type TrendDirection } from "./illustrations/TrendGlyph";
import { DIRECTION_ARROW, DIRECTION_LABEL, type SignalDirection } from "../viewModel";

type Props = {
  call: string;
  /**
   * The week's direction as the headline reads it; the glyph is drawn from it.
   * Absent where there is none to state (nothing compared, or an archived
   * week), and then no badge is drawn.
   */
  direction?: SignalDirection;
  /** The weather word, for the copied text, which states the call the way the hero does. */
  weatherWord: string;
  /** The margin as the strip prints it: "Margin 1 pt" (`formatStripMargin`). */
  marginLabel: string;
  shareLines?: string[];
};

/**
 * The brief's floating actions, from `md` up, out of the thumb zone: the week's
 * direction, the card as an image and the call as text. It printed the weather
 * word, the call and the margin too until 2026-10-27; the running head prints
 * those at the top of the screen now.
 *
 * From `md` up the strip is the floating pill at the foot of the page, shown
 * once the reader has scrolled past the hero. Below `md` the bottom tab bar
 * owns the thumb zone, and this strip used to sit on top of it — two fixed
 * bars, roughly 128px of a 932px viewport, plus a spacer the strip reserved for
 * itself even while hidden. (Reverses the 2026-08 thumb-zone strip, P0 #1 of
 * the design-improvements tracker retired on 2026-10-05.)
 *
 * Below `md` there is no strip of its own (2026-10-27). The phone line that
 * sat under the header once the hero left the viewport (weather word, call,
 * margin, a jump to the areas) is the running head's second line now
 * (`runningHead.tsx`): one bar at the top of every frame, carrying the site
 * and the week too, so a phone screenshot of the brief names its source.
 *
 * The badge is the only place the weekly direction appears once scrolled, so it
 * states the direction in words rather than leaving a bare arrow character for
 * a screen reader to announce as "upwards arrow".
 */
const DIRECTION_BADGE: Record<SignalDirection, { glyph: TrendDirection; tone: string }> = {
  tighten: { glyph: "up", tone: "text-rose-300" },
  ease: { glyph: "down", tone: "text-emerald-300" },
  hold: { glyph: "flat", tone: "text-slate-300" },
};

/** The hero, which the strip watches: it has a job only once the hero is gone. */
const HERO_ID = "share-ready-artifact";

export function StickyCallStrip({ call, direction, weatherWord, marginLabel, shareLines }: Props) {
  const { status, copyToClipboard } = useClipboardCopy({ commitment: "copied_brief" });
  const isCopied = status === "copied";
  const currentSearchParams = useSearchParams();
  const [showStrip, setShowStrip] = useState(false);
  const [heroLeft, setHeroLeft] = useState(false);
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

  /* The strip watches the hero itself rather than a scroll offset: it waits
     until the call has scrolled off the top, whatever sits above the hero on
     this visit (a banner, a since-last-visit line, nothing). */
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
      `Whether · ${weatherWord} · ${marginLabel}`,
      // Plain-text artifact, so the compact glyph is right here — sourced from
      // the shared map rather than re-derived.
      direction ? `${DIRECTION_ARROW[direction]} ${call}` : call,
      ...(shareLines ?? []),
      "whether.work",
    ].filter(Boolean).join(" — ");
    await copyToClipboard(text, "Weekly guidance");
  };

  return (
    <>
      {/* Past the scroll offset and with the card off screen: from `md` up the
          offset alone let the pill rise while the foot of the card, with its
          weather word and margin, was still in view (2026-10-09). */}
      {showStrip && heroLeft ? (
        <div
          data-testid="sticky-call-strip"
          className="pointer-events-none fixed inset-x-0 bottom-0 z-40 hidden px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 md:block lg:inset-x-auto lg:bottom-6 lg:right-6 lg:px-0 lg:pb-0 lg:pt-0 lg:bg-none bg-gradient-to-t from-[var(--bg-body)] via-[var(--bg-body)]/88 to-transparent"
        >
          {/* One elevation, from the ladder: the strip floats over the page, so it
              takes the top surface step rather than a hand-mixed pair of shadows. */}
          <div className="pointer-events-auto ml-auto flex w-fit items-center gap-2 rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--bg-raised)]/95 px-3 py-2 shadow-[var(--elev-4)] backdrop-blur-xl">
            {/* The week's direction, then the actions. The weather word, the call and
                the margin are the running head's now (2026-10-27): it prints them at the
                top of the same screen, and here, 448px wide at the foot of a two-column
                section, they covered the text a screenshot was taken for. */}
            {direction ? (
              /* A glyph, unframed: in a 6px box it was the download button's
                 shape, three items to its right (ui-ux-standards §XXVII). */
              <span className={`inline-flex shrink-0 items-center ${DIRECTION_BADGE[direction].tone}`}>
                <TrendGlyph direction={DIRECTION_BADGE[direction].glyph} className="h-4 w-4" />
                <span className="sr-only">{`${DIRECTION_LABEL[direction]} this week.`}</span>
              </span>
            ) : null}
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
