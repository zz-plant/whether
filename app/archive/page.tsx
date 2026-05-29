"use client";

import Link from "next/link";
import { PageShell } from "../components/pageShell";
import { getTimeMachineRegimeSeries } from "../../lib/timeMachine/timeMachineCache";

export const runtime = "edge";
export const revalidate = 3600;

export default function ArchivePage() {
  const series = getTimeMachineRegimeSeries();
  const sorted = series.slice().reverse(); // newest first

  return (
    <PageShell backdropVariant="default" showFooter>
      <article className="weather-panel space-y-6 px-5 py-5">
        <h1 className="text-fluid-xl font-semibold text-slate-100">Brief Archive</h1>
        <p className="text-sm text-slate-300">
          Historical macro regime briefs, newest first. Click any row to view the full brief.
        </p>

        <ul className="space-y-1">
          {sorted.map((entry) => {
            const href = `/?month=${entry.month}&year=${entry.year}`;
            const regimeColor =
              entry.regime === "EXPANSION" ? "text-emerald-300"
              : entry.regime === "VOLATILE" ? "text-amber-300"
              : entry.regime === "SCARCITY" ? "text-rose-300"
              : "text-slate-400";

            return (
              <li key={entry.recordDate}>
                <Link
                  href={href}
                  className="block px-3 py-2 border border-slate-700/30 hover:bg-slate-800/30 transition-colors text-xs text-slate-300 no-underline"
                >
                  <span className="text-slate-400 tabular-nums">{entry.recordDate}</span>
                  <span className={`ml-3 font-semibold uppercase tracking-[0.06em] ${regimeColor}`}>
                    {entry.regime}
                  </span>
                  <span className="ml-3 text-slate-400 truncate">{entry.summary}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </article>
    </PageShell>
  );
}
