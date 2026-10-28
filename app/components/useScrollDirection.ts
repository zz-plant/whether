/**
 * Tracks scroll direction for scroll-aware UI behaviors.
 * Returns `up` / `down` direction and whether the user has scrolled past a threshold.
 *
 * Use case: hide-on-scroll-down headers, show-on-scroll-up FABs, sticky elements.
 */
"use client";

import { useEffect, useRef, useState } from "react";

type ScrollDirection = "up" | "down";

type ScrollDirectionState = {
  direction: ScrollDirection;
  /** True when scrollY > threshold, regardless of direction */
  isPastThreshold: boolean;
};

const SCROLL_THRESHOLD = 80;
/**
 * How far the page must move before the direction can change. Without it, the 1–2px
 * bounce at the end of a flick, or a scroll event with no movement at all, read as
 * "up" and slid the header back over the content.
 */
const DIRECTION_SLOP = 8;

export function useScrollDirection(threshold = SCROLL_THRESHOLD): ScrollDirectionState {
  const [state, setState] = useState<ScrollDirectionState>({
    direction: "up",
    isPastThreshold: false,
  });

  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    /* From where the page is, not from 0 (2026-10-27): a reload or Back can restore
       the scroll position before this runs, and measured from 0 the reader's first
       scroll, whichever way, read as "down" and hid the header they were reaching for. */
    lastScrollY.current = window.scrollY;
    const handleScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      window.requestAnimationFrame(() => {
        ticking.current = false;
        const currentScrollY = window.scrollY;
        const delta = currentScrollY - lastScrollY.current;
        /* Under the slop nothing changes and the start point stays put, so slow
           scrolling still adds up to a direction. Near the top the header shows
           regardless, so that case always updates. */
        if (Math.abs(delta) < DIRECTION_SLOP && currentScrollY > threshold) return;
        const direction: ScrollDirection = delta > 0 && currentScrollY > threshold ? "down" : "up";

        lastScrollY.current = currentScrollY;

        const isPastThreshold = currentScrollY > threshold;
        /* The same state back when nothing a consumer reads has changed. It used to
           carry `scrollY`, which no consumer read and which changed every frame, so
           the header and the running head re-rendered on every frame of a scroll
           (2026-10-27). */
        setState((previous) =>
          previous.direction === direction && previous.isPastThreshold === isPastThreshold
            ? previous
            : { direction, isPastThreshold },
        );
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  return state;
}
