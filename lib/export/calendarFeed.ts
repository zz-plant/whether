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
 * meeting about it to the hold. Each event's description is that meeting's
 * agenda, answered for the week (`buildWeekAgenda`), so a subscriber can open
 * the event in the meeting instead of preparing for it.
 */
import { DEFAULT_THRESHOLDS } from "../regimeEngineCore";
import { MONDAY_AGENDA_STEPS, MONDAY_AGENDA_TITLE } from "../report/briefArtifact";
import { decisionAreaLabel, decisionAreaOrder, isDecisionArea, ruleMetricLabel } from "../report/boundedDecisionRules";
import { comparisonBasis } from "../report/comparisonBasis";
import {
  areaStateAt,
  buildDecisionMovement,
  describeGuidanceChange,
  describeMovementCause,
  describeMovementGroup,
  describeStandupStatus,
  type DecisionMovement,
  type MovementGroup,
} from "../report/decisionMovement";
import { formatPoints } from "../report/home/homeSectionModel";
import { DECISION_CONTRACT_LABELS } from "../report/reportCopy";
import { isImprovingSignalDelta } from "../report/reportEvidence";
import {
  buildPublishedBriefPath,
  isHeldPublishedBrief,
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

type AgendaStepId = (typeof MONDAY_AGENDA_STEPS)[number]["id"];
type AreaLines = Parameters<typeof buildDecisionMovement>[0]["areas"][number];
type ScoreMove = { metric: "tightness" | "riskAppetite"; delta: number };

const SCORE_METRICS = ["tightness", "riskAppetite"] as const;

const joinAnd = (items: readonly string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1) ?? ""}`;

const upperFirst = (value: string) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

/** The record's areas with the lines it was frozen with. Records frozen before the lines were data carry none. */
const recordAreaLines = (brief: PublishedBrief): AreaLines[] =>
  brief.decisions.flatMap((decision) =>
    isDecisionArea(decision.area) && ((decision.pause?.length ?? 0) > 0 || (decision.resume?.length ?? 0) > 0)
      ? [{ area: decision.area, pause: decision.pause ?? [], resume: decision.resume ?? [] }]
      : [],
  );

/* What each kind of movement asks of the meeting, after the clause that names it. */
const MOVEMENT_QUESTION: Record<MovementGroup["kind"], string> = {
  paused: "Which commitment already under way there should wait for the restart line?",
  lifted: "Which decision held back by the pause is worth reopening?",
  resumable: "Which decision held back by the pause is ready to restart?",
  resumeLost: "Which plan counted on a restart there, and does it wait now?",
};

const NOTHING_ON_HOLD_QUESTION = "Which decision is waiting on conditions rather than on your own numbers?";

/**
 * One question for the meeting, from what the week changed, most decisive first: an
 * area that paused or restarted, then conditions that changed with no area moving,
 * then the score that moved furthest. A week where nothing moved, or that compared
 * with nothing, asks the standing agenda's own question, which only makes sense while
 * an area is on hold.
 */
const agendaQuestion = ({
  movement,
  scoreMoves,
  window,
  anyOnHold,
}: {
  movement: DecisionMovement | null;
  scoreMoves: readonly ScoreMove[];
  window: string;
  anyOnHold: boolean;
}): string => {
  const [group] = movement?.groups ?? [];
  if (movement && group) {
    return `${upperFirst(window)}, ${describeMovementGroup(group, movement.areas.length)}. ${MOVEMENT_QUESTION[group.kind]}`;
  }
  if (movement?.conditions) return `Which plan still assumes ${movement.conditions.from} conditions?`;
  /* Ties go to funding pressure, the page's order. */
  const largest = scoreMoves.reduce<ScoreMove | undefined>(
    (best, move) => (!best || Math.abs(move.delta) > Math.abs(best.delta) ? move : best),
    undefined,
  );
  if (largest) {
    const keeps = largest.delta > 0 ? "rising" : "falling";
    const fact = `${ruleMetricLabel[largest.metric]} ${largest.delta > 0 ? "rose" : "fell"} ${formatPoints(Math.abs(largest.delta))} ${window}.`;
    return isImprovingSignalDelta(largest.metric, largest.delta)
      ? `${fact} Which decision held back for conditions would you reopen if it keeps ${keeps}?`
      : `${fact} Does every commitment you have planned still fit your runway if it keeps ${keeps}?`;
  }
  const revisit = MONDAY_AGENDA_STEPS.find((step) => step.id === "revisit")?.prompt;
  return anyOnHold && revisit ? revisit : NOTHING_ON_HOLD_QUESTION;
};

/**
 * A frozen week as the Monday review's agenda: the standing steps the hold lists
 * (`MONDAY_AGENDA_STEPS`), each answered from the week's record.
 *
 * What changed is the standup line's status (`describeStandupStatus`) and the lines the
 * scores crossed (`describeMovementCause`), from the decision movement the homepage
 * reads, rebuilt from the record's own scores, earlier reading and area lines. The
 * record stores no thresholds; every week frozen so far was scored against the default
 * lines (70 and 50), which its change line prints. The status is left out where the
 * record compared with a reading but froze no area lines, rather than claim nothing
 * was compared.
 */
export const buildWeekAgenda = (brief: PublishedBrief): string[] => {
  const display = publishedBriefDisplay(brief);
  const areas = recordAreaLines(brief);
  const scores = brief.scores ? { tightness: brief.scores.tightness, riskAppetite: brief.scores.riskAppetite } : null;
  const movement = scores
    ? buildDecisionMovement({ scores, previous: display.previous, thresholds: DEFAULT_THRESHOLDS, regime: brief.regime, areas })
    : null;
  const held = isHeldPublishedBrief(brief);
  const status =
    held || movement || display.previous === null
      ? describeStandupStatus({
          regime: brief.regime,
          change: describeGuidanceChange({ movement, regimeChanged: undefined }),
          policyOverrideActive: held,
        })
      : null;
  const onHold = scores
    ? areas
        .filter((lines) => areaStateAt(lines, scores) === "pause")
        .sort((left, right) => decisionAreaOrder.indexOf(left.area) - decisionAreaOrder.indexOf(right.area))
        .map((lines) => decisionAreaLabel(lines.area))
    : [];
  const holdLine = scores && areas.length > 0 ? (onHold.length > 0 ? `On hold: ${joinAnd(onHold)}.` : "No area is on hold.") : null;
  const basis = comparisonBasis(display.previous?.comparedWith);
  const scoreMoves = SCORE_METRICS.flatMap((metric): ScoreMove[] => {
    const change = display.scoreChange(metric);
    return change ? [{ metric, delta: change.delta }] : [];
  });
  const answers: Record<AgendaStepId, string[]> = {
    changed: [...(status ? [status] : []), ...(movement ? [describeMovementCause(movement)] : [])],
    thresholds: holdLine ? [holdLine] : [],
    revisit: [
      agendaQuestion({ movement, scoreMoves, window: basis.date ? basis.since : "this week", anyOnHold: onHold.length > 0 }),
    ],
  };
  return [
    MONDAY_AGENDA_TITLE,
    ...MONDAY_AGENDA_STEPS.flatMap((step) =>
      answers[step.id].length > 0 ? [step.label, ...answers[step.id].map((answer) => `• ${answer}`)] : [],
    ),
  ];
};

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
      "",
      ...buildWeekAgenda(brief),
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
