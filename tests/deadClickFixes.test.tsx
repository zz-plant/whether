import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MonthStrip } from "../app/components/history/monthStrip";
import { TrackRecordSection } from "../app/components/history/TrackRecordSection";
import { RegimeRadar } from "../app/components/home/RegimeRadar";
import { isDeadClickEvent } from "../lib/deadClickTelemetry";
import { buildMonthBriefHref } from "../lib/timeMachine/monthFormatting";
import { getTimeMachineRegimeSeries } from "../lib/timeMachine/timeMachineCache";

/*
 * The 2026-11-03 dead-click pass: the places a reader was predicted to press and get
 * nothing now answer, and the stream that measures the rest carries only what
 * `/privacy` says it does.
 */
const series = getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER);

describe("a month on the record opens the brief as it read then", () => {
  it("builds the stepper's own URL from a month-end", () => {
    assert.equal(buildMonthBriefHref("2026-09-30"), "/?month=9&year=2026");
    assert.equal(buildMonthBriefHref("2012-01-31"), "/?month=1&year=2012");
  });

  it("links every month in the strip, out of the tab order, each named", () => {
    const html = renderToStaticMarkup(<MonthStrip entries={series.slice(-24)} />);
    const months = [...html.matchAll(/<a href="(\/\?month=\d+&amp;year=\d+)" tabindex="-1" aria-label="([^"]+)"/g)];
    assert.equal(months.length, 24);
    assert.match(months.at(-1)?.[2] ?? "", /^\w{3} \d{4}: /, "the label names the month and its conditions");
    assert.doesNotMatch(html, /<span[^>]*data-regime="[^"]*"[^>]*title=/, "no month is a bare coloured span any more");
  });

  it("links the date of each change in the track record", () => {
    const html = renderToStaticMarkup(<TrackRecordSection series={series} />);
    const rows = html.slice(html.indexOf("<tbody>"), html.indexOf("</tbody>"));
    const dated = [...rows.matchAll(/<tr[^>]*><td[^>]*><a href="\/\?month=\d+&amp;year=\d+"/g)];
    assert.ok(dated.length > 0);
    assert.equal(dated.length, (rows.match(/<tr/g) ?? []).length, "every row's date is a link");
  });
});

describe("a tap on the conditions map opens its readings", () => {
  const props = {
    tightness: 90,
    riskAppetite: 53,
    previousTightness: 63,
    previousRiskAppetite: 56,
    tightnessThreshold: 70,
    riskAppetiteThreshold: 50,
    currentRegime: "DEFENSIVE",
    previousLabel: "Sep 30",
    compact: true,
  };

  it("wraps the picture in a link to the fold that holds the readings", () => {
    const html = renderToStaticMarkup(<RegimeRadar {...props} readingsId="conditions-map-readings" />);
    assert.match(html, /<a href="#conditions-map-readings" tabindex="-1" aria-hidden="true" title="Scores on this chart"[^>]*><svg/);
    assert.match(html, /<details[^>]*id="conditions-map-readings"/, "the id is on the fold, which has a box to land on while closed");
  });

  it("stays a picture without an id to link to", () => {
    const html = renderToStaticMarkup(<RegimeRadar {...props} />);
    assert.doesNotMatch(html, /<a href="#/);
  });
});

describe("the dead-click stream", () => {
  const event = { type: "dead_click", path: "/history", section: "call-by-month", kind: "chart", rage: false, pointer: "touch" };

  it("accepts the page, the section and the kind of element", () => {
    assert.ok(isDeadClickEvent(event));
    assert.ok(isDeadClickEvent({ ...event, section: "", kind: "other", rage: true, pointer: "mouse" }));
  });

  it("refuses anything more, so it cannot start carrying what a reader read or where they pressed", () => {
    assert.ok(!isDeadClickEvent({ ...event, text: "On hold" }), "no words");
    assert.ok(!isDeadClickEvent({ ...event, x: 120 }), "no position");
    assert.ok(!isDeadClickEvent({ ...event, path: "/?decision=hiring" }), "no query string");
    assert.ok(!isDeadClickEvent({ ...event, section: "Hiring: On hold" }), "a section is an id, not text");
    assert.ok(!isDeadClickEvent({ ...event, kind: "button" }));
    assert.ok(!isDeadClickEvent(Object.fromEntries(Object.entries(event).filter(([key]) => key !== "rage"))));
    assert.ok(!isDeadClickEvent(null));
  });
});
