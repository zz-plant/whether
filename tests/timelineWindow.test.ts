import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildYearTicks,
  findSeriesIndex,
  findYearEntryIndex,
  indexFromRatio,
  nextZoom,
  ratioForIndex,
  resolveTimelineWindow,
  shouldUseYearRail,
  stepIndex,
  TIMELINE_PAGE_MONTHS,
  windowContainsIndex,
  YEAR_AXIS_MIN_PITCH_PX,
  YEAR_LABEL_MIN_GAP_PX,
  windowFromStart,
  ZOOM_ORDER,
} from "../lib/timeMachine/timelineWindow";

/** 175 months, the length of the real record when this was written. */
const SERIES_LENGTH = 175;
const LIVE = SERIES_LENGTH - 1;

describe("resolveTimelineWindow", () => {
  it("keeps the selection in view at every zoom level", () => {
    // The defect: the window was the trailing N months, so any selection older
    // than N dropped out of view and the bar reported the last visible month as
    // the selected one.
    for (const zoom of ZOOM_ORDER) {
      for (const selected of [0, 1, 37, 90, 138, LIVE]) {
        const view = resolveTimelineWindow(SERIES_LENGTH, selected, zoom);
        assert.equal(windowContainsIndex(view, selected), true);
      }
    }
  });

  it("pins to the end of the record when the live month is selected", () => {
    const view = resolveTimelineWindow(SERIES_LENGTH, LIVE, "3Y");
    assert.equal(view.end, SERIES_LENGTH);
    assert.equal(view.length, 36);
  });

  it("pins to the start of the record when the oldest month is selected", () => {
    const view = resolveTimelineWindow(SERIES_LENGTH, 0, "1Y");
    assert.equal(view.start, 0);
    assert.equal(view.length, 12);
  });

  it("centres the window on an interior selection", () => {
    const view = resolveTimelineWindow(SERIES_LENGTH, 90, "1Y");
    assert.equal(view.start, 85);
    assert.equal(view.end, 97);
  });

  it("always keeps a full window's worth of months in view", () => {
    for (const selected of [0, 5, 90, LIVE]) {
      const view = resolveTimelineWindow(SERIES_LENGTH, selected, "5Y");
      assert.equal(view.length, 60);
      assert.equal(view.end - view.start, 60);
    }
  });

  it("treats MAX as the whole record rather than a fixed month count", () => {
    const view = resolveTimelineWindow(SERIES_LENGTH, 12, "MAX");
    assert.equal(view.start, 0);
    assert.equal(view.end, SERIES_LENGTH);
  });

  it("clamps a window wider than the record", () => {
    const view = resolveTimelineWindow(8, 3, "5Y");
    assert.deepEqual(view, { start: 0, end: 8, length: 8 });
  });

  it("returns an empty window for an empty record", () => {
    assert.deepEqual(resolveTimelineWindow(0, 0, "3Y"), {
      start: 0,
      end: 0,
      length: 0,
    });
  });

  it("does not move the selection when zooming in around it", () => {
    // Reproduces the reported sequence: viewing Mar 2015 (index 38 of 175) and
    // clicking 1Y used to report the live month instead.
    const before = resolveTimelineWindow(SERIES_LENGTH, 38, "MAX");
    const after = resolveTimelineWindow(SERIES_LENGTH, 38, "1Y");
    assert.equal(windowContainsIndex(before, 38), true);
    assert.equal(windowContainsIndex(after, 38), true);
  });
});

describe("windowFromStart", () => {
  it("clamps a start past the beginning of the record", () => {
    const view = windowFromStart(SERIES_LENGTH, -10_000, "1Y");
    assert.equal(view.start, 0);
    assert.equal(view.end, 12);
  });

  it("clamps a start past the end of the record", () => {
    const view = windowFromStart(SERIES_LENGTH, 10_000, "1Y");
    assert.equal(view.end, SERIES_LENGTH);
    assert.equal(view.length, 12);
  });

  it("cannot accumulate dead travel at an edge", () => {
    // A hard flick at the left edge must not need unwinding: one step the other
    // way moves the window immediately.
    const pinned = windowFromStart(SERIES_LENGTH, -10_000, "1Y");
    assert.equal(windowFromStart(SERIES_LENGTH, pinned.start + 1, "1Y").start, 1);
  });

  it("has no travel at all when the window is the whole record", () => {
    const view = windowFromStart(SERIES_LENGTH, 40, "MAX");
    assert.equal(view.start, 0);
    assert.equal(view.end, SERIES_LENGTH);
  });

  it("holds a window that still contains the selection", () => {
    // What a commit re-uses: the reader moved the handle a month, so the band
    // must not slide sideways underneath them.
    const held = windowFromStart(SERIES_LENGTH, 100, "3Y");
    assert.equal(windowContainsIndex(held, 110), true);
    assert.equal(held.start, 100);
  });
});

describe("stepIndex", () => {
  it("steps over the record, not the visible window", () => {
    // The defect: five ArrowLeft presses from Mar 2015 landed in Feb 2026,
    // because each step walked back from the last month of the visible window.
    let index = 38;
    for (let press = 0; press < 5; press += 1) {
      index = stepIndex(SERIES_LENGTH, index, -1);
    }
    assert.equal(index, 33);
  });

  it("clamps at both ends", () => {
    assert.equal(stepIndex(SERIES_LENGTH, 0, -1), 0);
    assert.equal(stepIndex(SERIES_LENGTH, LIVE, 1), LIVE);
    assert.equal(stepIndex(SERIES_LENGTH, 3, -TIMELINE_PAGE_MONTHS), 0);
    assert.equal(stepIndex(SERIES_LENGTH, 40, TIMELINE_PAGE_MONTHS), 52);
  });
});

describe("indexFromRatio / ratioForIndex", () => {
  it("round-trips every index in the window", () => {
    const view = resolveTimelineWindow(SERIES_LENGTH, 90, "3Y");
    for (let index = view.start; index < view.end; index += 1) {
      assert.equal(indexFromRatio(view, ratioForIndex(view, index)), index);
    }
  });

  it("returns absolute indices, not window offsets", () => {
    const view = resolveTimelineWindow(SERIES_LENGTH, 90, "1Y");
    assert.equal(indexFromRatio(view, 0), view.start);
    assert.equal(indexFromRatio(view, 1), view.end - 1);
  });

  it("clamps ratios outside the track", () => {
    const view = resolveTimelineWindow(SERIES_LENGTH, 90, "1Y");
    assert.equal(indexFromRatio(view, -3), view.start);
    assert.equal(indexFromRatio(view, 4), view.end - 1);
  });
});

describe("nextZoom", () => {
  it("walks the presets and stops at both ends", () => {
    assert.equal(nextZoom("3Y", "in"), "1Y");
    assert.equal(nextZoom("3Y", "out"), "5Y");
    assert.equal(nextZoom("1Y", "in"), "1Y");
    assert.equal(nextZoom("MAX", "out"), "MAX");
  });
});

describe("findSeriesIndex", () => {
  const series = [
    { month: 11, year: 2024 },
    { month: 12, year: 2024 },
    { month: 1, year: 2025 },
  ];

  it("finds a month on record", () => {
    assert.equal(findSeriesIndex(series, 12, 2024), 1);
  });

  it("reports a miss rather than a nearby month", () => {
    assert.equal(findSeriesIndex(series, 6, 2019), -1);
    assert.equal(findSeriesIndex(series, 12, 2025), -1);
  });

  it("treats a missing month or year as no request", () => {
    assert.equal(findSeriesIndex(series, undefined, 2024), -1);
    assert.equal(findSeriesIndex(series, 12, undefined), -1);
    assert.equal(findSeriesIndex(series, 0, 0), -1);
  });
});

/** Jan 2012 through Jul 2026, the shape of the real record. */
const monthlySeries = (() => {
  const months: { month: number; year: number }[] = [];
  for (let year = 2012; year <= 2026; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      if (year === 2026 && month > 7) break;
      months.push({ month, year });
    }
  }
  return months;
})();

describe("buildYearTicks", () => {
  const fullWindow = resolveTimelineWindow(monthlySeries.length, 0, "MAX");

  it("puts one tick on the first month of each year in view", () => {
    const ticks = buildYearTicks(monthlySeries, fullWindow, 1024);
    assert.deepEqual(
      ticks.map((tick) => tick.year),
      [
        2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023,
        2024, 2025, 2026,
      ]
    );
    assert.equal(monthlySeries[ticks[9].index].year, 2021);
    assert.equal(monthlySeries[ticks[9].index].month, 1);
  });

  it("labels every year when they fit", () => {
    // 1024px over fifteen years is ~70px each, which is what a desktop track
    // measures; nothing should be dropped there.
    const ticks = buildYearTicks(monthlySeries, fullWindow, 1024);
    assert.equal(ticks.every((tick) => tick.labelled), true);
  });

  it("thins labels that would collide on a narrow track", () => {
    // 343px over fifteen years is ~23px each, where all fourteen adjacent pairs
    // used to overlap into an unreadable smear.
    const ticks = buildYearTicks(monthlySeries, fullWindow, 343);
    const labelled = ticks.filter((tick) => tick.labelled);
    assert.equal(labelled.length < ticks.length, true);

    for (let at = 1; at < labelled.length; at += 1) {
      const gap =
        ((labelled[at].positionPercent - labelled[at - 1].positionPercent) /
          100) *
        343;
      assert.equal(gap >= YEAR_LABEL_MIN_GAP_PX, true);
    }
  });

  it("keeps every tick as a mark even when its label is dropped", () => {
    const ticks = buildYearTicks(monthlySeries, fullWindow, 343);
    assert.equal(ticks.length, 15);
  });

  it("always labels the year being viewed", () => {
    // Walking outward from the selection, rather than greedily from the left,
    // is what guarantees the year you are on is the one named.
    for (const year of [2012, 2017, 2021, 2024, 2026]) {
      const ticks = buildYearTicks(monthlySeries, fullWindow, 343, year);
      const tick = ticks.find((candidate) => candidate.year === year);
      assert.equal(tick?.labelled, true);
    }
  });

  it("labels the single year of a one-year window", () => {
    const window2021 = resolveTimelineWindow(monthlySeries.length, 108, "1Y");
    const ticks = buildYearTicks(monthlySeries, window2021, 1024, 2021);
    assert.equal(ticks.length >= 1, true);
    assert.equal(ticks.every((tick) => tick.labelled), true);
  });

  it("labels everything before the track has been measured", () => {
    // SSR and the first client render share this branch, so the markup matches.
    const ticks = buildYearTicks(monthlySeries, fullWindow, 0);
    assert.equal(ticks.every((tick) => tick.labelled), true);
  });

  it("returns nothing for an empty window", () => {
    assert.deepEqual(buildYearTicks(monthlySeries, resolveTimelineWindow(0, 0, "MAX"), 1024), []);
  });
});

describe("findYearEntryIndex", () => {
  it("holds the month of year so stepping years keeps the reader's place", () => {
    const index = findYearEntryIndex(monthlySeries, 2021, 2);
    assert.equal(monthlySeries[index].year, 2021);
    assert.equal(monthlySeries[index].month, 2);
  });

  it("falls back to the first month a partial year holds", () => {
    // 2026 stops at July, so a December selection cannot carry across.
    const index = findYearEntryIndex(monthlySeries, 2026, 12);
    assert.equal(monthlySeries[index].year, 2026);
    assert.equal(monthlySeries[index].month, 1);
  });

  it("reports a miss for a year off the record", () => {
    assert.equal(findYearEntryIndex(monthlySeries, 1999, 1), -1);
  });
});

describe("shouldUseYearRail", () => {
  const fifteenYears = 15;

  it("keeps the positional axis on a desktop track", () => {
    // 1024px over fifteen years is ~68px each — room for a full label and the
    // mapping to the band above it is worth keeping.
    assert.equal(shouldUseYearRail(fifteenYears, 1024), false);
  });

  it("switches to the rail on a phone at full zoom", () => {
    // 343px over fifteen years is 22.9px each, narrower than the 38.4px label.
    assert.equal(shouldUseYearRail(fifteenYears, 343), true);
  });

  it("keeps the positional axis on a phone at a narrower zoom", () => {
    // A 3Y window has four year ticks, ~86px each: no crowding, no rail.
    assert.equal(shouldUseYearRail(4, 343), false);
  });

  it("keeps the positional axis before the track is measured", () => {
    // Same branch on the server and the first client render, so hydration sees
    // the markup it was sent.
    assert.equal(shouldUseYearRail(fifteenYears, 0), false);
  });

  it("never rails a single year", () => {
    assert.equal(shouldUseYearRail(1, 40), false);
  });

  it("switches exactly at the documented pitch", () => {
    const pitch = YEAR_AXIS_MIN_PITCH_PX;
    assert.equal(shouldUseYearRail(10, pitch * 10), false);
    assert.equal(shouldUseYearRail(10, pitch * 10 - 1), true);
  });
});
