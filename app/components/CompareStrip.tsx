"use client";

import { useEffect, useId, useState } from "react";
import { ChevronRight } from "lucide-react";
import { getTimeMachineRegimeSeries } from "../../lib/timeMachine/timeMachineCache";
import { REGIME_DISPLAY, REGIME_COLORS } from "../viewModel";
import { TrendGlyph, describeTrend, trendDirectionFromDelta, trendToneClass } from "./illustrations/TrendGlyph";

/**
 * One chip per metric, coloured by whether the move was favourable *for that
 * metric* rather than by its raw sign. These two chips sit side by side and
 * move in opposite directions for the same news — cash availability rising is
 * bad, risk appetite rising is good — so hard-coding "up is green" put two
 * contradictory colour rules next to each other with nothing explaining them.
 */
function DeltaChip({
  label,
  delta,
  increaseIsPositive,
  unit = "pts",
}: {
  label: string;
  delta: number | null | undefined;
  increaseIsPositive: boolean;
  unit?: string;
}) {
  const direction = trendDirectionFromDelta(delta);
  const notable = typeof delta === "number" && Math.abs(delta) >= 3;

  if (direction === "flat" || delta == null) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm bg-white/[0.04] px-2 py-0.5 text-white/60">
        <TrendGlyph direction="flat" className="h-3 w-3 shrink-0" />
        <span aria-hidden="true">{label}: unchanged</span>
        <span className="sr-only">{describeTrend({ label, delta: 0 })}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm bg-white/[0.04] px-2 py-0.5 ${trendToneClass(direction, increaseIsPositive)}`}
    >
      <TrendGlyph direction={direction} className="h-3 w-3 shrink-0" />
      <span aria-hidden="true">
        {label}: {delta > 0 ? "+" : "−"}
        {Math.abs(delta).toFixed(1)} {unit}
        {notable ? " · notable shift" : ""}
      </span>
      <span className="sr-only">
        {describeTrend({ label, delta, unit })}
        {notable ? " Notable shift." : ""}
      </span>
    </span>
  );
}

export function CompareStrip({
  currentRegime,
  currentTightness,
  tightnessDelta,
  riskAppetite,
  riskAppetiteDelta,
  serverPrevious,
  currentRecordDate,
  autoExpand = false,
}: {
  currentRegime: string;
  currentTightness: number;
  tightnessDelta?: number;
  riskAppetite?: number;
  riskAppetiteDelta?: number;
  serverPrevious?: { regime: string; recordDate: string } | null;
  currentRecordDate?: string;
  autoExpand?: boolean;
}) {
  const [isComparing, setIsComparing] = useState(autoExpand);
  const [previous, setPrevious] = useState<{ regime: string; recordDate: string } | null>(serverPrevious ?? null);
  const panelId = useId();

  useEffect(() => {
    try {
      const series = getTimeMachineRegimeSeries(12, undefined, currentRecordDate);
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
  }, [serverPrevious, currentRecordDate]);

  if (!previous) return null;

  // Reconstructed from the deltas so both columns can state a level.
  const previousTightness = tightnessDelta != null ? currentTightness - tightnessDelta : null;
  const previousRiskAppetite =
    typeof riskAppetite === "number" && typeof riskAppetiteDelta === "number"
      ? riskAppetite - riskAppetiteDelta
      : null;

  return (
    <div className="weather-section-border">
      {/* Reveals static content, so it's a disclosure like the evidence drawer —
          a switch here implied a persistent setting. */}
      <button
        type="button"
        aria-expanded={isComparing}
        aria-controls={panelId}
        onClick={() => setIsComparing((value) => !value)}
        className="inline-flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-lg px-1 pr-2 text-fluid-sm font-medium text-white/65 transition-colors hover:bg-white/[0.03] hover:text-white weather-focus-ring weather-press-scale"
      >
        <ChevronRight
          className={`size-4 shrink-0 transition-transform duration-200 ${isComparing ? "rotate-90 text-sky-400" : "text-white/40"}`}
          aria-hidden="true"
        />
        <span className={isComparing ? "text-sky-200" : undefined}>Compare to last week</span>
      </button>

      {isComparing ? (
        <div id={panelId} className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* Both columns carry the same rows. Previously only "Current" showed
              numbers, so the panel asked the reader to diff against a blank. */}
          <div className="space-y-1">
            <p className="text-fluid-nano text-white/40">Previous</p>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${REGIME_COLORS[previous.regime] ?? 'bg-slate-400/60'}`} />
                <span className="text-fluid-sm text-white/70 font-medium">{REGIME_DISPLAY[previous.regime] ?? previous.regime}</span>
              </span>
              {previousTightness !== null ? (
                <span className="text-fluid-nano text-white/50 font-mono">{previousTightness.toFixed(0)} pts</span>
              ) : null}
            </div>
            {typeof riskAppetite === "number" ? (
              <div className="flex items-center justify-between mt-1">
                <span className="text-fluid-sm text-white/70 font-medium">Risk appetite</span>
                <span className="text-fluid-nano text-white/50 font-mono">
                  {previousRiskAppetite !== null ? `${previousRiskAppetite.toFixed(0)}/100` : "—"}
                </span>
              </div>
            ) : null}
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
          {/* Cash availability rises when capital gets scarcer, so a rise is the
              unfavourable direction; risk appetite is the other way round. */}
          <DeltaChip label="Cash availability" delta={tightnessDelta} increaseIsPositive={false} />
          {typeof riskAppetite === "number" ? (
            <DeltaChip label="Risk appetite" delta={riskAppetiteDelta} increaseIsPositive />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
