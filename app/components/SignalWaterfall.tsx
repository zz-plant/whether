"use client";

import { useState, useEffect, useRef } from "react";

type SignalData = {
  baseRate?: number | null;
  baseRateUsed?: string;
  curveSlope?: number | null;
  macroContributors?: string[];
  tightnessThreshold?: number;
};

export function SignalWaterfall({
  data,
  children,
}: {
  data: SignalData;
  children: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasData = data.baseRate != null || data.curveSlope != null;

  useEffect(() => {
    if (!show) return;
    const clickAway = (event: MouseEvent) => {
      if (event.target instanceof Node && containerRef.current && !containerRef.current.contains(event.target)) {
        setShow(false);
      }
    };
    document.addEventListener("mousedown", clickAway);
    return () => document.removeEventListener("mousedown", clickAway);
  }, [show]);

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={hasData ? 0 : undefined}
      aria-haspopup="true"
      aria-expanded={show}
      className="relative inline-block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 rounded-md select-none"
      onClick={() => hasData && setShow((s) => !s)}
      onKeyDown={(e) => {
        if (!hasData) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setShow((s) => !s);
        } else if (e.key === "Escape") {
          e.preventDefault();
          setShow(false);
        }
      }}
    >
      {children}

      {show && hasData ? (
        <div className="absolute right-0 top-full mt-3 z-50 w-64 origin-top-right rounded-xl border border-white/[0.08] bg-[var(--bg-raised)] px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          <p className="text-fluid-nano font-semibold tracking-[0.04em] text-white/60 mb-2">Signal breakdown</p>
          <div className="space-y-2">
            {data.baseRate != null ? (
              <div>
                <div className="flex items-center justify-between text-fluid-nano">
                  <span className="text-white/60">Base rate</span>
                  <span className="tabular-nums text-white/70">{data.baseRate.toFixed(2)}%</span>
                </div>
                <div className="text-fluid-nano text-white/20">{data.baseRateUsed === "FED" ? "Fed funds" : data.baseRateUsed === "1M" ? "1-month T-bill" : data.baseRateUsed === "3M" ? "3-month T-bill" : "Missing"}</div>
              </div>
            ) : null}

            {data.curveSlope != null ? (
              <div className="flex items-center justify-between text-fluid-nano">
                <span className="text-white/60">Curve (10Y−2Y)</span>
                <span className="tabular-nums text-white/70">{data.curveSlope.toFixed(2)}</span>
              </div>
            ) : null}

            {data.tightnessThreshold != null ? (
              <div className="flex items-center justify-between text-fluid-nano">
                <span className="text-white/60">Tightness threshold</span>
                <span className="tabular-nums text-white/60">{data.tightnessThreshold}</span>
              </div>
            ) : null}

            {data.macroContributors?.length ? (
              <div className="pt-2 border-t border-white/[0.04]">
                <p className="text-fluid-nano text-white/50 mb-1">Active signals</p>
                {data.macroContributors.map((c, i) => (
                  <p key={i} className="text-fluid-nano text-amber-300/70">{c}</p>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
