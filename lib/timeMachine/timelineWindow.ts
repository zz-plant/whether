/**
 * Window and index arithmetic for the timeline scrubber.
 *
 * This lives outside the component because the two defects it exists to prevent
 * were pure index math trapped inside pointer handlers, where nothing could
 * reach them: a window pinned to the end of the record scrolled any historical
 * selection out of view (and the component then reported the last *visible*
 * month as the selected one), and stepping walked the visible window rather
 * than the record, so one arrow press from a zoomed-out 2015 landed in 2026.
 *
 * Everything here speaks in ABSOLUTE indices into the full series. The window
 * is a view onto that series and never a coordinate system of its own; that is
 * the invariant that keeps a zoom change from redefining what "index 3" means.
 */

export type ZoomPreset = "1Y" | "3Y" | "5Y" | "MAX";

export const ZOOM_ORDER: ZoomPreset[] = ["1Y", "3Y", "5Y", "MAX"];

/** MAX is "the whole record", whatever length that happens to be, rather than
 *  the 180 it used to hard-code — a number that silently became a window rather
 *  than the maximum the day the record passed 180 months. */
export const ZOOM_MONTH_COUNTS: Record<ZoomPreset, number> = {
  "1Y": 12,
  "3Y": 36,
  "5Y": 60,
  MAX: Number.POSITIVE_INFINITY,
};

/** Months moved per PageUp/PageDown, and per keyboard-repeat coalescing batch. */
export const TIMELINE_PAGE_MONTHS = 12;

/** Shift-drag trades travel for resolution. At MAX zoom a month is ~6px on a
 *  desktop track and ~2px on a phone, which is below pointer precision; a
 *  quarter-speed mode is what makes those months individually reachable. */
export const FINE_SCRUB_SCALE = 0.25;

export interface TimelineWindow {
  /** First absolute index in view. */
  start: number;
  /** One past the last absolute index in view. */
  end: number;
  length: number;
}

export const clampIndex = (index: number, seriesLength: number): number => {
  if (seriesLength <= 0) return 0;
  return Math.max(0, Math.min(seriesLength - 1, index));
};

const windowLengthFor = (seriesLength: number, zoom: ZoomPreset): number =>
  Math.max(1, Math.min(ZOOM_MONTH_COUNTS[zoom], seriesLength));

/** Where the window sits by default: centred on the anchor and clamped to the
 *  record, so a zoom change narrows around the selection instead of jumping to
 *  the present. */
const baseStart = (
  seriesLength: number,
  anchorIndex: number,
  length: number
): number =>
  Math.max(
    0,
    Math.min(
      seriesLength - length,
      clampIndex(anchorIndex, seriesLength) - Math.floor((length - 1) / 2)
    )
  );

export const resolveTimelineWindow = (
  seriesLength: number,
  anchorIndex: number,
  zoom: ZoomPreset
): TimelineWindow => {
  if (seriesLength <= 0) {
    return { start: 0, end: 0, length: 0 };
  }

  const length = windowLengthFor(seriesLength, zoom);
  const start = baseStart(seriesLength, anchorIndex, length);

  return { start, end: start + length, length };
};

/**
 * A window at a caller-chosen start, clamped to the record. This is what a pan
 * produces, and what a commit re-uses to hold the strip still: recentring on
 * every release slid the whole band sideways under a reader who had only moved
 * the handle by a month.
 */
export const windowFromStart = (
  seriesLength: number,
  start: number,
  zoom: ZoomPreset
): TimelineWindow => {
  if (seriesLength <= 0) {
    return { start: 0, end: 0, length: 0 };
  }

  const length = windowLengthFor(seriesLength, zoom);
  const clampedStart = Math.max(0, Math.min(seriesLength - length, start));

  return { start: clampedStart, end: clampedStart + length, length };
};

export const windowContainsIndex = (
  timelineWindow: TimelineWindow,
  index: number
): boolean => index >= timelineWindow.start && index < timelineWindow.end;

export const indexFromRatio = (
  timelineWindow: TimelineWindow,
  ratio: number
): number => {
  if (timelineWindow.length <= 0) return 0;
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  return (
    timelineWindow.start +
    Math.round(clampedRatio * (timelineWindow.length - 1))
  );
};

export const ratioForIndex = (
  timelineWindow: TimelineWindow,
  index: number
): number => {
  if (timelineWindow.length <= 1) return 0;
  const offset = Math.max(
    0,
    Math.min(timelineWindow.length - 1, index - timelineWindow.start)
  );
  return offset / (timelineWindow.length - 1);
};

/** Stepping is over the record, never over the window. */
export const stepIndex = (
  seriesLength: number,
  index: number,
  delta: number
): number => clampIndex(index + delta, seriesLength);

export const nextZoom = (
  zoom: ZoomPreset,
  direction: "in" | "out"
): ZoomPreset => {
  const position = ZOOM_ORDER.indexOf(zoom);
  const target = direction === "in" ? position - 1 : position + 1;
  if (position < 0 || target < 0 || target >= ZOOM_ORDER.length) {
    return zoom;
  }
  return ZOOM_ORDER[target] ?? zoom;
};

export const findSeriesIndex = (
  series: ReadonlyArray<{ month: number; year: number }>,
  month: number | undefined,
  year: number | undefined
): number => {
  if (!month || !year) return -1;
  return series.findIndex(
    (entry) => entry.month === month && entry.year === year
  );
};
