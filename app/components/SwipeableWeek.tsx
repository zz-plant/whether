"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { TimelineBar, type ZoomPreset } from "./TimelineBar";
import { getAdjacentTimeMachineEntry } from "../../lib/timeMachine/timeMachineCache";

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

  const now = new Date();
  const activeMonth = currentMonth ?? (now.getMonth() + 1);
  const activeYear = currentYear ?? now.getFullYear();

  const handleSelectMonth = useCallback(
    (target: { month: number; year: number }) => {
      // Check if selecting the live/latest month
      if (
        !currentMonth &&
        target.month === activeMonth &&
        target.year === activeYear
      ) {
        router.push("/", { scroll: false });
        return;
      }
      router.push(`/?month=${target.month}&year=${target.year}`, { scroll: false });
    },
    [router, currentMonth, activeMonth, activeYear]
  );

  const goToPreviousMonth = useCallback(() => {
    const prev = getAdjacentTimeMachineEntry(activeYear, activeMonth, "previous");
    if (prev) {
      router.push(`/?month=${prev.month}&year=${prev.year}`, { scroll: false });
    }
  }, [activeYear, activeMonth, router]);

  const goToNextMonth = useCallback(() => {
    const next = getAdjacentTimeMachineEntry(activeYear, activeMonth, "next");
    if (next) {
      router.push(`/?month=${next.month}&year=${next.year}`, { scroll: false });
    } else {
      router.push("/", { scroll: false });
    }
  }, [activeYear, activeMonth, router]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;

    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) {
      if (dx > 0) {
        goToPreviousMonth();
      } else {
        goToNextMonth();
      }
    }
    touchStart.current = null;
  }, [goToPreviousMonth, goToNextMonth]);

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
      {children}
    </section>
  );
}

