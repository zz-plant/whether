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
import { formatDateUTC } from "../formatters";
import type { CompanySituation } from "../report/companySituation";

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
  day,
  summary,
  description,
  url,
}: {
  uid: string;
  stamp: Date;
  day: Date;
  summary: string;
  description: string;
  url: string;
}) => [
  "BEGIN:VEVENT",
  `UID:${uid}`,
  `DTSTAMP:${compactStamp(stamp)}`,
  `DTSTART;VALUE=DATE:${compactDate(day)}`,
  `DTEND;VALUE=DATE:${compactDate(new Date(day.valueOf() + DAY_MS))}`,
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
    day: mondayOf(brief.recordDate),
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
 * The feed: the latest frozen weeks, newest first, and a marker on the coming
 * Monday and on this week's Monday until each one's own record replaces it.
 * The marker names no conditions and links to `/`, which carries the week
 * until its freeze lands.
 *
 * Only the coming Monday was marked, so the marker left a Monday at midnight
 * on that Monday, and the week's record arrives with Thursday's freeze: every
 * subscriber's calendar was empty on the day it promised that week's guidance.
 * A week whose freeze never lands keeps the marker only while it is this week,
 * since `/` no longer carries it after that.
 */
export const buildBriefCalendarFeed = (briefs: readonly PublishedBrief[], now: Date): string => {
  const recent = [...briefs].sort((a, b) => b.recordDate.localeCompare(a.recordDate)).slice(0, FEED_WEEKS);
  const thisMonday = mondayOf(now);
  const nextMonday = new Date(thisMonday.valueOf() + 7 * DAY_MS);
  const covered = new Set(recent.map((brief) => compactDate(mondayOf(brief.recordDate))));
  const upcoming = [nextMonday, thisMonday]
    .filter((monday) => !covered.has(compactDate(monday)))
    .flatMap((monday) =>
      allDayEvent({
        uid: `upcoming-${compactDate(monday)}@whether.work`,
        stamp: now,
        day: monday,
        summary: "Whether: this week's guidance is out",
        description: `The week's conditions, guidance, and pause and restart lines.\n\n${buildCanonicalUrl("/")}`,
        url: buildCanonicalUrl("/"),
      }),
    );

  return calendar({
    name: "Whether weekly guidance",
    description: "Each Monday's operating conditions and guidance for startup leaders.",
    events: [...upcoming, ...recent.flatMap(briefEvent)],
  });
};

const calendar = ({ name, description, events }: { name: string; description: string; events: string[] }) =>
  [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Whether//Weekly guidance//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    `X-WR-CALDESC:${escapeText(description)}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
    "X-PUBLISHED-TTL:PT12H",
    ...events,
    "END:VCALENDAR",
  ]
    .map(foldLine)
    .join("\r\n")
    .concat("\r\n");

export const companyCalendarPath = (slug: string) => `/companies/${slug}/calendar.ics`;

/**
 * One company's planning year as a subscribed calendar: when budget season opens, when the fiscal
 * year starts, and the dates its next reports are due by. The dates come from the filings
 * (`buildCompanySituation`), and the calendar app re-reads the feed, so each refresh rolls them on.
 */
export const buildCompanyCalendarFeed = (
  company: { slug: string; name: string },
  situation: Pick<CompanySituation, "fiscalYear" | "nextReports">,
  now: Date,
): string => {
  const url = buildCanonicalUrl(`/companies/${company.slug}`);
  const at = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
  const year = situation.fiscalYear;
  const planningEvents = year
    ? [
        ...allDayEvent({
          uid: `${company.slug}-budget-season-${year.startIso}@whether.work`,
          stamp: now,
          day: at(year.budgetSeasonOpensIso),
          summary: `${company.name}: budget season opens`,
          description: `Budgets for the fiscal year starting around ${formatDateUTC(year.startIso)} are usually set in the four months before it. What each role can bring to planning:\n\n${url}`,
          url,
        }),
        ...allDayEvent({
          uid: `${company.slug}-fiscal-year-${year.startIso}@whether.work`,
          stamp: now,
          day: at(year.startIso),
          summary: `${company.name}: fiscal year starts`,
          description: `${company.name}'s fiscal year starts around this date.\n\n${url}`,
          url,
        }),
      ]
    : [];
  const reportEvents = situation.nextReports.flatMap((report) =>
    allDayEvent({
      uid: `${company.slug}-report-${report.quarterEndIso}@whether.work`,
      stamp: now,
      day: at(report.dueByIso),
      summary: `${company.name}: ${report.annual ? "annual" : "quarterly"} report due`,
      description: `The report for the quarter ending around ${formatDateUTC(report.quarterEndIso)} is due by about this date. Whether's page reads the new figures within a week of the filing:\n\n${url}`,
      url,
    }),
  );
  return calendar({
    name: `${company.name} planning calendar`,
    description: `${company.name}'s budget season, fiscal year and report dates, from its SEC filings. Whether isn't affiliated with ${company.name}.`,
    events: [...planningEvents, ...reportEvents],
  });
};
