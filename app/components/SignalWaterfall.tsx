"use client";

import { useState, useEffect, useRef } from "react";
import type { RegimeSignalIndicator } from "../../lib/report/homeBriefModel";
import { Sparkline } from "./ui/sparkline";
import { TrendGlyph, trendDirectionFromArrow, trendToneClass } from "./illustrations/TrendGlyph";

type SignalData = {
  baseRate?: number | null;
  baseRateUsed?: string;
  curveSlope?: number | null;
  macroContributors?: string[];
  tightnessThreshold?: number;
};

/** Which way counts as favourable per signal key. */
const INCREASE_IS_POSITIVE: Record<string, boolean> = {
  tightness: false,
  riskAppetite: true,
  baseRate: false,
  curveSlope: true,
};

/**
 * Per-signal movement row. The report model has been computing `trendArrow`,
 * `trendDeltaLabel` and a trailing `sparkline` for every signal all along;
 * nothing rendered them, so this panel showed four levels and no movement.
 */
function IndicatorRow({ indicator }: { indicator: RegimeSignalIndicator }) {
  // The model rounds `trendDeltaLabel` to one decimal, so a raw move of +0.04
  // arrives as "+0.0". Showing a rising glyph beside a zero reads as a
  // contradiction, so glyph and number are kept in agreement.
  const roundsToZero = /^[+-]?0\.0\b/.test(indicator.trendDeltaLabel);
  const direction = roundsToZero ? "flat" : trendDirectionFromArrow(indicator.trendArrow);
  const tone = trendToneClass(direction, INCREASE_IS_POSITIVE[indicator.key] ?? false);
  const points = indicator.sparkline.map((value, index, all) => {
    const back = all.length - 1 - index;
    return {
      label: back === 0 ? "this week" : `${back} ${back === 1 ? "week" : "weeks"} ago`,
      value,
    };
  });

  return (
    <div className="flex items-center justify-between gap-2 text-fluid-nano">
      <span className="text-white/60">{indicator.label}</span>
      <span className="flex items-center gap-1.5">
        {points.length >= 2 ? (
          <Sparkline
            points={points}
            label={indicator.label}
            tone={direction === "flat" ? "unchanged" : "caution"}
            widthEm={3}
            className={tone}
          />
        ) : null}
        <span className="tabular-nums text-white/70">{indicator.valueLabel}</span>
        <span className={`inline-flex items-center gap-0.5 ${tone}`}>
          <TrendGlyph direction={direction} className="h-3 w-3 shrink-0" />
          <span className="sr-only">{`${indicator.label} ${indicator.trendDeltaLabel}.`}</span>
        </span>
      </span>
    </div>
  );
}

export function SignalWaterfall({
  data,
  indicators,
  children,
}: {
  data: SignalData;
  indicators?: readonly RegimeSignalIndicator[];
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
      aria-haspopup="dialog"
      aria-expanded={show}
      className={`relative inline-block rounded-md select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 ${
        hasData ? "cursor-pointer border-b border-dashed border-white/25 transition-colors hover:border-white/50" : ""
      }`}
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

          {indicators && indicators.length > 0 ? (
            <div className="mb-2 space-y-1.5 border-b border-white/[0.06] pb-2">
              <p className="text-fluid-nano text-white/50">Movement vs last week</p>
              {indicators.map((indicator) => (
                <IndicatorRow key={indicator.key} indicator={indicator} />
              ))}
            </div>
          ) : null}

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
