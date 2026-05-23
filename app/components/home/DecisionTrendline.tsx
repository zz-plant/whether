"use client";

import { useEffect, useState } from "react";

const DECISION_LOG_KEY = "whether_decision_log";

type DecisionEntry = { date: string; posture: string; action: string };

export function DecisionTrendline() {
  const [entries, setEntries] = useState<DecisionEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DECISION_LOG_KEY);
      if (raw) {
        const log: DecisionEntry[] = JSON.parse(raw);
        setEntries(log.slice(-6));
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  if (!hydrated) return null;
  if (entries.length < 2) {
    return (
      <p className="text-fluid-xs text-slate-600 text-center">
        Decision trendline will appear after your second weekly review.
      </p>
    );
  }

  const latest = entries[entries.length - 1];
  const previous = entries[entries.length - 2];
  const direction = latest.posture === previous.posture ? "holding" :
    latest.posture.includes("Tight") && !previous.posture.includes("Tight") ? "tightening" :
    latest.posture.includes("Expand") && !previous.posture.includes("Expand") ? "expanding" :
    "shifting";

  const momentumColor = direction === "tightening" ? "from-rose-500/20 to-rose-500/5 border-rose-500/30" :
    direction === "expanding" ? "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30" :
    direction === "holding" ? "from-slate-500/20 to-slate-500/5 border-slate-500/30" :
    "from-amber-500/20 to-amber-500/5 border-amber-500/30";

  const momentumLabel = direction === "tightening" ? "Tightening" :
    direction === "expanding" ? "Expanding" :
    direction === "holding" ? "Holding steady" : "Shifting";

  return (
    <div className={`max-w-xl mx-auto rounded-lg border bg-gradient-to-r ${momentumColor} px-4 py-3`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-500">Decision trend</p>
          <p className="mt-1 text-sm font-semibold text-slate-200">{momentumLabel}</p>
        </div>
        <div className="flex items-end gap-1.5 h-10">
          {entries.map((entry, i) => {
            const isTightening = entry.posture.toLowerCase().includes("tight");
            const isExpanding = entry.posture.toLowerCase().includes("expand");
            const height = 30 + (i / Math.max(entries.length - 1, 1)) * 60;
            return (
              <div key={entry.date} className="flex flex-col items-center gap-0.5">
                <div
                  className={`w-3 rounded-t-sm transition-all ${
                    isTightening ? "bg-rose-400/60" : isExpanding ? "bg-emerald-400/60" : "bg-slate-500/40"
                  }`}
                  style={{ height: `${height}%` }}
                  title={`${entry.date}: ${entry.posture}`}
                />
                <span className="text-[0.55rem] text-slate-600">
                  {new Date(entry.date).toLocaleDateString("en", { month: "short", day: "numeric" })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
