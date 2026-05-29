"use client";

import { useEffect, useState } from "react";
import { getTimeMachineRegimeSeries } from "../../../lib/timeMachine/timeMachineCache";

type PreviousData = {
  tightness: number;
  regime: string;
  recordDate: string;
} | null;

export function CompareToggle({
  currentTightness,
  currentRegime,
  children,
}: {
  currentTightness: number;
  currentRegime: string;
  children: (isComparing: boolean, previous: PreviousData) => React.ReactNode;
}) {
  const [isComparing, setIsComparing] = useState(false);
  const [previous, setPrevious] = useState<PreviousData>(null);

  useEffect(() => {
    try {
      const series = getTimeMachineRegimeSeries(12);
      if (series.length >= 2) {
        const prev = series[series.length - 2];
        setPrevious({
          tightness: 0,
          regime: prev.regime,
          recordDate: prev.recordDate,
        });
      }
    } catch { /* time machine may be empty */ }
  }, []);

  return (
    <div>
      <label className="inline-flex items-center gap-2 cursor-pointer mb-3 select-none">
        <input
          type="checkbox"
          checked={isComparing}
          onChange={(e) => setIsComparing(e.target.checked)}
          className="sr-only peer"
        />
        <span className="h-4 w-8 rounded-full border border-white/[0.08] bg-white/[0.04] transition-colors peer-checked:bg-sky-500/20 peer-checked:border-sky-500/30 relative after:absolute after:top-0.5 after:left-0.5 after:h-3 after:w-3 after:rounded-full after:bg-white/40 after:transition-transform peer-checked:after:translate-x-4 peer-checked:after:bg-sky-300" />
        <span className="text-fluid-micro font-medium tracking-[0.04em] text-white/40 peer-checked:text-sky-300 transition-colors">
          Compare to previous
        </span>
      </label>
      {children(isComparing, previous)}
    </div>
  );
}
