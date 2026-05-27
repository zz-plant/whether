"use client";

import { useEffect, useState } from "react";
import { useCrossDeviceSync } from "../../../lib/hooks/useCrossDeviceSync";

const DECISION_LOG_KEY = "whether_decision_log";

type DecisionEntry = { date: string; posture: string; action: string };

const REGIME_COLORS: Record<string, string> = {
  SCARCITY: "bg-amber-400/60",
  DEFENSIVE: "bg-rose-400/60",
  VOLATILE: "bg-sky-400/60",
  EXPANSION: "bg-emerald-400/60",
};

const REGIME_TEXT_COLORS: Record<string, string> = {
  SCARCITY: "text-amber-300",
  DEFENSIVE: "text-rose-300",
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
      <p className="text-fluid-xs text-slate-600 text-center">
        Macro trendline will appear once sufficient data is available.
      </p>
    );
  }

  const latestRegime = data[data.length - 1].regime;
  const prevRegime = data[data.length - 2].regime;
  const changed = latestRegime !== prevRegime;
  const directionLabel = changed
    ? `Shifted to ${latestRegime.charAt(0) + latestRegime.slice(1).toLowerCase()}`
    : `${latestRegime.charAt(0) + latestRegime.slice(1).toLowerCase()} holding`;

  const latestLog = logEntries.length >= 2 ? logEntries[logEntries.length - 1] : null;
  const momentumLabel = latestLog ? directionLabel : directionLabel;

  return (
    <div className="max-w-xl mx-auto rounded-lg border border-slate-800/60 bg-slate-900/30 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-500">Macro trend</p>
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
                  title={`${entry.record_date}: ${entry.regime}`}
                />
                <span className={`text-[0.5rem] font-semibold leading-none ${REGIME_TEXT_COLORS[entry.regime] ?? "text-slate-500"}`}>
                  {entry.regime.charAt(0) + entry.regime.slice(1).toLowerCase()}
                </span>
                <span className="text-[0.55rem] text-slate-600">
                  {new Date(entry.record_date).toLocaleDateString("en", { month: "short", year: "numeric" })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-[0.6rem] text-slate-600 text-right">
        Last {data.length} months · MacRo regime history
      </p>
    </div>
  );
}
