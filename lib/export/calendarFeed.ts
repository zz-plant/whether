/**
 * The weekly guidance as a calendar a team subscribes to.
 *
 * The Monday hold (`app/components/calendarButton.tsx`) repeats one event, so
 * its description can only carry the standing agenda: a week's numbers in it
 * would be wrong by the second Monday. A subscribed feed has no such limit. The
 * calendar app re-reads it, so each Monday carries its own week's conditions,
 * guidance and lines, from the frozen record, and everyone who can see a shared
 * team calendar sees the week's guidance without opening anything.
 *
 * All-day events marked free: the feed says what the week is, and leaves the
 * meeting about it to the hold.
 */
import { DECISION_CONTRACT_LABELS } from "../report/reportCopy";
import {
  buildPublishedBriefPath,
  publishedBriefDisplay,
  publishedBriefHeadline,
  type PublishedBrief,
} from "../report/publishedBriefs";
import { buildCanonicalUrl } from "../seo";

const DAY_MS = 24 * 60 * 60 * 1000;
/** About six months of Mondays: enough to scroll back through, small enough to refresh quickly. */
const FEED_WEEKS = 26;

export const CALENDAR_FEED_PATH = "/calendar.ics";

/* RFC 5545 §3.3.11: backslash, semicolon, comma, and newline are escaped in text. */
const escapeText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/* §3.1: lines longer than 75 octets fold onto continuation lines that open with a space. */
const foldLine = (line: string) => {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  for (const char of line) {
    const limit = parts.length === 0 ? 75 : 74;
    if (encoder.encode(current + char).length > limit) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.join("\r\n ");
};

const compactDate = (date: Date) => date.toISOString().slice(0, 10).replaceAll("-", "");
const compactStamp = (date: Date) => `${date.toISOString().slice(0, 19).replace(/[-:]/g, "")}Z`;

/** The Monday on or before a date, at midnight UTC. */
const mondayOf = (value: string | Date) => {
  const date = new Date(typeof value === "string" ? Date.parse(value) : value.valueOf());
  date.setUTCHours(0, 0, 0, 0);
  return new Date(date.valueOf() - ((date.getUTCDay() + 6) % 7) * DAY_MS);
};

const allDayEvent = ({
  uid,
  stamp,
  monday,
  summary,
  description,
  url,
}: {
  uid: string;
  stamp: Date;
  monday: Date;
  summary: string;
  description: string;
  url: string;
}) => [
  "BEGIN:VEVENT",
  `UID:${uid}`,
  `DTSTAMP:${compactStamp(stamp)}`,
  `DTSTART;VALUE=DATE:${compactDate(monday)}`,
  `DTEND;VALUE=DATE:${compactDate(new Date(monday.valueOf() + DAY_MS))}`,
  `SUMMARY:${escapeText(summary)}`,
  `DESCRIPTION:${escapeText(description)}`,
  `URL:${url}`,
  "TRANSP:TRANSPARENT",
  "END:VEVENT",
];

const briefEvent = (brief: PublishedBrief) => {
  const display = publishedBriefDisplay(brief);
  const url = buildCanonicalUrl(buildPublishedBriefPath(brief.slug));
  const guidance = publishedBriefHeadline(brief).composed;
  const stamp = new Date(Date.parse(brief.publishedAt) || Date.parse(brief.recordDate));
  return allDayEvent({
    uid: `${brief.slug}@whether.work`,
    stamp,
    monday: mondayOf(brief.recordDate),
    summary: `Whether: ${display.conditions}. ${guidance}`,
    description: [
      `Conditions: ${display.conditions}`,
      `Guidance: ${guidance}`,
      ...(display.pauseIf ? [`${DECISION_CONTRACT_LABELS.threshold.pauseIf}: ${display.pauseIf}`] : []),
      `${DECISION_CONTRACT_LABELS.watch.postureFlips}: ${display.conditionsChangeIf}`,
      `What changed: ${display.whatChanged}`,
      "",
      `Full brief: ${url}`,
    ].join("\n"),
    url,
  });
};

/**
 * The feed: the latest frozen weeks, newest first, and the coming Monday as a
 * marker until its own record replaces it. The marker names no conditions,
 * because none have been read yet.
 */
export const buildBriefCalendarFeed = (briefs: readonly PublishedBrief[], now: Date): string => {
  const recent = [...briefs].sort((a, b) => b.recordDate.localeCompare(a.recordDate)).slice(0, FEED_WEEKS);
  const nextMonday = new Date(mondayOf(now).valueOf() + 7 * DAY_MS);
  const covered = new Set(recent.map((brief) => compactDate(mondayOf(brief.recordDate))));
  const upcoming = covered.has(compactDate(nextMonday))
    ? []
    : allDayEvent({
        uid: `upcoming-${compactDate(nextMonday)}@whether.work`,
        stamp: now,
        monday: nextMonday,
        summary: "Whether: this week's guidance is out",
        description: `The week's conditions, guidance, and pause and resume lines.\n\n${buildCanonicalUrl("/")}`,
        url: buildCanonicalUrl("/"),
      });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Whether//Weekly guidance//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Whether weekly guidance",
    `X-WR-CALDESC:${escapeText("Each Monday's operating conditions and guidance for startup leaders.")}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
    "X-PUBLISHED-TTL:PT12H",
    ...upcoming,
    ...recent.flatMap(briefEvent),
    "END:VCALENDAR",
  ]
    .map(foldLine)
    .join("\r\n")
    .concat("\r\n");
};
