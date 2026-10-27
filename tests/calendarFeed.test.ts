import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { GET } from "../app/calendar.ics/route";
import { buildBriefCalendarFeed } from "../lib/export/calendarFeed";
import { getPublishedBriefs, publishedBriefDisplay } from "../lib/report/publishedBriefs";

/*
 * The subscribed calendar carries each Monday's own guidance, which the
 * repeating hold cannot. A calendar app rejects a feed over one malformed line,
 * so the format rules are pinned: CRLF endings, lines folded at 75 octets,
 * text escaped, one all-day event per frozen week on that week's Monday.
 */

const briefs = getPublishedBriefs();
const unfold = (ics: string) => ics.replace(/\r\n /g, "");

describe("calendar feed", () => {
  const now = new Date("2026-10-21T12:00:00Z");
  const ics = buildBriefCalendarFeed(briefs, now);

  it("is a calendar with CRLF line endings and no line over 75 octets", () => {
    assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"));
    assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
    assert.doesNotMatch(ics.replace(/\r\n/g, ""), /\n/, "a bare LF breaks strict parsers");
    for (const line of ics.split("\r\n")) {
      assert.ok(new TextEncoder().encode(line).length <= 75, `over 75 octets: ${line}`);
    }
  });

  it("puts each frozen week on its Monday, all day, with its guidance and link", () => {
    const latest = [...briefs].sort((a, b) => b.recordDate.localeCompare(a.recordDate))[0];
    assert.ok(latest, "the archive has at least one week");
    const body = unfold(ics);
    const event = body.split("BEGIN:VEVENT").find((chunk) => chunk.includes(`UID:${latest.slug}@whether.work`));
    assert.ok(event, "the latest week has an event");
    const start = /DTSTART;VALUE=DATE:(\d{8})/.exec(event)?.[1] ?? "";
    const day = new Date(`${start.slice(0, 4)}-${start.slice(4, 6)}-${start.slice(6)}T00:00:00Z`).getUTCDay();
    assert.equal(day, 1, "the event sits on a Monday");
    assert.ok(event.includes(`SUMMARY:Whether: ${publishedBriefDisplay(latest).conditions}.`));
    assert.match(event, new RegExp(`URL:https://\\S+/brief/${latest.slug}`));
    assert.ok(event.includes("TRANSP:TRANSPARENT"), "the feed never blocks time");
  });

  it("escapes commas, semicolons, and newlines in text", () => {
    assert.doesNotMatch(unfold(ics), /^(SUMMARY|DESCRIPTION):.*[^\\][,;]/m);
  });

  /* From the newest frozen week, so the case holds whichever weeks the archive has:
     it named Oct 26 until the w44 freeze gave that Monday its own record. */
  it("marks the coming Monday until its own record exists", () => {
    const latest = [...briefs].sort((a, b) => b.recordDate.localeCompare(a.recordDate))[0];
    assert.ok(latest, "the archive has at least one week");
    const recorded = new Date(`${latest.recordDate}T12:00:00Z`);
    const monday = new Date(recorded);
    monday.setUTCDate(recorded.getUTCDate() - ((recorded.getUTCDay() + 6) % 7));
    const wednesday = new Date(monday);
    wednesday.setUTCDate(monday.getUTCDate() + 2);
    const coming = new Date(monday);
    coming.setUTCDate(monday.getUTCDate() + 7);
    const stamp = coming.toISOString().slice(0, 10).replace(/-/g, "");

    const body = unfold(buildBriefCalendarFeed(briefs, wednesday));
    assert.ok(body.includes(`UID:upcoming-${stamp}@whether.work`), `the Monday after ${latest.slug} is marked`);
    const recordedStamp = monday.toISOString().slice(0, 10).replace(/-/g, "");
    assert.ok(!body.includes(`UID:upcoming-${recordedStamp}@whether.work`), "a Monday with its own record is not");
  });

  it("serves the feed as text/calendar", async () => {
    const response = GET();
    assert.equal(response.headers.get("content-type"), "text/calendar; charset=utf-8");
    assert.ok((await response.text()).startsWith("BEGIN:VCALENDAR"));
  });
});
