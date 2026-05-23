"use client";

import { useEffect, useState } from "react";
import { getMonthlyRegimeHistory } from "../../../lib/summary/monthlyRegimeHistory";

type CounterfactualSimulatorProps = {
  currentRegime: string;
};

type TransitionStat = {
  to: string;
  count: number;
  lastDate: string;
};

export function CounterfactualSimulator({ currentRegime }: CounterfactualSimulatorProps) {
  const [stats, setStats] = useState<TransitionStat | null>(null);

  useEffect(() => {
    const history = getMonthlyRegimeHistory();
    if (history.length < 3) return;

    const transitions: Record<string, { count: number; lastDate: string }> = {};
    for (let i = 1; i < history.length; i++) {
      if (history[i - 1].regime === currentRegime && history[i].regime !== currentRegime) {
        const to = history[i].regime;
        transitions[to] = {
          count: (transitions[to]?.count ?? 0) + 1,
          lastDate: history[i].record_date,
        };
      }
    }

    const entries = Object.entries(transitions);
    if (!entries.length) return;

    entries.sort((a, b) => b[1].count - a[1].count);
    const [mostCommon] = entries;

    setStats({
      to: mostCommon[0],
      count: mostCommon[1].count,
      lastDate: mostCommon[1].lastDate,
    });
  }, [currentRegime]);

  if (!stats) return null;

  return (
    <p className="text-fluid-xs text-slate-500">
      {currentRegime} has transitioned to {stats.to} {stats.count} time{stats.count !== 1 ? "s" : ""}{" "}
      in the historical record. Last occurrence: {stats.lastDate}.
    </p>
  );
}
