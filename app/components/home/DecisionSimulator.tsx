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

      <div className="mt-3 flex items-center gap-3">
        <svg viewBox="0 0 60 60" className="h-16 w-16 flex-shrink-0 rounded-md border border-slate-800/60 bg-slate-950/30" aria-hidden="true">
          <line x1="30" y1="0" x2="30" y2="60" stroke="rgba(148,163,184,0.15)" strokeWidth="1" />
          <line x1="0" y1="30" x2="60" y2="30" stroke="rgba(148,163,184,0.15)" strokeWidth="1" />
          <circle cx={(currentTightness / 100) * 60} cy={60 - (currentRiskAppetite / 100) * 60} r="4" fill="rgba(148,163,184,0.6)" stroke="rgba(148,163,184,0.3)" strokeWidth="1" />
          {sim ? (
            <circle cx={(sliderTightness / 100) * 60} cy={60 - (currentRiskAppetite / 100) * 60} r="4" fill="rgba(56,189,248,0.8)" stroke="rgba(56,189,248,0.4)" strokeWidth="1" />
          ) : null}
          {sim ? (
            <line x1={(currentTightness / 100) * 60} y1={60 - (currentRiskAppetite / 100) * 60} x2={(sliderTightness / 100) * 60} y2={60 - (currentRiskAppetite / 100) * 60} stroke="rgba(56,189,248,0.25)" strokeWidth="1.5" strokeDasharray="3 2" />
          ) : null}
        </svg>
        <div className="text-fluid-micro text-slate-500 space-y-0.5">
          <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-400/60" />Current ({currentRegime})</div>
          {sim ? <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-400/80" />Simulated ({sim.regime})</div> : null}
        </div>
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
