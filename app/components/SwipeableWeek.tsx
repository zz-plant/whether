"use client";

import { useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TimelineBar, type ZoomPreset } from "./TimelineBar";
import {
  getAdjacentTimeMachineEntry,
  getLatestTimeMachineSnapshot,
} from "../../lib/timeMachine/timeMachineCache";

const SWIPE_MIN_PX = 60;

/**
 * A horizontal swipe anywhere on the brief navigates a month, which is exactly
 * the gesture a wide table or a scrolling strip inside the brief needs for
 * itself. Walk up from the touch target and decline the swipe if it started
 * somewhere that scrolls sideways, or on the scrubber, which handles its own.
 */
const startsInHorizontalScroller = (target: EventTarget | null): boolean => {
  let node = target instanceof Element ? target : null;

  while (node && node !== document.body) {
    if (node.getAttribute("role") === "slider") return true;
    if (node.scrollWidth > node.clientWidth + 1) {
      const overflowX = window.getComputedStyle(node).overflowX;
      if (overflowX === "auto" || overflowX === "scroll") return true;
    }
    node = node.parentElement;
  }

  return false;
};

export function SwipeableWeek({
  children,
  currentMonth,
  currentYear,
  defaultZoom = "3Y",
}: {
  children: React.ReactNode;
  currentMonth?: number;
  currentYear?: number;
  serverMonths?: Array<{ recordDate: string; month: number; year: number }>;
  defaultZoom?: ZoomPreset;
}) {
  const router = useRouter();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  const isScrubbed = currentMonth !== undefined && currentYear !== undefined;

  /**
   * Escaping a scrub should cost one back-press, not one per month visited.
   * The first move away from live pushes; every move made while already
   * scrubbed replaces that single entry.
   */
  const navigate = useCallback(
    (href: string) => {
      startTransition(() => {
        if (isScrubbed) {
          router.replace(href, { scroll: false });
        } else {
          router.push(href, { scroll: false });
        }
      });
    },
    [router, isScrubbed]
  );

  const handleSelectMonth = useCallback(
    (target: { month: number; year: number }) => {
      navigate(`/?month=${target.month}&year=${target.year}`);
    },
    [navigate]
  );

  const goToAdjacentMonth = useCallback(
    (direction: "previous" | "next") => {
      // Anchor on the newest month on record rather than the wall clock: any
      // gap between the last snapshot and today resolved to a month the record
      // does not hold, and the swipe then did nothing at all.
      const latest = getLatestTimeMachineSnapshot();
      const fromMonth = currentMonth ?? latest?.month;
      const fromYear = currentYear ?? latest?.year;
      if (!fromMonth || !fromYear) return;

      const adjacent = getAdjacentTimeMachineEntry(
        fromYear,
        fromMonth,
        direction
      );
      if (adjacent) {
        navigate(`/?month=${adjacent.month}&year=${adjacent.year}`);
        return;
      }
      if (direction === "next") {
        navigate("/");
      }
    },
    [currentMonth, currentYear, navigate]
  );

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (startsInHorizontalScroller(event.target)) {
      touchStart.current = null;
      return;
    }
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      if (!touchStart.current) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - touchStart.current.x;
      const dy = touch.clientY - touchStart.current.y;

      if (Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 2) {
        goToAdjacentMonth(dx > 0 ? "previous" : "next");
      }
      touchStart.current = null;
    },
    [goToAdjacentMonth]
  );

  return (
    <section
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="touch-pan-y outline-none space-y-3"
      aria-label="Weekly operating brief with interactive timeline"
    >
      <TimelineBar
        currentMonth={currentMonth}
        currentYear={currentYear}
        onSelect={handleSelectMonth}
        defaultZoom={defaultZoom}
        showZoomControls
        className="mb-1"
      />
      {/* The brief below is what the scrub is actually changing, so it carries
          the pending state. Without it a release looked like nothing happened
          until the new month arrived. */}
      <div
        aria-busy={isPending}
        className={
          isPending
            ? "opacity-60 transition-opacity duration-150 motion-reduce:transition-none"
            : "transition-opacity duration-150 motion-reduce:transition-none"
        }
      >
        {children}
      </div>
    </section>
  );
}
