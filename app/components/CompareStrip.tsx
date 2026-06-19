"use client";

import { useEffect, useState } from "react";
import { getTimeMachineRegimeSeries } from "../../../lib/timeMachine/timeMachineCache";
import { REGIME_DISPLAY } from "../viewModel";

export function CompareStrip({
  currentRegime,
  currentTightness,
  tightnessDelta,
  serverPrevious,
}: {
  currentRegime: string;
  currentTightness: number;
  tightnessDelta?: number;
  serverPrevious?: { regime: string; recordDate: string } | null;
}) {
  const [isComparing, setIsComparing] = useState(false);
  const [previous, setPrevious] = useState<{ regime: string; recordDate: string } | null>(null);

  useEffect(() => {
    try {
      const series = getTimeMachineRegimeSeries(12);
      if (series.length >= 2) {
        const prev = series[series.length - 2];
        setPrevious({ regime: prev.regime, recordDate: prev.recordDate });
        return;
      }
    } catch { /* time machine may be empty */ }
    // Fall back to server-provided previous period when client cache is empty
    if (serverPrevious) {
      setPrevious(serverPrevious);
    }
  }, [serverPrevious]);

  if (!previous) return null;

  return (
    <div className="weather-card">
      <label className="relative inline-flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-lg px-1 pr-2 transition-colors focus-within:bg-white/[0.03] focus-within:ring-2 focus-within:ring-sky-400/60 hover:bg-white/[0.03]">
        <input
          type="checkbox"
          name="compare-previous"
          checked={isComparing}
          onChange={(e) => setIsComparing(e.target.checked)}
          className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
        <span className="relative h-5 w-9 rounded-full border border-white/[0.1] bg-white/[0.05] transition-colors peer-checked:border-sky-500/40 peer-checked:bg-sky-500/20 peer-focus-visible:ring-2 peer-focus-visible:ring-sky-400/70 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-transparent after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white/45 after:transition-transform peer-checked:after:translate-x-4 peer-checked:after:bg-sky-300" />
        <span className="text-fluid-micro font-medium tracking-[0.04em] text-white/55 transition-colors peer-checked:text-sky-200">
          Compare to previous period
        </span>
      </label>

      {isComparing ? (
        <div className="mt-4 pt-3 border-t border-white/[0.06] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-2.5">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-white/30">Previous Period</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-fluid-xs font-semibold text-white/60">
                  {REGIME_DISPLAY[previous.regime] ?? previous.regime}
                </span>
              </div>
              <p className="text-fluid-nano text-white/25 mt-0.5 font-mono">{previous.recordDate}</p>
            </div>

            <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] p-2.5">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-sky-300/40">Current Period</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-fluid-xs font-semibold text-white">
                  {REGIME_DISPLAY[currentRegime] ?? currentRegime}
                </span>
                <span className="text-fluid-nano text-white/55 font-mono bg-white/[0.06] px-1.5 py-0.5 rounded">
                  {currentTightness} pts
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-fluid-micro">
            {previous.regime !== currentRegime ? (
              <span className="inline-flex items-center gap-1.5 rounded bg-sky-500/10 px-2 py-0.5 font-medium text-sky-300">
                Regime Shift: {REGIME_DISPLAY[previous.regime] ?? previous.regime} → {REGIME_DISPLAY[currentRegime] ?? currentRegime}
              </span>
            ) : null}
            {tightnessDelta != null && tightnessDelta !== 0 ? (
              <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-medium ${
                tightnessDelta > 0 ? "bg-amber-500/10 text-amber-300" : "bg-emerald-500/10 text-emerald-300"
              }`}>
                Tightness: {tightnessDelta > 0 ? "Increased" : "Decreased"} by {Math.abs(tightnessDelta).toFixed(1)} pts
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded bg-white/[0.05] px-2 py-0.5 font-medium text-white/40">
                Tightness: Unchanged
              </span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
