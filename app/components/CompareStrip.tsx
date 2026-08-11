"use client";

import { useEffect, useState } from "react";
import { getTimeMachineRegimeSeries } from "../../lib/timeMachine/timeMachineCache";
import { REGIME_DISPLAY, REGIME_COLORS } from "../viewModel";

export function CompareStrip({
  currentRegime,
  currentTightness,
  tightnessDelta,
  riskAppetite,
  riskAppetiteDelta,
  serverPrevious,
  autoExpand = false,
}: {
  currentRegime: string;
  currentTightness: number;
  tightnessDelta?: number;
  riskAppetite?: number;
  riskAppetiteDelta?: number;
  serverPrevious?: { regime: string; recordDate: string } | null;
  autoExpand?: boolean;
}) {
  const [isComparing, setIsComparing] = useState(autoExpand);
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
    <div className="weather-section-border">
      <label className="relative inline-flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-lg px-1 pr-2 transition-colors focus-within:bg-white/[0.03] focus-within:ring-2 focus-within:ring-sky-400/60 hover:bg-white/[0.03]">
        <input
          type="checkbox"
          name="compare-previous"
          checked={isComparing}
          onChange={(e) => setIsComparing(e.target.checked)}
          className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0 pointer-events-none"
        />
        <span className="relative h-5 w-9 rounded-full border border-white/[0.08] bg-white/[0.04] transition-colors peer-checked:border-sky-500/40 peer-checked:bg-sky-500/20 peer-focus-visible:ring-2 peer-focus-visible:ring-sky-400/70 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-transparent after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white/45 after:transition-transform peer-checked:after:translate-x-4 peer-checked:after:bg-sky-300" />
        <span className="text-fluid-sm font-medium text-white/65 transition-colors peer-checked:text-sky-200">
          Compare to last week
        </span>
      </label>

      {isComparing ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-fluid-nano text-white/40">Previous</p>
            <div className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${REGIME_COLORS[previous.regime] ?? 'bg-slate-400/60'}`} />
              <span className="text-fluid-sm text-white/70 font-medium">{REGIME_DISPLAY[previous.regime] ?? previous.regime}</span>
            </div>
            <p className="text-fluid-nano text-white/40">{previous.recordDate}</p>
          </div>

          <div className="space-y-1">
            <p className="text-fluid-nano text-white/40">Current</p>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${REGIME_COLORS[currentRegime] ?? 'bg-slate-400/60'}`} />
                <span className="text-fluid-sm text-white/70 font-medium">{REGIME_DISPLAY[currentRegime] ?? currentRegime}</span>
              </span>
              <span className="text-fluid-nano text-white/50 font-mono">{currentTightness} pts</span>
            </div>
            {/* No dot on the metric row: the colored-dot vocabulary in this strip means
                "regime", and an emerald dot beside a metric collides with the Expansion dot. */}
            {typeof riskAppetite === "number" ? (
              <div className="flex items-center justify-between mt-1">
                <span className="text-fluid-sm text-white/70 font-medium">Risk appetite</span>
                <span className="text-fluid-nano text-white/50 font-mono">{riskAppetite}/100</span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {isComparing ? (
        <div className="mt-4 flex flex-wrap gap-2 text-fluid-xs">
          {previous.regime !== currentRegime ? (
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-sky-500/10 px-2 py-0.5 text-sky-300">
              Posture shift: {REGIME_DISPLAY[previous.regime] ?? previous.regime} → {REGIME_DISPLAY[currentRegime] ?? currentRegime}
            </span>
          ) : null}
          {tightnessDelta != null && tightnessDelta !== 0 ? (
            <span className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 ${tightnessDelta > 0 ? "bg-amber-500/10 text-amber-300" : "bg-emerald-500/10 text-emerald-300"}`}>
              Cash availability: {tightnessDelta > 0 ? "↑ +" : "↓ -"}{Math.abs(tightnessDelta).toFixed(1)} pts {Math.abs(tightnessDelta) >= 3 ? "· notable shift" : ""}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-white/[0.04] px-2 py-0.5 text-white/60">
              Cash availability: → unchanged
            </span>
          )}
          {typeof riskAppetiteDelta === "number" && riskAppetiteDelta !== 0 ? (
            <span className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 ${riskAppetiteDelta > 0 ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>
              Risk appetite: {riskAppetiteDelta > 0 ? "↑ +" : "↓ -"}{Math.abs(riskAppetiteDelta).toFixed(1)} pts {Math.abs(riskAppetiteDelta) >= 3 ? "· notable shift" : ""}
            </span>
          ) : typeof riskAppetite === "number" ? (
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-white/[0.04] px-2 py-0.5 text-white/60">
              Risk appetite: → unchanged
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
