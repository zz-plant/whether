"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getTimeMachineRegimeSeries } from "../../../lib/timeMachine/timeMachineCache";

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
      const now = new Date();
      const activeMonth = currentMonth ?? (now.getMonth() + 1);
      const activeYear = currentYear ?? now.getFullYear();

      const sorted = [...months].sort((a, b) =>
        new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime()
      );

      const currentIndex = sorted.findIndex(
        (m) => m.month === activeMonth && m.year === activeYear
      );

      let targetMonth: MonthEntry | undefined;
      if (dx > 0 && currentIndex > 0) {
        targetMonth = sorted[currentIndex - 1];
      } else if (dx < 0) {
        targetMonth = sorted[0];
      }

      if (targetMonth) {
        router.push(`/?month=${targetMonth.month}&year=${targetMonth.year}`, { scroll: false });
      }
    }
    touchStart.current = null;
  }, [months, router, currentMonth, currentYear]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();

    const now = new Date();
    const activeMonth = currentMonth ?? (now.getMonth() + 1);
    const activeYear = currentYear ?? now.getFullYear();

    const sorted = [...months].sort(
      (a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime(),
    );

    const currentIndex = sorted.findIndex(
      (m) => m.month === activeMonth && m.year === activeYear,
    );

    let targetMonth: MonthEntry | undefined;
    if (event.key === "ArrowLeft" && currentIndex > 0) {
      targetMonth = sorted[currentIndex - 1];
    } else if (event.key === "ArrowRight") {
      targetMonth = sorted[0];
    }

    if (targetMonth) {
      router.push(`/?month=${targetMonth.month}&year=${targetMonth.year}`, { scroll: false });
    }
  }, [months, router, currentMonth, currentYear]);

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
      {children}
      {months.length > 0 ? (
        <p className="mt-2 text-center text-fluid-nano text-white/20 lg:hidden" aria-hidden="true">
          ← swipe to browse past weeks →
        </p>
      ) : null}
    </div>
  );
}
