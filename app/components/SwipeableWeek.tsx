"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTimeMachineRegimeSeries } from "../../lib/timeMachine/timeMachineCache";
import { formatMonthYearShortFromValue } from "../../lib/formatters";

type MonthEntry = { recordDate: string; month: number; year: number };

export function SwipeableWeek({
  children,
  currentMonth,
  currentYear,
  serverMonths = [],
}: {
  children: React.ReactNode;
  currentMonth?: number;
  currentYear?: number;
  serverMonths?: Array<{ recordDate: string; month: number; year: number }>;
}) {
  const router = useRouter();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [months, setMonths] = useState<MonthEntry[]>([]);

  useEffect(() => {
    try {
      const series = getTimeMachineRegimeSeries(24);
      const source = series && series.length > 0
        ? series.map((s) => ({ recordDate: s.recordDate }))
        : serverMonths;
      const unique = new Map<string, MonthEntry>();
      for (const entry of source) {
        const d = new Date(entry.recordDate);
        if (Number.isNaN(d.valueOf())) continue;
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (!unique.has(key)) {
          unique.set(key, {
            recordDate: entry.recordDate,
            month: d.getMonth() + 1,
            year: d.getFullYear(),
          });
        }
      }
      setMonths(Array.from(unique.values()));
    } catch {
      const unique = new Map<string, MonthEntry>();
      for (const entry of serverMonths) {
        const d = new Date(entry.recordDate);
        if (Number.isNaN(d.valueOf())) continue;
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (!unique.has(key)) {
          unique.set(key, {
            recordDate: entry.recordDate,
            month: d.getMonth() + 1,
            year: d.getFullYear(),
          });
        }
      }
      setMonths(Array.from(unique.values()));
    }
  }, [serverMonths]);

  const now = new Date();
  const activeMonth = currentMonth ?? (now.getMonth() + 1);
  const activeYear = currentYear ?? now.getFullYear();

  const sortedMonths = useMemo(
    () => [...months].sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime()),
    [months],
  );
  const currentIndex = useMemo(
    () => sortedMonths.findIndex((m) => m.month === activeMonth && m.year === activeYear),
    [sortedMonths, activeMonth, activeYear],
  );

  const navigateToMonth = useCallback((target: MonthEntry | undefined) => {
    if (!target) return;
    router.push(`/?month=${target.month}&year=${target.year}`, { scroll: false });
  }, [router]);

  // The default (no ?month) view is the live week, i.e. the newest entry.
  // sortedMonths is newest-first, so "previous" moves to a HIGHER index.
  const effectiveIndex = currentIndex >= 0 ? currentIndex : 0;
  const canGoToPrevious = effectiveIndex < sortedMonths.length - 1;
  const canGoToLatest = effectiveIndex > 0;

  const goToPrevious = useCallback(() => {
    if (effectiveIndex < sortedMonths.length - 1) navigateToMonth(sortedMonths[effectiveIndex + 1]);
  }, [effectiveIndex, sortedMonths, navigateToMonth]);

  const goToLatest = useCallback(() => {
    // Return to the canonical live brief rather than the latest month's permalink.
    router.push("/", { scroll: false });
  }, [router]);

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
        goToPrevious();
      } else {
        goToLatest();
      }
    }
    touchStart.current = null;
  }, [goToPrevious, goToLatest]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();

    if (event.key === "ArrowLeft") {
      goToPrevious();
    } else {
      goToLatest();
    }
  }, [goToPrevious, goToLatest]);

  return (
    <div
      role="region"
      tabIndex={0}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      className="touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-0 rounded-lg"
      aria-label="Swipe left for current week, right for previous weeks. Use the left and right arrow keys to browse past weeks."
    >
      {months.length > 0 ? (
        <div className="mb-1 flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={goToPrevious}
            disabled={!canGoToPrevious}
            aria-label="Previous month"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 disabled:pointer-events-none disabled:opacity-25"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          {/* The browsed position, named — bare dots read as mystery UI */}
          <span className="text-fluid-micro font-medium tabular-nums text-white/55">
            {(() => {
              const active = sortedMonths[effectiveIndex];
              if (!active) return null;
              const label = formatMonthYearShortFromValue(active.recordDate);
              return effectiveIndex > 0 ? label : `${label} · current`;
            })()}
          </span>
          <div className="ml-1 flex items-center gap-1" aria-hidden="true">
            {months.slice(-6).map((m, i, arr) => {
              const isActive = activeMonth === m.month && activeYear === m.year;
              const isLast = i === arr.length - 1;
              return <span key={`${m.month}-${m.year}`} className={`h-1 w-3 rounded-full transition-[transform,background-color] duration-200 ${isActive ? "scale-[1.25] bg-sky-400/60" : isLast ? "scale-100 bg-white/30" : "scale-100 bg-white/15"}`} />;
            })}
          </div>
          <button
            type="button"
            onClick={goToLatest}
            disabled={!canGoToLatest}
            aria-label="Current month"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 disabled:pointer-events-none disabled:opacity-25"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
      {children}
    </div>
  );
}
