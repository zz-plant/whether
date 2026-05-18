"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "../components/pageShell";

type WeeklySummary = {
  regime: string;
  action: string;
  confidence: string;
  recordDate: string;
  tightness: number;
  riskAppetite: number;
  tightnessDelta: number;
  riskAppetiteDelta: number;
  direction: string;
};

export default function ThisWeekPage() {
  const [data, setData] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/mcp?tool=get_brief")
      .then((r) => r.json())
      .then((brief) => {
        /* Fetch regime projection for deltas */
        fetch("/api/comps").catch(() => {});
        setData({
          regime: brief.regime,
          action: brief.action,
          confidence: brief.confidence,
          recordDate: brief.recordDate,
          tightness: 0, riskAppetite: 0,
          tightnessDelta: 0, riskAppetiteDelta: 0,
          direction: "stable",
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <PageShell backdropVariant="default" showFooter>
      <article className="weather-panel space-y-6 px-5 py-5">
        <h1 className="text-fluid-xl font-semibold text-slate-100">This week</h1>

        {loading ? (
          <div className="animate-pulse h-48 rounded-lg bg-slate-800/30" />
        ) : data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="weather-surface px-4 py-4 space-y-1">
                <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-400">Regime</p>
                <p className="text-lg font-semibold text-slate-100">{data.regime}</p>
              </div>
              <div className="weather-surface px-4 py-4 space-y-1 sm:col-span-2">
                <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-400">Action</p>
                <p className="text-lg font-semibold text-slate-100">{data.action}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="weather-surface px-4 py-4 space-y-1">
                <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-400">Confidence</p>
                <p className={`text-lg font-semibold ${
                  data.confidence === "HIGH" ? "text-emerald-200" :
                  data.confidence === "MED" ? "text-amber-200" : "text-rose-200"
                }`}>{data.confidence}</p>
              </div>
              <div className="weather-surface px-4 py-4 space-y-1">
                <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-400">Direction</p>
                <p className="text-lg font-semibold text-slate-100">{data.direction}</p>
              </div>
              <div className="weather-surface px-4 py-4 space-y-1">
                <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-400">Week of</p>
                <p className="text-lg font-semibold text-slate-100">{data.recordDate}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">What to do this week</h2>
              <div className="weather-surface px-4 py-4 space-y-2">
                <p className="text-sm text-slate-200">{data.action}</p>
                <Link href="/" className="inline-flex text-fluid-xs font-semibold text-sky-200 hover:text-sky-100 no-underline">
                  Read the full brief →
                </Link>
              </div>
            </div>

            <div className="border-t border-slate-700/50 pt-4 flex flex-wrap gap-3">
              <Link href="/feed.xml" className="text-fluid-micro text-slate-400 hover:text-slate-200 underline decoration-slate-600">
                Subscribe via RSS
              </Link>
              <span className="text-slate-600">·</span>
              <Link href="/api/agent?cadence=weekly" className="text-fluid-micro text-slate-400 hover:text-slate-200 underline decoration-slate-600">
                JSON API
              </Link>
              <span className="text-slate-600">·</span>
              <Link href="/brief.md" className="text-fluid-micro text-slate-400 hover:text-slate-200 underline decoration-slate-600">
                Markdown
              </Link>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400">Unable to load the weekly summary.</p>
        )}
      </article>
    </PageShell>
  );
}
