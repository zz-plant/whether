"use client";

import { useEffect, useState } from "react";
import { getMonthlyRegimeHistory } from "../../../lib/summary/monthlyRegimeHistory";

type WeekDeltaProps = {
  tightness: number;
  confidenceLabel: string;
  postureLabel: string;
};

type Comparison = { prevTightness?: number; prevRegime?: string; prevPosture?: string } | null;

export function WeekDelta({ tightness, confidenceLabel, postureLabel }: WeekDeltaProps) {
  const [comparison, setComparison] = useState<Comparison>(null);

  useEffect(() => {
    const history = getMonthlyRegimeHistory();
    if (!history.length) return;
    const currentIdx = history.length - 1;
    const prevIdx = Math.max(0, currentIdx - 1);

    setComparison({
      prevRegime: history[prevIdx]?.regime,
    });
  }, []);

  if (!comparison) return null;

  const prevRegime = comparison.prevRegime;
  const currRegimeChar = postureLabel?.charAt(0) ?? "";

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-fluid-micro text-slate-500">
      <span>
        Tightness <span className="font-bold text-slate-300">{tightness}</span>
      </span>
      <span className="text-slate-700">·</span>
      <span>
        Confidence <span className="font-semibold text-slate-400">{confidenceLabel}</span>
      </span>
      {prevRegime ? (
        <>
          <span className="text-slate-700">·</span>
          <span>
            Last month: <span className="font-semibold text-slate-500">{prevRegime}</span>
          </span>
        </>
      ) : null}
    </div>
  );
}
