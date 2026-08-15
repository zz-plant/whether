"use client";

import { useEffect, useState } from "react";
import { useCrossDeviceSync } from "../../../lib/hooks/useCrossDeviceSync";
import { REGIME_COLORS, REGIME_DISPLAY } from "../../viewModel";

const DECISION_LOG_KEY = "whether_decision_log";

type DecisionEntry = { date: string; posture: string; action: string };

const REGIME_TEXT_COLORS: Record<string, string> = {
  SCARCITY: "text-rose-300",
  DEFENSIVE: "text-amber-300",
  VOLATILE: "text-sky-300",
  EXPANSION: "text-emerald-300",
};

type MacroTrendlineProps = {
  regimes: Array<{ record_date: string; regime: string }>;
};

export function DecisionTrendline({ regimes }: MacroTrendlineProps) {
  const [logEntries, setLogEntries] = useState<DecisionEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  useCrossDeviceSync(DECISION_LOG_KEY, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DECISION_LOG_KEY);
      if (raw) {
        const log: DecisionEntry[] = JSON.parse(raw);
        setLogEntries(log.slice(-6));
      }
    } catch {}
    setHydrated(true);
  }, []);

  const data = regimes.length >= 2 ? regimes : [];

  if (!hydrated || data.length < 2) {
    return (
      <p className="text-fluid-xs text-slate-400 text-center">
        Trendline appears once 2+ weeks of history is available. Check back next week.
      </p>
    );
  }

  const latestRegime = data[data.length - 1].regime;
  const prevRegime = data[data.length - 2].regime;
  const changed = latestRegime !== prevRegime;
  const latestRegimeLabel = REGIME_DISPLAY[latestRegime] ?? latestRegime;
  const momentumLabel = changed
    ? `Shifted to ${latestRegimeLabel}`
    : `${latestRegimeLabel} holding`;

  return (
    <div className="max-w-xl mx-auto rounded-lg border border-slate-800/60 bg-slate-900/30 px-4 py-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="type-eyebrow">Macro trend</p>
          <p className="mt-1 text-sm font-semibold text-slate-200">{momentumLabel}</p>
        </div>
        <div className="flex items-end gap-1.5 h-16 relative">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden="true">
            <polyline
              fill="none"
              stroke="rgba(148,163,184,0.4)"
              strokeWidth="2"
              points={data.map((_, i) => {
                const x = (i / Math.max(data.length - 1, 1)) * 100;
                const y = 100 - (30 + (i / Math.max(data.length - 1, 1)) * 60);
                return `${x},${y}`;
              }).join(" ")}
            />
          </svg>
          {data.map((entry, i) => {
            const height = 30 + (i / Math.max(data.length - 1, 1)) * 60;
            return (
              <div key={entry.record_date} className="flex flex-col items-center gap-0.5">
                <div
                  className={`w-3 rounded-t-sm transition-[height,background-color] ${REGIME_COLORS[entry.regime] ?? "bg-slate-500/40"}`}
                  style={{ height: `${height}%` }}
                  title={`${entry.record_date}: ${REGIME_DISPLAY[entry.regime] ?? entry.regime}`}
                />
                <span className={`text-fluid-nano font-semibold leading-none ${REGIME_TEXT_COLORS[entry.regime] ?? "text-slate-400"}`}>
                  {REGIME_DISPLAY[entry.regime] ?? entry.regime}
                </span>
                <span className="text-fluid-nano text-slate-400">
                  {new Date(entry.record_date).toLocaleDateString("en", { month: "short", year: "numeric" })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-fluid-nano text-slate-400 text-right">
        Last {data.length} months · MacRo regime history
      </p>
    </div>
  );
}
