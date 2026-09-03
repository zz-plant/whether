"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import {
  getTimeMachineRegimeSeries,
  type TimeMachineRegimeEntry,
} from "../../lib/timeMachine/timeMachineCache";
import { getRegimePublicLabel } from "../../lib/regimePresentation";
import { REGIME_COLORS } from "../viewModel";
import { REGIME_HEX_COLORS } from "../../lib/regimePhaseSpace";

export type ZoomPreset = "1Y" | "3Y" | "5Y" | "MAX";

const ZOOM_MONTH_COUNTS: Record<ZoomPreset, number> = {
  "1Y": 12,
  "3Y": 36,
  "5Y": 60,
  MAX: 180,
};

const ZOOM_ORDER: ZoomPreset[] = ["1Y", "3Y", "5Y", "MAX"];

export interface TimelineBarProps {
  currentMonth?: number;
  currentYear?: number;
  onSelect?: (target: { month: number; year: number }) => void;
  defaultZoom?: ZoomPreset;
  showZoomControls?: boolean;
  className?: string;
  variant?: "compact" | "detailed";
}

export function TimelineBar({
  currentMonth,
  currentYear,
  onSelect,
  defaultZoom = "3Y",
  showZoomControls = true,
  className = "",
  variant = "compact",
}: TimelineBarProps) {
  const [zoom, setZoom] = useState<ZoomPreset>(defaultZoom);
  const [allSeries, setAllSeries] = useState<TimeMachineRegimeEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const trackRef = useRef<HTMLDivElement>(null);

  // Load maximum available regime series once on client
  useEffect(() => {
    try {
      const fullSeries = getTimeMachineRegimeSeries(180);
      setAllSeries(fullSeries);
    } catch {
      // time machine cache empty or server fallback
    }
  }, []);

  const now = new Date();
  const activeMonth = currentMonth ?? now.getMonth() + 1;
  const activeYear = currentYear ?? now.getFullYear();

  // Slice series according to selected zoom window
  const visibleSeries = useMemo(() => {
    if (allSeries.length === 0) return [];
    const count = ZOOM_MONTH_COUNTS[zoom];
    if (zoom === "MAX" || count >= allSeries.length) {
      return allSeries;
    }
    return allSeries.slice(-count);
  }, [allSeries, zoom]);

  // Find index of current selection in visible series
  const activeIndex = useMemo(() => {
    if (visibleSeries.length === 0) return -1;
    const idx = visibleSeries.findIndex(
      (entry) => entry.month === activeMonth && entry.year === activeYear
    );
    // If not in current visible window, find in full series
    return idx;
  }, [visibleSeries, activeMonth, activeYear]);

  // Fallback index if active is out of visible bounds or latest is active
  const effectiveIndex =
    activeIndex >= 0 ? activeIndex : Math.max(visibleSeries.length - 1, 0);

  const isLive =
    allSeries.length > 0 &&
    effectiveIndex === visibleSeries.length - 1 &&
    (!currentMonth ||
      (currentMonth === allSeries[allSeries.length - 1]?.month &&
        currentYear === allSeries[allSeries.length - 1]?.year));

  const displayedIndex =
    dragIndex !== null
      ? dragIndex
      : hoverIndex !== null
        ? hoverIndex
        : effectiveIndex;

  const currentEntry = visibleSeries[displayedIndex] ?? visibleSeries[effectiveIndex];

  const handleSelectIndex = useCallback(
    (idx: number) => {
      const target = visibleSeries[idx];
      if (!target) return;
      onSelect?.({ month: target.month, year: target.year });
    },
    [visibleSeries, onSelect]
  );

  const getIndexFromClientX = useCallback(
    (clientX: number): number => {
      if (!trackRef.current || visibleSeries.length === 0) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const idx = Math.round(ratio * (visibleSeries.length - 1));
      return Math.max(0, Math.min(visibleSeries.length - 1, idx));
    },
    [visibleSeries]
  );

  // Pointer drag/scrub event handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDragging(true);
      const idx = getIndexFromClientX(e.clientX);
      setDragIndex(idx);
    },
    [getIndexFromClientX]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const idx = getIndexFromClientX(e.clientX);
      if (isDragging) {
        setDragIndex(idx);
      } else {
        setHoverIndex(idx);
      }
    },
    [isDragging, getIndexFromClientX]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isDragging) {
        setIsDragging(false);
        const idx = getIndexFromClientX(e.clientX);
        setDragIndex(null);
        handleSelectIndex(idx);
      }
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // pointer capture release fallback
      }
    },
    [isDragging, getIndexFromClientX, handleSelectIndex]
  );

  const handlePointerLeave = useCallback(() => {
    if (!isDragging) {
      setHoverIndex(null);
    }
  }, [isDragging]);

  // Step backward / forward
  const canGoPrevious = effectiveIndex > 0;
  const canGoNext = effectiveIndex < visibleSeries.length - 1;

  const goToPrevious = useCallback(() => {
    if (canGoPrevious) {
      handleSelectIndex(effectiveIndex - 1);
    }
  }, [canGoPrevious, effectiveIndex, handleSelectIndex]);

  const goToNext = useCallback(() => {
    if (canGoNext) {
      handleSelectIndex(effectiveIndex + 1);
    }
  }, [canGoNext, effectiveIndex, handleSelectIndex]);

  const goToLatest = useCallback(() => {
    if (allSeries.length > 0) {
      const latest = allSeries[allSeries.length - 1];
      onSelect?.({ month: latest.month, year: latest.year });
    }
  }, [allSeries, onSelect]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "Home") {
        e.preventDefault();
        handleSelectIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        handleSelectIndex(visibleSeries.length - 1);
      }
    },
    [goToPrevious, goToNext, handleSelectIndex, visibleSeries.length]
  );

  // Wheel zoom over track
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (Math.abs(e.deltaY) < 15) return;
      const currentIdx = ZOOM_ORDER.indexOf(zoom);
      if (e.deltaY < 0 && currentIdx > 0) {
        // Zoom in (fewer months)
        setZoom(ZOOM_ORDER[currentIdx - 1]);
      } else if (e.deltaY > 0 && currentIdx < ZOOM_ORDER.length - 1) {
        // Zoom out (more months)
        setZoom(ZOOM_ORDER[currentIdx + 1]);
      }
    },
    [zoom]
  );

  // Derive unique year labels and positions for timeline axis
  const yearTicks = useMemo(() => {
    if (visibleSeries.length === 0) return [];
    const ticks: { year: number; positionPercent: number }[] = [];
    let lastYear = -1;

    visibleSeries.forEach((entry, i) => {
      if (entry.year !== lastYear) {
        ticks.push({
          year: entry.year,
          positionPercent: (i / (visibleSeries.length - 1 || 1)) * 100,
        });
        lastYear = entry.year;
      }
    });

    return ticks;
  }, [visibleSeries]);

  if (visibleSeries.length === 0) {
    return null;
  }

  const handlePercent = (effectiveIndex / (visibleSeries.length - 1 || 1)) * 100;
  const previewPercent = (displayedIndex / (visibleSeries.length - 1 || 1)) * 100;

  const monthLabel = currentEntry
    ? new Date(currentEntry.year, currentEntry.month - 1).toLocaleString("en", {
        month: "short",
      })
    : "";
  const periodLabel = currentEntry
    ? `${monthLabel} ${currentEntry.year}`
    : "Timeline";
  const regimePublicLabel = currentEntry
    ? getRegimePublicLabel(currentEntry.regime)
    : "";

  return (
    <section
      className={`timeline-bar-root flex flex-col gap-2 select-none ${className}`}
      aria-label="Timeline navigation scrubber"
    >
      {/* Top Header Row: Step buttons, Active Readout, Zoom Presets, Jump to Live */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={goToPrevious}
            disabled={!canGoPrevious}
            aria-label="Previous month"
            className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white disabled:pointer-events-none disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
          >
            <ChevronLeft className="size-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={goToNext}
            disabled={!canGoNext}
            aria-label="Next month"
            className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white disabled:pointer-events-none disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
          >
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </button>

          {/* Current Period Badge */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-fluid-micro">
            <span
              className={`size-2 rounded-full ${REGIME_COLORS[currentEntry?.regime] ?? "bg-slate-400"}`}
              style={{ backgroundColor: REGIME_HEX_COLORS[currentEntry?.regime] }}
            />
            <span className="font-semibold text-slate-100 tabular-nums">
              {periodLabel}
            </span>
            <span className="text-slate-400 font-normal">· {regimePublicLabel}</span>
            {isLive ? (
              <span className="ml-1 rounded px-1 py-0.2 bg-emerald-500/20 text-emerald-300 font-mono text-[10px] uppercase tracking-wider">
                Live
              </span>
            ) : null}
          </div>

          {!isLive ? (
            <button
              type="button"
              onClick={goToLatest}
              className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-fluid-micro font-medium text-sky-300 transition-colors hover:bg-sky-500/20"
            >
              Jump to live
            </button>
          ) : null}
        </div>

        {/* Zoom Controls */}
        {showZoomControls ? (
          <div className="flex items-center gap-1 bg-slate-950/70 border border-white/10 p-0.5 rounded-lg text-fluid-micro">
            <span className="px-1.5 text-slate-500 flex items-center gap-0.5">
              <ZoomIn className="size-3 text-slate-400" />
              Zoom:
            </span>
            {ZOOM_ORDER.map((preset) => {
              const isActive = zoom === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setZoom(preset)}
                  className={`px-2 py-0.5 rounded-md font-mono transition-all ${
                    isActive
                      ? "bg-sky-500/25 text-sky-200 font-semibold border border-sky-400/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                  }`}
                  aria-pressed={isActive}
                >
                  {preset}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Interactive Continuous Track */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="slider"
        aria-label="Select month"
        aria-valuemin={0}
        aria-valuemax={visibleSeries.length - 1}
        aria-valuenow={effectiveIndex}
        aria-valuetext={`${periodLabel}, ${regimePublicLabel}`}
        className="relative group cursor-pointer h-7 w-full rounded-md border border-slate-700/60 bg-slate-950/80 p-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 touch-none"
      >
        {/* Continuous Regime Color Strip Segments */}
        <div className="relative flex h-full w-full overflow-hidden rounded-[4px]">
          {visibleSeries.map((entry, idx) => {
            const isEntryHovered = displayedIndex === idx;
            const isEntryActive = effectiveIndex === idx;
            const hexColor = REGIME_HEX_COLORS[entry.regime] ?? "#64748b";

            return (
              <div
                key={`${entry.year}-${entry.month}`}
                style={{
                  width: `${100 / visibleSeries.length}%`,
                  backgroundColor: hexColor,
                  // History recedes so the present asserts. At 0.65 idle against
                  // 1.0 active the selected month was indistinguishable from the
                  // other 40-odd, and a full-chroma band of rose/amber/emerald/sky
                  // out-weighed the headline it sits directly above.
                  opacity: isEntryActive ? 1 : isEntryHovered ? 0.85 : 0.45,
                }}
                className="h-full transition-opacity duration-150 relative border-r border-slate-950/20 last:border-r-0"
              />
            );
          })}
        </div>

        {/* Hover / Preview Indicator Ghost */}
        {(isDragging || hoverIndex !== null) && (
          <div
            className="absolute top-0 bottom-0 pointer-events-none w-0.5 bg-white/70 shadow-[0_0_8px_rgba(255,255,255,0.8)] z-10 transition-transform duration-75"
            style={{
              left: `${previewPercent}%`,
              transform: "translateX(-50%)",
            }}
          />
        )}

        {/* Active Selection Handle */}
        <div
          className="absolute top-1/2 pointer-events-none z-20 transition-transform duration-100"
          style={{
            left: `${handlePercent}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="h-6 w-3 rounded-[3px] border-2 border-white bg-slate-950 shadow-[0_0_10px_rgba(0,0,0,0.8)] flex items-center justify-center">
            <div className="h-3 w-0.5 bg-white/80 rounded-full" />
          </div>
        </div>

        {/* Tooltip on Drag / Hover */}
        {(isDragging || hoverIndex !== null) && currentEntry ? (
          <div
            className="absolute -top-11 pointer-events-none z-30 transform -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-900/95 px-2 py-1 shadow-xl text-fluid-micro backdrop-blur-sm"
            style={{
              left: `${previewPercent}%`,
            }}
          >
            <div className="flex items-center gap-1.5 font-medium text-slate-100">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: REGIME_HEX_COLORS[currentEntry.regime] }}
              />
              <span>{periodLabel}</span>
              <span className="text-slate-400">· {regimePublicLabel}</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Axis Year Ticks */}
      <div className="relative h-3.5 w-full text-fluid-nano font-mono text-slate-400" aria-hidden="true">
        {yearTicks.map((tick) => (
          <div
            key={tick.year}
            className="absolute transform -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${tick.positionPercent}%` }}
          >
            <div className="h-1 w-px bg-slate-700 mb-0.5" />
            <span>{tick.year}</span>
          </div>
        ))}
      </div>

      {/* The band is the most visually dominant element above the brief and was
          the least explained: four colours encoding regime, with only the
          currently selected one named, in the chip above. Without this a reader
          can see that something changed in 2024 without being able to say what
          it changed to. Public labels, so the legend matches the word the rest
          of the page uses for the same state. */}
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-fluid-nano text-slate-400">
        {Object.entries(REGIME_HEX_COLORS).map(([regime, hex]) => (
          <li key={regime} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: hex }}
            />
            {getRegimePublicLabel(regime)}
          </li>
        ))}
      </ul>

      {/* Detailed Variant Info (Optional) */}
      {variant === "detailed" && currentEntry ? (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-fluid-micro text-slate-400">
          <span>
            Tightness: <strong className="text-slate-200">{currentEntry.tightness.toFixed(0)} pts</strong>
          </span>
          <span>
            Risk Appetite: <strong className="text-slate-200">{currentEntry.riskAppetite.toFixed(0)}/100</strong>
          </span>
          <span className="text-slate-500 font-mono">
            {currentEntry.recordDate}
          </span>
        </div>
      ) : null}
    </section>
  );
}
