"use client";

import { useState, useMemo } from "react";
import { Sliders, RefreshCw, Zap } from "lucide-react";

type ScenarioSimulatorProps = {
  baseTightness: number;
  baseBoldness: number;
  pauseThreshold?: number;
};

export function ScenarioSimulator({
  baseTightness,
  baseBoldness,
  pauseThreshold = 70,
}: ScenarioSimulatorProps) {
  const [fedDelta, setFedDelta] = useState<number>(0);
  const [cpiDelta, setCpiDelta] = useState<number>(0);
  const [vixSpike, setVixSpike] = useState<number>(0);

  const simulatedTightness = useMemo(() => {
    let delta = 0;
    delta += fedDelta * 10; // +0.25% Fed hike -> +2.5 pts tightness
    delta += cpiDelta * 8;  // +0.5% CPI surge -> +4 pts tightness
    delta += vixSpike * 0.8; // +10 VIX -> +8 pts tightness
    return Math.min(100, Math.max(0, Math.round(baseTightness + delta)));
  }, [baseTightness, fedDelta, cpiDelta, vixSpike]);

  const simulatedBoldness = useMemo(() => {
    return Math.min(100, Math.max(0, 100 - simulatedTightness));
  }, [simulatedTightness]);

  const isFlipped = simulatedTightness >= pauseThreshold;
  const isBaseline = fedDelta === 0 && cpiDelta === 0 && vixSpike === 0;

  const handleReset = () => {
    setFedDelta(0);
    setCpiDelta(0);
    setVixSpike(0);
  };

  return (
    <div className="weather-card p-5 space-y-4 relative overflow-hidden border-sky-500/20">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Zap className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight">Macro Scenario Simulator</h3>
            <p className="text-fluid-micro text-white/50">Test macro shocks & verify whether the posture call flips</p>
          </div>
        </div>

        {!isBaseline ? (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-fluid-nano font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3 h-3" aria-hidden="true" />
            Reset Baseline
          </button>
        ) : null}
      </div>

      {/* Toggles Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Fed Rate Toggle */}
        <div className="space-y-1.5 rounded-lg bg-white/[0.02] border border-white/[0.05] p-3">
          <label className="text-fluid-xs font-semibold text-white/80 block">
            Fed Rate Shift ({fedDelta > 0 ? `+${fedDelta * 0.25}%` : `${fedDelta * 0.25}%`})
          </label>
          <input
            type="range"
            min="-2"
            max="2"
            step="1"
            value={fedDelta}
            onChange={(e) => setFedDelta(parseFloat(e.target.value))}
            className="w-full accent-sky-400 bg-white/10 rounded cursor-pointer"
          />
          <div className="flex justify-between text-fluid-nano text-white/40 font-mono">
            <span>-50bps Cut</span>
            <span>Baseline</span>
            <span>+50bps Hike</span>
          </div>
        </div>

        {/* CPI Delta Toggle */}
        <div className="space-y-1.5 rounded-lg bg-white/[0.02] border border-white/[0.05] p-3">
          <label className="text-fluid-xs font-semibold text-white/80 block">
            Inflation Surge ({cpiDelta > 0 ? `+${cpiDelta * 0.5}%` : `${cpiDelta * 0.5}%`})
          </label>
          <input
            type="range"
            min="-2"
            max="2"
            step="1"
            value={cpiDelta}
            onChange={(e) => setCpiDelta(parseFloat(e.target.value))}
            className="w-full accent-amber-400 bg-white/10 rounded cursor-pointer"
          />
          <div className="flex justify-between text-fluid-nano text-white/40 font-mono">
            <span>-1.0% CPI</span>
            <span>Baseline</span>
            <span>+1.0% CPI</span>
          </div>
        </div>

        {/* VIX Spike Toggle */}
        <div className="space-y-1.5 rounded-lg bg-white/[0.02] border border-white/[0.05] p-3">
          <label className="text-fluid-xs font-semibold text-white/80 block">
            Volatility Surge (VIX +{vixSpike})
          </label>
          <input
            type="range"
            min="0"
            max="20"
            step="5"
            value={vixSpike}
            onChange={(e) => setVixSpike(parseFloat(e.target.value))}
            className="w-full accent-rose-400 bg-white/10 rounded cursor-pointer"
          />
          <div className="flex justify-between text-fluid-nano text-white/40 font-mono">
            <span>VIX Baseline</span>
            <span>VIX +10</span>
            <span>VIX +20</span>
          </div>
        </div>
      </div>

      {/* Dynamic Simulated Stance Banner */}
      <div className={`rounded-xl border p-4 flex flex-wrap items-center justify-between gap-4 ${
        isFlipped
          ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
      }`}>
        <div className="space-y-0.5">
          <span className="text-fluid-nano font-semibold uppercase tracking-wider opacity-80">
            Simulated Operating Result
          </span>
          <p className="text-lg font-bold">
            {isFlipped
              ? "FLIP TRIGGERED: Posture switches to TIGHTEN / DEFENSIVE"
              : "POSTURE HOLDS: Current operational guidance remains valid"}
          </p>
        </div>

        <div className="flex items-center gap-6 font-mono text-fluid-sm">
          <div>
            <span className="block text-fluid-nano text-white/50 uppercase">Tightness</span>
            <span className="font-bold text-white">{simulatedTightness}/100</span>
          </div>
          <div>
            <span className="block text-fluid-nano text-white/50 uppercase">Boldness</span>
            <span className="font-bold text-white">{simulatedBoldness}/100</span>
          </div>
        </div>
      </div>
    </div>
  );
}
