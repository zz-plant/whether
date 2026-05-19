"use client";

import { useRouter } from "next/navigation";

const QUICK_JUMPS = [
  { label: "Last week", month: new Date().getMonth(), year: new Date().getFullYear() },
  { label: "Last month", month: new Date().getMonth() - 1, year: new Date().getFullYear() },
  { label: "3 months ago", month: new Date().getMonth() - 3, year: new Date().getFullYear() },
  { label: "1 year ago", month: new Date().getMonth(), year: new Date().getFullYear() - 1 },
];

function normalizeMonth(m: number, y: number): { month: number; year: number } {
  let month = m;
  let year = y;
  while (month < 0) { month += 12; year -= 1; }
  while (month > 11) { month -= 12; year += 1; }
  return { month: month + 1, year };
}

export function TimeTravelTrigger() {
  const router = useRouter();

  return (
    <div className="weather-card">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-500">
          View past brief
        </span>
        {QUICK_JUMPS.map((jump) => {
          const { month, year } = normalizeMonth(jump.month, jump.year);
          return (
            <button
              key={jump.label}
              type="button"
              onClick={() => router.push(`/?month=${month}&year=${year}`)}
              className="rounded-full border border-slate-700/70 px-3 py-1 text-fluid-micro font-medium text-slate-400 hover:border-sky-500/40 hover:text-sky-200 transition-colors"
            >
              {jump.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
