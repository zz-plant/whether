"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SimResult = {
  regime: string;
  call: string;
  action: string;
};

export function DecisionSimulator({
  currentTightness,
  currentRiskAppetite,
  currentRegime,
}: {
  currentTightness: number;
  currentRiskAppetite: number;
  currentRegime: string;
}) {
  const [sliderTightness, setSliderTightness] = useState(currentTightness);
  const [sim, setSim] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchSim = useCallback(async (t: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/simulate?tightness=${Math.round(t)}&riskAppetite=${Math.round(currentRiskAppetite)}`,
      );
      if (res.ok) {
        const data: SimResult = await res.json();
        setSim(data);
      }
    } catch { /* keep last result on network error */ }
    setLoading(false);
  }, [currentRiskAppetite]);

  useEffect(() => { fetchSim(sliderTightness); }, [fetchSim, sliderTightness]);

  const handleChange = (value: number) => {
    setSliderTightness(value);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetchSim(value), 150);
  };

  const isDifferent = sim ? sim.regime !== currentRegime : false;
  const delta = sliderTightness - currentTightness;
  const deltaLabel = delta > 0 ? `+${delta.toFixed(0)} pts tighter` : delta < 0 ? `${delta.toFixed(0)} pts looser` : "Current";

  return (
    <div className="max-w-xl mx-auto rounded-lg border border-sky-400/20 bg-slate-950/40 px-5 py-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-fluid-xs font-semibold uppercase tracking-[0.1em] text-slate-400">What-if simulator</p>
        <span className="text-fluid-micro text-slate-600">Simplified model — not financial advice</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 w-8 text-right">{sliderTightness}</span>
        <input
          type="range"
          min={20}
          max={85}
          value={sliderTightness}
          onChange={(e) => setSliderTightness(Number(e.target.value))}
          className="flex-1 h-2 rounded-full appearance-none bg-slate-800 cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-400 [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(56,189,248,0.4)]"
          aria-label="Simulate tightness"
        />
        <span className="text-xs text-slate-500 w-20 text-left">{deltaLabel}</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div className={`rounded-md px-3 py-2 ${isDifferent ? "bg-sky-500/10 border border-sky-400/20" : "bg-slate-950/30"}`}>
          <p className="text-slate-500 uppercase tracking-[0.08em]">Regime</p>
          <p className="mt-0.5 font-semibold text-slate-100">{sim?.regime ?? "—"}</p>
        </div>
        <div className="rounded-md bg-slate-950/30 px-3 py-2">
          <p className="text-slate-500 uppercase tracking-[0.08em]">Call</p>
          <p className="mt-0.5 font-semibold text-slate-100">{sim?.call ?? "—"}</p>
        </div>
        <div className="rounded-md bg-slate-950/30 px-3 py-2">
          <p className="text-slate-500 uppercase tracking-[0.08em]">Action</p>
          <p className="mt-0.5 text-slate-300 leading-snug">{sim?.action ?? "—"}</p>
        </div>
      </div>

      <div className="mt-3 flex justify-between text-[0.6rem] text-slate-600 px-1">
        <span>Loose</span>
        <span className={`${currentTightness >= 65 ? "text-amber-400" : "text-slate-600"}`}>Defensive ↑65</span>
        <span className={`${currentTightness >= 75 ? "text-rose-400" : "text-slate-600"}`}>Scarcity ↑75</span>
        <span>Tight</span>
      </div>
    </div>
  );
}
