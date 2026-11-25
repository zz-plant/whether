import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { GET } from "../app/calendar.ics/route";
import { buildBriefCalendarFeed, buildWeekAgenda } from "../lib/export/calendarFeed";
import { MONDAY_AGENDA_STEPS, MONDAY_AGENDA_TITLE } from "../lib/report/briefArtifact";
import { POLICY_OVERRIDE_CALL_UNNAMED } from "../lib/report/reportCopy";
import {
  findPublishedBrief,
  getPublishedBriefs,
  publishedBriefDisplay,
  publishedBriefHeadline,
  type PublishedBrief,
} from "../lib/report/publishedBriefs";

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

  /* The week of Nov 9, 2026 read from the live feed on Nov 11 with no event at all: the
     marker had moved on to Nov 16 at midnight on Nov 9, and the week's record waits on
     Thursday's freeze. A subscriber opening the calendar on a Monday saw an empty day. */
  it("keeps marking this Monday until its own record exists", () => {
    const latest = [...briefs].sort((a, b) => b.recordDate.localeCompare(a.recordDate))[0];
    assert.ok(latest, "the archive has at least one week");
    const recorded = new Date(`${latest.recordDate}T12:00:00Z`);
    const thisMonday = new Date(recorded);
    thisMonday.setUTCDate(recorded.getUTCDate() - ((recorded.getUTCDay() + 6) % 7) + 7);
    const wednesday = new Date(thisMonday);
    wednesday.setUTCDate(thisMonday.getUTCDate() + 2);
    const nextMonday = new Date(thisMonday);
    nextMonday.setUTCDate(thisMonday.getUTCDate() + 7);
    const stamp = (date: Date) => date.toISOString().slice(0, 10).replace(/-/g, "");

    const body = unfold(buildBriefCalendarFeed(briefs, wednesday));
    const marker = body
      .split("BEGIN:VEVENT")
      .find((chunk) => chunk.includes(`UID:upcoming-${stamp(thisMonday)}@whether.work`));
    assert.ok(marker, `the Monday after ${latest.slug} is still marked in its own week`);
    assert.ok(marker.includes(`DTSTART;VALUE=DATE:${stamp(thisMonday)}`));
    assert.ok(body.includes(`UID:upcoming-${stamp(nextMonday)}@whether.work`), "and so is the Monday after it");
  });

  it("serves the feed as text/calendar", async () => {
    const response = GET();
    assert.equal(response.headers.get("content-type"), "text/calendar; charset=utf-8");
    assert.ok((await response.text()).startsWith("BEGIN:VCALENDAR"));
  });
});

/*
 * Each frozen week's event is the Monday review's agenda, answered for that week
 * (#1787): the guidance, what would change the conditions, the standup status and
 * the lines crossed, the areas on hold, and one question for the meeting. Pinned
 * on frozen weeks, which are append-only, so the archive growing cannot move them.
 */
const frozen = (slug: string): PublishedBrief => {
  const brief = findPublishedBrief(slug);
  assert.ok(brief, `${slug} is in the archive`);
  return brief;
};

/** RFC 5545 §3.3.11 in reverse: the text a calendar app shows. */
const unescapeText = (value: string) => value.replace(/\\([\\;,nN])/g, (_match, char: string) => (char === "n" || char === "N" ? "\n" : char));

const eventDescription = (ics: string, uid: string) => {
  const event = unfold(ics).split("BEGIN:VEVENT").find((chunk) => chunk.includes(`UID:${uid}`));
  assert.ok(event, `the feed has ${uid}`);
  const raw = /^DESCRIPTION:(.*)$/m.exec(event)?.[1];
  assert.ok(raw, `${uid} has a description`);
  return { raw, text: unescapeText(raw) };
};

const revisitPrompt = MONDAY_AGENDA_STEPS.find((step) => step.id === "revisit")?.prompt ?? "";

describe("calendar feed agenda", () => {
  const now = new Date("2026-11-25T12:00:00Z");

  it("opens on the guidance and the change line, then the agenda, then the link", () => {
    const brief = frozen("2026-w46");
    const display = publishedBriefDisplay(brief);
    const { text } = eventDescription(buildBriefCalendarFeed([brief], now), "2026-w46@whether.work");
    const lines = text.split("\n");
    assert.equal(lines[0], `Conditions: ${display.conditions}`);
    assert.equal(lines[1], `Guidance: ${publishedBriefHeadline(brief).composed}`);
    assert.ok(lines.includes(`Conditions change if: ${display.conditionsChangeIf}`), "the flip-watch line");
    assert.ok(text.includes(`\n\n${buildWeekAgenda(brief).join("\n")}\n\n`), "the agenda as its own block");
    assert.ok(text.endsWith("Full brief: https://whether.work/brief/2026-w46"));
  });

  it("falls back to the standing question on a week where nothing moved", () => {
    assert.deepEqual(buildWeekAgenda(frozen("2026-w46")), [
      MONDAY_AGENDA_TITLE,
      "What changed",
      "• Guidance unchanged; no pace change.",
      "• No area paused or restarted since Nov 3.",
      "Check what is paused",
      "• On hold: Hiring, Fundraising, Spending and New bets.",
      "Decide what to revisit",
      `• ${revisitPrompt}`,
    ]);
  });

  it("asks about the area that moved, with the line that moved it", () => {
    assert.deepEqual(buildWeekAgenda(frozen("2026-w44")).slice(1), [
      "What changed",
      "• An area paused or restarted; review pace.",
      "• Risk appetite fell below 54.",
      "Check what is paused",
      "• On hold: Hiring, Fundraising, Spending and New bets.",
      "Decide what to revisit",
      "• Since Sep 30, the restart condition no longer holds for Roadmap. Which plan counted on a restart there, and does it wait now?",
    ]);
  });

  it("names a change of conditions in the standup status", () => {
    assert.ok(buildWeekAgenda(frozen("2026-w41")).includes("• Conditions changed to Freezing; review pace."));
  });

  it("asks about the score that moved furthest when no area moved", () => {
    const worse = buildWeekAgenda(frozen("2026-w39"));
    assert.equal(worse.at(-1), "• Funding pressure rose 8 pts since Sep 15. Does every commitment you have planned still fit your runway if it keeps rising?");

    const base = frozen("2026-w46");
    assert.ok(base.scores);
    const eased = buildWeekAgenda({ ...base, scores: { ...base.scores, tightness: 88, tightnessDelta: -2 } });
    assert.ok(eased.includes("• Guidance unchanged; no pace change."), "a two-point move crosses no line");
    assert.equal(eased.at(-1), "• Funding pressure fell 2 pts since Nov 3. Which decision held back for conditions would you reopen if it keeps falling?");
  });

  it("says nothing was compared rather than that nothing moved, and asks the no-hold question with nothing on hold", () => {
    const agenda = buildWeekAgenda(frozen("2026-w31"));
    assert.ok(agenda.includes("• No earlier reading to compare with."));
    assert.ok(!agenda.some((line) => line.startsWith("• No area paused")), "no claim about a comparison nobody made");
    assert.equal(agenda.at(-1), "• Which decision is waiting on conditions rather than on your own numbers?");
  });

  it("says a held week is held", () => {
    const base = frozen("2026-w46");
    const agenda = buildWeekAgenda({ ...base, summary: POLICY_OVERRIDE_CALL_UNNAMED.currentCall });
    assert.equal(agenda[2], "• Guidance on hold this week; no pace change.");
  });

  it("escapes the agenda's commas, semicolons and newlines, and folds it at 75 octets", () => {
    const ics = buildBriefCalendarFeed([frozen("2026-w44")], now);
    const { raw } = eventDescription(ics, "2026-w44@whether.work");
    assert.ok(raw.includes("\\nMonday guidance review\\nWhat changed\\n• An area paused or restarted\\; review pace."));
    assert.ok(raw.includes("• On hold: Hiring\\, Fundraising\\, Spending and New bets."));
    assert.doesNotMatch(raw, /[^\\][,;]/, "every comma and semicolon is escaped");
    const physical = ics.split("\r\n");
    assert.ok(physical.some((line) => line.startsWith(" ") && line.includes("•")), "the agenda runs onto folded lines");
    /* The bullet is three octets, so a fold counted in characters would overrun here. */
    for (const line of physical) assert.ok(new TextEncoder().encode(line).length <= 75, `over 75 octets: ${line}`);
  });
});
