"use client";

import { useEffect, useState } from "react";

type TrendPoint = { date: string; value: number };

type HistoricalTrendChartProps = {
  metric: "tightness" | "riskAppetite";
  label: string;
  color: string;
};

export function HistoricalTrendChart({ metric, label, color }: HistoricalTrendChartProps) {
  const [points, setPoints] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    import("../../lib/timeMachine/timeMachineCache")
      .then((mod) => {
        const snapshots = mod.getTimeMachineSnapshots();
        const data: TrendPoint[] = [];
        for (const snap of snapshots) {
          const scores = snap as unknown as { scores?: Record<string, number> };
          const value = scores.scores?.[metric];
          if (value !== undefined && value !== null) {
            data.push({ date: `${snap.month}/${snap.year}`, value });
          }
        }
        [...data].sort((a, b) => {
          const [am, ay] = a.date.split("/").map(Number);
          const [bm, by] = b.date.split("/").map(Number);
          return ay - by || am - bm;
        });
        if (active) {
          setPoints(data.slice(-12));
          setLoading(false);
        }
      })
      .catch(() => { if (active) { setFailed(true); setLoading(false); } });
    return () => { active = false; };
  }, [metric]);

  if (loading) return <div className="h-12 rounded bg-slate-800/30 animate-pulse" />;
  if (failed || points.length < 2) return null;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 100;
  const h = 32;

  const pathD = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p.value - min) / range) * (h - 4) - 2;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  const currentVal = points[points.length - 1].value;
  const firstVal = points[0].value;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-fluid-micro font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</span>
        <span className="text-fluid-xs font-semibold tabular-nums text-slate-300">
          {currentVal}
          <span className={currentVal > firstVal ? "text-amber-200 ml-1" : "text-emerald-200 ml-1"}>
            {currentVal > firstVal ? "↑" : "↓"}{Math.abs(currentVal - firstVal).toFixed(0)}
          </span>
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8" aria-label={`${label} trend over ${points.length} periods`}>
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={w} cy={h - ((currentVal - min) / range) * (h - 4) - 2} r="2" fill={color} />
      </svg>
    </div>
  );
}
