"use client";

import { useEffect, useState } from "react";
import { getTimeMachineRegimeSeries } from "../../../lib/timeMachine/timeMachineCache";
import { REGIME_DISPLAY } from "../viewModel";

export function CompareStrip({
  currentRegime,
  currentTightness,
}: {
  currentRegime: string;
  currentTightness: number;
}) {
  const [isComparing, setIsComparing] = useState(false);
  const [previous, setPrevious] = useState<{ regime: string; recordDate: string } | null>(null);

  useEffect(() => {
    try {
      const series = getTimeMachineRegimeSeries(12);
      if (series.length >= 2) {
        const prev = series[series.length - 2];
        setPrevious({ regime: prev.regime, recordDate: prev.recordDate });
      }
    } catch { /* time machine may be empty */ }
  }, []);

  if (!previous) return null;

  return (
    <div className="weather-card shadow-[0_2px_8px_rgba(0,0,0,0.2),0_8px_24px_rgba(0,0,0,0.12)]">
      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
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

      {isComparing ? (
        <div className="mt-2 pt-2 border-t border-white/[0.04] grid grid-cols-2 gap-3 text-fluid-micro">
          <div>
            <p className="text-white/30">Previous</p>
            <p className="text-white/50 font-semibold mt-0.5">
              {REGIME_DISPLAY[previous.regime] ?? previous.regime}
            </p>
            <p className="text-white/20 mt-0.5">{previous.recordDate}</p>
          </div>
          <div>
            <p className="text-white/30">Current</p>
            <p className="text-white/70 font-semibold mt-0.5">
              {REGIME_DISPLAY[currentRegime] ?? currentRegime}
            </p>
            <p className="text-white/40 mt-0.5 tabular-nums">{currentTightness} pts</p>
          </div>
          {previous.regime !== currentRegime ? (
            <p className="col-span-2 text-fluid-micro text-sky-300/80">
              Regime shifted from {REGIME_DISPLAY[previous.regime] ?? previous.regime} to {REGIME_DISPLAY[currentRegime] ?? currentRegime}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
