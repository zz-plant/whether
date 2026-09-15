"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { scrollRowToItem } from "./scrollRowToItem";
import {
  getTimeMachineRegimeSeries,
  type TimeMachineRegimeEntry,
} from "../../lib/timeMachine/timeMachineCache";
import {
  buildYearTicks,
  findSeriesIndex,
  findYearEntryIndex,
  FINE_SCRUB_SCALE,
  indexFromRatio,
  nextZoom,
  ratioForIndex,
  resolveTimelineWindow,
  shouldUseYearRail,
  stepIndex,
  windowContainsIndex,
  windowFromStart,
  TIMELINE_PAGE_MONTHS,
  ZOOM_ORDER,
  type ZoomPreset,
} from "../../lib/timeMachine/timelineWindow";
import { getRegimePublicLabel } from "../../lib/regimePresentation";
import { formatMonthShortUtc } from "../../lib/formatters";
import { REGIME_COLORS } from "../viewModel";
import { REGIME_HEX_COLORS } from "../../lib/regimePhaseSpace";

export type { ZoomPreset };

/** History recedes so the present asserts. At 0.65 idle against 1.0 active the
 *  selected month was indistinguishable from the other 40-odd, and a full-chroma
 *  band of rose/amber/emerald/sky out-weighed the headline it sits above. The
 *  legend swatches below use the same value, so they match the thing they name. */
const IDLE_SEGMENT_OPACITY = 0.45;
const PREVIEW_SEGMENT_OPACITY = 0.85;

/** Arrow keys held down fire faster than a route can render. Echo every press
 *  on the handle immediately, but let the presses settle before spending a
 *  round-trip, so hold-to-repeat costs one navigation rather than twenty. */
const KEY_COMMIT_COALESCE_MS = 140;

export interface TimelineBarProps {
  currentMonth?: number;
  currentYear?: number;
  onSelect?: (target: { month: number; year: number }) => void;
  defaultZoom?: ZoomPreset;
  showZoomControls?: boolean;
  className?: string;
  variant?: "compact" | "detailed";
}

const loadRegimeSeries = (): TimeMachineRegimeEntry[] => {
  try {
    return getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER);
  } catch {
    // time machine cache empty or unreadable
    return [];
  }
};

const tickHaptic = (pointerType: string) => {
  if (pointerType !== "touch") return;
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  navigator.vibrate(1);
};

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
  const [isDragging, setIsDragging] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  // null means "centre on the selection". A number holds the window where the
  // reader put it, so a commit or a pan does not slide the band sideways.
  const [windowStart, setWindowStart] = useState<number | null>(null);
  // 0 until measured, which is also what the server renders with, so the first
  // client render matches the markup it is hydrating.
  const [trackWidth, setTrackWidth] = useState(0);
  const [isPending, startTransition] = useTransition();

  const trackRef = useRef<HTMLDivElement>(null);
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fineAnchorRef = useRef<{ clientX: number; index: number } | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const yearRailRef = useRef<HTMLDivElement>(null);

  // The record is bundled JSON, so it is available during the first render on
  // both sides. Loading it in an effect instead made the bar pop in after
  // hydration, above the fold, on the page it sits at the top of.
  const series = useMemo(() => loadRegimeSeries(), []);
  const seriesLength = series.length;
  const liveIndex = seriesLength - 1;

  // "Live" is the newest month on record, not the wall clock. Reading it from
  // `new Date()` resolved to no index at all for every month between the last
  // snapshot and today, and could differ between the server and client renders.
  const selectedIndex = useMemo(() => {
    const requested = findSeriesIndex(series, currentMonth, currentYear);
    return requested >= 0 ? requested : Math.max(liveIndex, 0);
  }, [series, currentMonth, currentYear, liveIndex]);

  // The URL is the source of truth; this local echo only keeps the handle under
  // the pointer while the server renders the month. Clearing it when the new
  // selection arrives is what stops the handle snapping back on release.
  useEffect(() => {
    setPendingIndex(null);
  }, [currentMonth, currentYear]);

  useEffect(
    () => () => {
      if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    },
    []
  );

  const handleIndex = dragIndex ?? pendingIndex ?? selectedIndex;
  // The window is anchored on what is committed or in flight, never on the live
  // drag, so content does not slide out from under the pointer mid-gesture.
  const anchorIndex = pendingIndex ?? selectedIndex;
  const previewIndex = dragIndex ?? hoverIndex;

  // Derived, not stored: a held window that no longer contains the selection
  // silently gives way to the centred one, so an external selection change (a
  // month button, a link, the back button) can never strand the handle at an
  // edge showing a position it does not hold.
  const viewWindow = useMemo(() => {
    const centred = resolveTimelineWindow(seriesLength, anchorIndex, zoom);
    if (windowStart === null) return centred;
    const held = windowFromStart(seriesLength, windowStart, zoom);
    return windowContainsIndex(held, anchorIndex) ? held : centred;
  }, [seriesLength, anchorIndex, zoom, windowStart]);

  const visibleSeries = useMemo(
    () => series.slice(viewWindow.start, viewWindow.end),
    [series, viewWindow.start, viewWindow.end]
  );

  const commit = useCallback(
    (
      index: number,
      options?: { coalesce?: boolean; recentre?: boolean }
    ) => {
      const target = series[index];
      if (!target) return;

      setPendingIndex(index);
      // Hold the strip still when the new selection is already in view; recentre
      // only when it lands on an edge and there is nothing to see beyond it, or
      // when the caller is deliberately moving the view somewhere else.
      setWindowStart(
        !options?.recentre &&
          index > viewWindow.start &&
          index < viewWindow.end - 1
          ? viewWindow.start
          : null
      );
      if (commitTimerRef.current) {
        clearTimeout(commitTimerRef.current);
        commitTimerRef.current = null;
      }

      const send = () => {
        startTransition(() => {
          onSelect?.({ month: target.month, year: target.year });
        });
      };

      if (!options?.coalesce) {
        send();
        return;
      }

      commitTimerRef.current = setTimeout(() => {
        commitTimerRef.current = null;
        send();
      }, KEY_COMMIT_COALESCE_MS);
    },
    [series, onSelect, viewWindow]
  );

  const indexFromPointer = useCallback(
    (clientX: number, shiftKey: boolean, base: number): number => {
      const node = trackRef.current;
      if (!node || viewWindow.length === 0) return base;
      const rect = node.getBoundingClientRect();

      if (shiftKey) {
        const anchor = fineAnchorRef.current ?? { clientX, index: base };
        fineAnchorRef.current = anchor;
        const pxPerMonth = rect.width / Math.max(1, viewWindow.length - 1);
        const delta = Math.round(
          ((clientX - anchor.clientX) * FINE_SCRUB_SCALE) / pxPerMonth
        );
        return Math.max(
          viewWindow.start,
          Math.min(viewWindow.end - 1, anchor.index + delta)
        );
      }

      fineAnchorRef.current = null;
      return indexFromRatio(viewWindow, (clientX - rect.left) / rect.width);
    },
    [viewWindow]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
      fineAnchorRef.current = null;
      const index = indexFromPointer(event.clientX, event.shiftKey, handleIndex);
      setDragIndex(index);
      lastTickRef.current = index;
    },
    [indexFromPointer, handleIndex]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const index = indexFromPointer(
        event.clientX,
        event.shiftKey,
        dragIndex ?? handleIndex
      );
      if (!isDragging) {
        setHoverIndex(index);
        return;
      }
      setDragIndex(index);
      if (lastTickRef.current !== index) {
        lastTickRef.current = index;
        tickHaptic(event.pointerType);
      }
    },
    [indexFromPointer, isDragging, dragIndex, handleIndex]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (isDragging) {
        const index = indexFromPointer(
          event.clientX,
          event.shiftKey,
          dragIndex ?? handleIndex
        );
        setIsDragging(false);
        // `commit` sets the pending echo before the drag index clears, so the
        // handle stays exactly where it was released.
        commit(index);
        setDragIndex(null);
        fineAnchorRef.current = null;
      }
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // pointer capture release fallback
      }
    },
    [isDragging, indexFromPointer, dragIndex, handleIndex, commit]
  );

  const handlePointerLeave = useCallback(() => {
    if (!isDragging) {
      setHoverIndex(null);
    }
  }, [isDragging]);

  const canGoPrevious = handleIndex > 0;
  const canGoNext = handleIndex < liveIndex;

  const goToPrevious = useCallback(() => {
    if (canGoPrevious) commit(stepIndex(seriesLength, handleIndex, -1));
  }, [canGoPrevious, commit, seriesLength, handleIndex]);

  const goToNext = useCallback(() => {
    if (canGoNext) commit(stepIndex(seriesLength, handleIndex, 1));
  }, [canGoNext, commit, seriesLength, handleIndex]);

  const goToLatest = useCallback(() => {
    if (liveIndex >= 0) commit(liveIndex);
  }, [commit, liveIndex]);

  // Steps are over the record, not the visible window: before this, one arrow
  // press from a zoomed-out 2015 stepped back from the *last visible* month and
  // landed in 2026.
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const step = (delta: number) => {
        event.preventDefault();
        commit(stepIndex(seriesLength, handleIndex, delta), { coalesce: true });
      };

      if (event.key === "ArrowLeft") step(-1);
      else if (event.key === "ArrowRight") step(1);
      else if (event.key === "PageDown") step(-TIMELINE_PAGE_MONTHS);
      else if (event.key === "PageUp") step(TIMELINE_PAGE_MONTHS);
      else if (event.key === "Home") {
        event.preventDefault();
        commit(0);
      } else if (event.key === "End") {
        event.preventDefault();
        commit(liveIndex);
      }
    },
    [commit, seriesLength, handleIndex, liveIndex]
  );

  useEffect(() => {
    const node = trackRef.current;
    if (!node) return;

    const measure = () => setTrackWidth(node.getBoundingClientRect().width);
    measure();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const rail = yearRailRef.current;
    const active = rail?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!rail || !active) return;
    // The rail scrolls, never the page the brief is on (scrollRowToItem.ts).
    scrollRowToItem(rail, active);
  }, [handleIndex, trackWidth]);

  // Wheel is a native non-passive listener because React attaches its own at the
  // root as passive, where preventDefault does nothing. Zoom now needs an
  // explicit modifier — a trackpad pinch arrives as ctrl+wheel, so pinch-to-zoom
  // works, while an ordinary scroll past the bar no longer rewrites the window
  // under a reader who was only trying to reach the brief below it.
  useEffect(() => {
    const node = trackRef.current;
    if (!node) return;

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        setZoom((current) => nextZoom(current, event.deltaY < 0 ? "in" : "out"));
        setWindowStart(null);
        return;
      }
      if (
        Math.abs(event.deltaX) > Math.abs(event.deltaY) &&
        Math.abs(event.deltaX) > 2
      ) {
        event.preventDefault();
        setWindowStart(
          windowFromStart(
            seriesLength,
            viewWindow.start + (event.deltaX > 0 ? 1 : -1),
            zoom
          ).start
        );
      }
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [seriesLength, zoom, viewWindow]);

  const yearTicks = useMemo(
    () =>
      buildYearTicks(
        series,
        viewWindow,
        trackWidth,
        series[handleIndex]?.year
      ),
    [series, viewWindow, trackWidth, handleIndex]
  );

  /** Picking a year is the coarse move the track cannot be: at MAX zoom a month
   *  is under 6px on a desktop and under 2px on a phone, so aiming at 2021 by
   *  dragging was guesswork. Landing narrows to that year, which is the view
   *  the reader asked for. */
  const goToYear = useCallback(
    (year: number) => {
      const index = findYearEntryIndex(
        series,
        year,
        series[handleIndex]?.month
      );
      if (index < 0) return;
      setZoom("1Y");
      commit(index, { recentre: true });
    },
    [series, handleIndex, commit]
  );

  if (seriesLength === 0 || visibleSeries.length === 0) {
    return null;
  }

  const describe = (index: number) => {
    const entry = series[index];
    if (!entry) return { entry: null, period: "Timeline", regime: "" };
    return {
      entry,
      period: `${formatMonthShortUtc(entry.month)} ${entry.year}`,
      regime: getRegimePublicLabel(entry.regime),
    };
  };

  const useYearRail = shouldUseYearRail(yearTicks.length, trackWidth);
  const selected = describe(handleIndex);
  const preview = previewIndex === null ? null : describe(previewIndex);
  const isLive = handleIndex === liveIndex;

  const handlePercent = ratioForIndex(viewWindow, handleIndex) * 100;
  const previewPercent =
    previewIndex === null ? 0 : ratioForIndex(viewWindow, previewIndex) * 100;

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

          {/* Current Period Badge. This answers "where am I", so it tracks the
              selection and any commit in flight — never the hover, which is a
              question about where you *would* land and belongs in the tooltip. */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-fluid-micro">
            <span
              className={`size-2 rounded-full ${
                selected.entry ? REGIME_COLORS[selected.entry.regime] : "bg-slate-400"
              }`}
              style={{
                backgroundColor: selected.entry
                  ? REGIME_HEX_COLORS[selected.entry.regime]
                  : undefined,
              }}
            />
            <span className="font-semibold text-slate-100 tabular-nums">
              {selected.period}
            </span>
            <span className="text-slate-400 font-normal">· {selected.regime}</span>
            {isLive ? (
              <span
                className="ml-1 rounded px-1 py-0.2 bg-emerald-500/20 text-emerald-300 font-mono text-[10px] uppercase tracking-wider"
                title="Newest month on record. The weekly call above is more recent."
              >
                Latest
              </span>
            ) : null}
            {isPending ? (
              <span className="ml-1 text-slate-500 font-mono text-[10px] uppercase tracking-wider">
                Loading
              </span>
            ) : null}
          </div>

          {!isLive ? (
            <button
              type="button"
              onClick={goToLatest}
              className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-fluid-micro font-medium text-sky-300 transition-colors hover:bg-sky-500/20"
            >
              Jump to latest
            </button>
          ) : null}
        </div>

        {/* Zoom Controls. The presets are the discoverable control; the gesture is the
            fast one. The wheel handler deliberately requires ctrl/meta so ordinary
            scrolling past the bar does not rewrite the window (see the handler above),
            which also means nothing on screen said the gesture existed — hence the title
            on the group, where a reader already hovers when looking for zoom. */}
        {showZoomControls ? (
          <div
            className="flex items-center gap-1 bg-slate-950/70 border border-white/10 p-0.5 rounded-lg text-fluid-micro"
            title="Pinch, or hold ⌘/Ctrl and scroll, to zoom. Scroll sideways to pan."
          >
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
                  onClick={() => {
                    setZoom(preset);
                    setWindowStart(null);
                  }}
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
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="slider"
        aria-label="Select month"
        aria-valuemin={0}
        aria-valuemax={liveIndex}
        aria-valuenow={handleIndex}
        aria-valuetext={`${selected.period}, ${selected.regime}`}
        aria-busy={isPending}
        className="relative group cursor-pointer h-9 w-full rounded-md border border-slate-700/60 bg-slate-950/80 p-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 touch-none"
      >
        {/* Continuous Regime Color Strip Segments */}
        <div className="relative flex h-full w-full overflow-hidden rounded-[4px]">
          {visibleSeries.map((entry, offset) => {
            const absoluteIndex = viewWindow.start + offset;
            const isEntryPreviewed = previewIndex === absoluteIndex;
            const isEntryActive = handleIndex === absoluteIndex;
            const hexColor = REGIME_HEX_COLORS[entry.regime] ?? "#64748b";

            return (
              <div
                key={`${entry.year}-${entry.month}`}
                style={{
                  width: `${100 / visibleSeries.length}%`,
                  backgroundColor: hexColor,
                  opacity: isEntryActive
                    ? 1
                    : isEntryPreviewed
                      ? PREVIEW_SEGMENT_OPACITY
                      : IDLE_SEGMENT_OPACITY,
                }}
                className="h-full transition-opacity duration-150 relative border-r border-slate-950/20 last:border-r-0"
              />
            );
          })}
        </div>

        {/* Hover / Preview Indicator Ghost */}
        {previewIndex !== null ? (
          <div
            className="absolute top-0 bottom-0 pointer-events-none w-0.5 bg-white/70 shadow-[0_0_8px_rgba(255,255,255,0.8)] z-10 transition-transform duration-75"
            style={{
              left: `${previewPercent}%`,
              transform: "translateX(-50%)",
            }}
          />
        ) : null}

        {/* Active Selection Handle. Driven by the drag and by any commit still in
            flight, so the one element that looks grabbable is the one that
            actually follows the pointer. */}
        <div
          className={`absolute top-1/2 pointer-events-none z-20 ${isDragging ? "" : "transition-[left] duration-100"}`}
          style={{
            left: `${handlePercent}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className={`h-8 w-3 rounded-[3px] border-2 bg-slate-950 shadow-[0_0_10px_rgba(0,0,0,0.8)] flex items-center justify-center ${
              isPending ? "border-sky-300 animate-pulse" : "border-white"
            }`}
          >
            <div className="h-3 w-0.5 bg-white/80 rounded-full" />
          </div>
        </div>

        {/* Tooltip on Drag / Hover — the "where would I land" readout. */}
        {preview?.entry ? (
          <div
            className="absolute -top-14 pointer-events-none z-30 transform -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-900/95 px-2 py-1 shadow-xl text-fluid-micro backdrop-blur-sm"
            style={{
              left: `${previewPercent}%`,
            }}
          >
            <div className="flex items-center gap-1.5 font-medium text-slate-100">
              <span
                className="size-2 rounded-full"
                style={{
                  backgroundColor: REGIME_HEX_COLORS[preview.entry.regime],
                }}
              />
              <span>{preview.period}</span>
              <span className="text-slate-400">· {preview.regime}</span>
            </div>
            {/* The record is already on the client, so the trajectory can be read
                without spending a navigation on every month you are curious about. */}
            <div className="flex items-center gap-2 pt-0.5 text-fluid-nano text-slate-400 tabular-nums">
              <span>Funding pressure {preview.entry.tightness.toFixed(0)}</span>
              <span>Risk {preview.entry.riskAppetite.toFixed(0)}</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* The year axis, which used to be aria-hidden decoration. It is the only
          coarse control on this component: at MAX zoom the track is under 6px
          per month on a desktop and under 2px on a phone, so "show me 2021" was
          a drag nobody could aim. Where the years have room it stays positional,
          so it still maps to the band above it; where they do not, a positional
          axis cannot give every year a reachable target at any label length, so
          the same years are offered as a scrollable list. */}
      {useYearRail ? (
        <div
          ref={yearRailRef}
          role="group"
          aria-label="Jump to a year"
          className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 text-fluid-nano font-mono text-slate-400 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {yearTicks.map((tick) => {
            const isCurrentYear = tick.year === selected.entry?.year;
            return (
              <button
                key={tick.year}
                type="button"
                onClick={() => goToYear(tick.year)}
                aria-label={`Jump to ${tick.year}`}
                aria-current={isCurrentYear ? "true" : undefined}
                className={`min-h-[44px] min-w-[44px] shrink-0 rounded-md border px-2 tabular-nums transition-colors ${
                  isCurrentYear
                    ? "border-sky-400/50 bg-sky-500/20 text-sky-100"
                    : "border-slate-800/60 hover:bg-slate-800/50 hover:text-slate-100"
                } focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400`}
              >
                {tick.year}
              </button>
            );
          })}
        </div>
      ) : (
        <div
          className="relative h-6 w-full text-fluid-nano font-mono text-slate-400"
          role="group"
          aria-label="Jump to a year"
        >
          {yearTicks.map((tick) =>
            tick.labelled ? (
              <button
                key={tick.year}
                type="button"
                onClick={() => goToYear(tick.year)}
                aria-label={`Jump to ${tick.year}`}
                aria-current={
                  tick.year === selected.entry?.year ? "true" : undefined
                }
                className={`absolute top-0 flex -translate-x-1/2 flex-col items-center rounded px-1.5 py-0.5 transition-colors hover:bg-white/[0.08] hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${
                  tick.year === selected.entry?.year ? "text-slate-100" : ""
                }`}
                style={{ left: `${tick.positionPercent}%` }}
              >
                <span className="mb-0.5 h-1 w-px bg-slate-600" aria-hidden="true" />
                <span className="tabular-nums">{tick.year}</span>
              </button>
            ) : (
              <span
                key={tick.year}
                aria-hidden="true"
                className="absolute top-0 h-1 w-px -translate-x-1/2 bg-slate-700"
                style={{ left: `${tick.positionPercent}%` }}
              />
            )
          )}
        </div>
      )}

      {/* The band is the most visually dominant element above the brief and was
          the least explained: four colours encoding regime, with only the
          currently selected one named, in the chip above. Without this a reader
          can see that something changed in 2024 without being able to say what
          it changed to. Public labels, so the legend matches the word the rest
          of the page uses for the same state; idle opacity, so the swatch
          matches the colour it is naming rather than a brighter version of it. */}
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-fluid-nano text-slate-400">
        {Object.entries(REGIME_HEX_COLORS).map(([regime, hex]) => (
          <li key={regime} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: hex, opacity: IDLE_SEGMENT_OPACITY }}
            />
            {getRegimePublicLabel(regime)}
          </li>
        ))}
      </ul>

      {/* Detailed Variant Info (Optional) */}
      {variant === "detailed" && selected.entry ? (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-fluid-micro text-slate-400">
          <span>
            Funding pressure: <strong className="text-slate-200">{selected.entry.tightness.toFixed(0)} pts</strong>
          </span>
          <span>
            Risk Appetite: <strong className="text-slate-200">{selected.entry.riskAppetite.toFixed(0)}/100</strong>
          </span>
          <span className="text-slate-500 font-mono">
            {selected.entry.recordDate}
          </span>
        </div>
      ) : null}
    </section>
  );
}
