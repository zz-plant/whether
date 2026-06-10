"use client";

import { useEffect, useState } from "react";
import { getTimeMachineRegimeSeries } from "../../../lib/timeMachine/timeMachineCache";
import { REGIME_DISPLAY } from "../viewModel";

export function CompareStrip({
  currentRegime,
  currentTightness,
  tightnessDelta,
}: {
  currentRegime: string;
  currentTightness: number;
  tightnessDelta?: number;
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
    <div className="weather-card">
      <label className="inline-flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-lg">
        <input
          type="checkbox"
          name="compare-previous"
          checked={isComparing}
          onChange={(e) => setIsComparing(e.target.checked)}
          className="sr-only peer"
        />
        <span className="relative h-5 w-9 rounded-full border border-white/[0.1] bg-white/[0.05] transition-colors peer-checked:border-sky-500/40 peer-checked:bg-sky-500/20 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sky-400 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white/45 after:transition-transform peer-checked:after:translate-x-4 peer-checked:after:bg-sky-300" />
        <span className="text-fluid-micro font-medium tracking-[0.04em] text-white/55 transition-colors peer-checked:text-sky-200">
          Compare to previous
        </span>
      </label>

      {isComparing ? (
        <div className="mt-2 pt-2 border-t border-white/[0.04] grid grid-cols-2 gap-3 text-fluid-micro">
          <div>
            <p className="text-white/40">Previous</p>
            <p className="text-white/50 font-semibold mt-0.5">
              {REGIME_DISPLAY[previous.regime] ?? previous.regime}
            </p>
            <p className="text-white/30 mt-0.5">{previous.recordDate}</p>
          </div>
          <div>
            <p className="text-white/40">Current</p>
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
          {tightnessDelta != null && tightnessDelta !== 0 ? (
            <p className="col-span-2 text-fluid-micro text-white/40">
              Tightness {tightnessDelta > 0 ? "increased" : "decreased"} by {Math.abs(tightnessDelta).toFixed(1)} pts since last period
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
