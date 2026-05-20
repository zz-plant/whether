"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

function computeQuickJumps() {
  const now = new Date();
  return [
    { label: "Last week", month: now.getMonth(), year: now.getFullYear() },
    { label: "Last month", month: now.getMonth() - 1, year: now.getFullYear() },
    { label: "3 months ago", month: now.getMonth() - 3, year: now.getFullYear() },
    { label: "1 year ago", month: now.getMonth(), year: now.getFullYear() - 1 },
  ];
}

function normalizeMonth(m: number, y: number): { month: number; year: number } {
  let month = m;
  let year = y;
  while (month < 0) { month += 12; year -= 1; }
  while (month > 11) { month -= 12; year += 1; }
  return { month: month + 1, year };
}

export function TimeTravelTrigger() {
  const router = useRouter();
  const quickJumps = useMemo(() => computeQuickJumps(), []);

  return (
    <div className="weather-card">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-amber-200/70">
          View past brief
        </span>
        {quickJumps.map((jump) => {
          const { month, year } = normalizeMonth(jump.month, jump.year);
          return (
            <button
              key={jump.label}
              type="button"
              onClick={() => router.push(`/?month=${month}&year=${year}`)}
              className="rounded-full border border-amber-500/30 bg-amber-500/5 px-3 py-2 min-h-[44px] text-fluid-micro font-medium text-amber-200/80 hover:border-amber-400/50 hover:text-amber-100 focus-visible:outline-2 focus-visible:outline-amber-400 transition-colors inline-flex items-center"
            >
              {jump.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
