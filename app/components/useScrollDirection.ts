/**
 * Tracks scroll direction and position for scroll-aware UI behaviors.
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
  /** Current window.scrollY */
  scrollY: number;
};

const SCROLL_THRESHOLD = 80;

export function useScrollDirection(threshold = SCROLL_THRESHOLD): ScrollDirectionState {
  const [state, setState] = useState<ScrollDirectionState>({
    direction: "up",
    isPastThreshold: false,
    scrollY: 0,
  });

  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const direction: ScrollDirection =
          currentScrollY > lastScrollY.current && currentScrollY > threshold
            ? "down"
            : "up";

        lastScrollY.current = currentScrollY;

        setState({
          direction,
          isPastThreshold: currentScrollY > threshold,
          scrollY: currentScrollY,
        });

        ticking.current = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  return state;
}
