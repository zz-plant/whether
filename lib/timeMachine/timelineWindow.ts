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
const ZOOM_MONTH_COUNTS: Record<ZoomPreset, number> = {
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

interface TimelineWindow {
  /** First absolute index in view. */
  start: number;
  /** One past the last absolute index in view. */
  end: number;
  length: number;
}

const clampIndex = (index: number, seriesLength: number): number => {
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

/** Room a four-digit year label needs before the next one, in px. "2021"
 *  measures 38.4px in the axis font (11px monospace); this is that, rounded. */
export const YEAR_LABEL_MIN_GAP_PX = 38;

/** Below this much room per year, a positional axis stops being a control.
 *  Fifteen years across a 343px phone track is 22.9px each — narrower than the
 *  label itself, so no amount of thinning leaves every year reachable, and
 *  abbreviating to "'21" only buys 23.1px. Under this pitch the years are
 *  offered as a scrollable list with real targets instead. */
export const YEAR_AXIS_MIN_PITCH_PX = 46;

export const shouldUseYearRail = (
  tickCount: number,
  trackWidthPx: number
): boolean => {
  // Unmeasured (SSR, first client render) keeps the positional axis, so the
  // markup being hydrated is the markup that was sent.
  if (tickCount <= 1 || trackWidthPx <= 0) return false;
  return trackWidthPx / tickCount < YEAR_AXIS_MIN_PITCH_PX;
};

interface YearTick {
  year: number;
  /** Absolute index of the first month of that year inside the window. */
  index: number;
  positionPercent: number;
  /** Unlabelled ticks are drawn but not clickable — an invisible target is
   *  worse than no target. */
  labelled: boolean;
}

/**
 * The year axis, thinned to what actually fits.
 *
 * At MAX zoom the record spans fifteen years, which is 70px per label on a
 * desktop track and 23px on a phone — where all fourteen adjacent pairs
 * collided into an unreadable smear, on the one control a reader uses to find
 * an old year. Labelling is walked outward from the selected year rather than
 * greedily from the left, so the year you are on is always the one named.
 */
export const buildYearTicks = (
  series: ReadonlyArray<{ year: number }>,
  timelineWindow: TimelineWindow,
  trackWidthPx: number,
  anchorYear?: number
): YearTick[] => {
  if (timelineWindow.length <= 0) return [];

  const ticks: YearTick[] = [];
  let lastYear: number | null = null;

  for (
    let index = timelineWindow.start;
    index < timelineWindow.end;
    index += 1
  ) {
    const entry = series[index];
    if (!entry || entry.year === lastYear) continue;
    lastYear = entry.year;
    ticks.push({
      year: entry.year,
      index,
      positionPercent: ratioForIndex(timelineWindow, index) * 100,
      labelled: true,
    });
  }

  // Width is unknown during SSR and on the first client render, so everything
  // is labelled — the same markup on both sides, thinned once measured.
  if (ticks.length <= 1 || trackWidthPx <= 0) return ticks;

  const pxFor = (tick: YearTick) => (tick.positionPercent / 100) * trackWidthPx;
  const anchorAt = Math.max(
    0,
    ticks.findIndex((tick) => tick.year === anchorYear)
  );
  const labelled = new Set<number>([anchorAt]);

  let lastRight = pxFor(ticks[anchorAt]);
  for (let at = anchorAt + 1; at < ticks.length; at += 1) {
    if (pxFor(ticks[at]) - lastRight < YEAR_LABEL_MIN_GAP_PX) continue;
    labelled.add(at);
    lastRight = pxFor(ticks[at]);
  }

  let lastLeft = pxFor(ticks[anchorAt]);
  for (let at = anchorAt - 1; at >= 0; at -= 1) {
    if (lastLeft - pxFor(ticks[at]) < YEAR_LABEL_MIN_GAP_PX) continue;
    labelled.add(at);
    lastLeft = pxFor(ticks[at]);
  }

  return ticks.map((tick, at) => ({ ...tick, labelled: labelled.has(at) }));
};

/**
 * The month to land on when a reader picks a year. Holding the month-of-year
 * means stepping across years keeps their place in the calendar; only a year
 * that does not carry that month falls back to its first month on record.
 */
export const findYearEntryIndex = (
  series: ReadonlyArray<{ month: number; year: number }>,
  year: number,
  preferredMonth?: number
): number => {
  if (preferredMonth) {
    const exact = series.findIndex(
      (entry) => entry.year === year && entry.month === preferredMonth
    );
    if (exact >= 0) return exact;
  }
  return series.findIndex((entry) => entry.year === year);
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
