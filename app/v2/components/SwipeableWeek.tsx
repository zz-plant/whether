"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getTimeMachineRegimeSeries } from "../../../lib/timeMachine/timeMachineCache";

type MonthEntry = { recordDate: string; month: number; year: number };

export function SwipeableWeek({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [months, setMonths] = useState<MonthEntry[]>([]);

  useEffect(() => {
    try {
      const series = getTimeMachineRegimeSeries(24);
      const unique = new Map<string, MonthEntry>();
      for (const entry of series) {
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
    } catch { /* cache empty */ }
  }, []);

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
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const sorted = [...months].sort((a, b) =>
        new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime()
      );

      const currentIndex = sorted.findIndex(
        (m) => m.month === currentMonth && m.year === currentYear
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
  }, [months, router]);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="touch-pan-y"
    >
      {children}
    </div>
  );
}
