import { nextWeeklyCallDue } from "../agentState";
import { formatIsoWeekSlug, getIsoWeekInfo } from "../isoWeek";
import { getRegimePublicLabel } from "../regimePresentation";
import { decisionAreaLabel, decisionAreaOrder, isDecisionArea, type DecisionArea } from "../report/boundedDecisionRules";
import { areaMovementKind, areaStateAt, type AreaMovementKind, type AreaState } from "../report/decisionMovement";
import {
  buildPublishedBriefPath,
  findUnpublishedWeeks,
  getPublishedBriefs,
  publishedBriefHeadline,
  publishedBriefModifiedAt,
  weekMonday,
  type PublishedBrief,
} from "../report/publishedBriefs";
import { buildUseConstraint } from "../report/useConstraint";
import { buildCanonicalUrl } from "../seo";

/**
 * What changed in the published call since a week an agent last saw.
 *
 * An agent that runs on a schedule wants to act only when the call changed, and `get_state`
 * answers what the call is, not whether it moved since the agent last looked: its `change`
 * compares with the previous month-end, not with the agent's last visit. This answers from the
 * frozen weekly records (`data/published_briefs.json`), the calls as published, so a week the
 * agent saw cannot be rewritten under it.
 *
 * A change is structured, never a difference in wording: the record's sentences were reworded
 * between weeks (w44 "keep spend flexible", w45 "Only backfills and critical hires" for the same
 * call), so comparing text would report changes nobody made. Two things count: the conditions
 * (the regime), and an area's state against its own numeric lines, through the same rule the
 * brief's decision movement uses (`areaStateAt`). A week whose record stores no lines or no
 * scores has no area states, and its areas are not compared.
 */

/** With no `since`, how many of the newest weeks to return. */
const DEFAULT_WEEKS = 8;

type AreaStanding = { area: DecisionArea; state: AreaState };

type AreaChange = { area: DecisionArea; from: AreaState; to: AreaState; moved: Exclude<AreaMovementKind, "held"> };

const areaStandings = (brief: PublishedBrief): AreaStanding[] => {
  const scores = brief.scores;
  if (!scores) return [];
  return brief.decisions
    .filter((decision): decision is typeof decision & { area: DecisionArea } => isDecisionArea(decision.area))
    .filter((decision) => (decision.pause?.length ?? 0) > 0)
    .map((decision) => ({
      area: decision.area,
      state: areaStateAt({ pause: decision.pause ?? [], resume: decision.resume ?? [] }, scores),
    }))
    .sort((left, right) => decisionAreaOrder.indexOf(left.area) - decisionAreaOrder.indexOf(right.area));
};

const compareWeeks = (earlier: PublishedBrief | undefined, later: PublishedBrief) => {
  if (!earlier) return null;
  const before = new Map(areaStandings(earlier).map((standing) => [standing.area, standing.state]));
  const areas: AreaChange[] = areaStandings(later).flatMap(({ area, state }) => {
    const from = before.get(area);
    if (from === undefined || from === state) return [];
    const moved = areaMovementKind(from, state);
    return moved === "held" ? [] : [{ area, from, to: state, moved }];
  });
  return {
    comparedWith: earlier.slug,
    conditions:
      earlier.regime === later.regime
        ? null
        : { from: getRegimePublicLabel(earlier.regime), to: getRegimePublicLabel(later.regime), fromKey: earlier.regime, toKey: later.regime },
    areas,
  };
};

const weekEntry = (brief: PublishedBrief, previous: PublishedBrief | undefined) => {
  const changes = compareWeeks(previous, brief);
  return {
    slug: brief.slug,
    recordDate: brief.recordDate,
    publishedAt: brief.publishedAt,
    regime: brief.regime,
    conditions: getRegimePublicLabel(brief.regime),
    actionNow: publishedBriefHeadline(brief).action,
    scores: brief.scores ? { tightness: brief.scores.tightness, riskAppetite: brief.scores.riskAppetite } : null,
    areas: areaStandings(brief),
    /** Against the published week before it; null for the first week on record. */
    changes,
    changed: changes !== null && (changes.conditions !== null || changes.areas.length > 0),
    /** Set when the record was corrected after it was published, per the corrections policy. */
    correction: brief.correction,
    permalink: buildCanonicalUrl(buildPublishedBriefPath(brief.slug)),
  };
};

type WeekEntry = ReturnType<typeof weekEntry>;

const weekStart = (slug: string) => weekMonday(slug)?.getTime() ?? null;

const MOVEMENT_WORDS: Record<AreaChange["moved"], string> = {
  paused: "pause began",
  lifted: "pause lifted",
  resumable: "restart lines met",
  resumeLost: "restart lines no longer met",
};

/** The sentence a scheduled agent can log or forward as is. */
const summarize = (since: string | null, baseline: PublishedBrief | null, weeks: readonly WeekEntry[]): string => {
  if (since !== null && baseline === null) {
    return `${since} is before the first published week, so there is nothing to compare it with; the weeks listed are every published week.`;
  }
  const changed = weeks.filter((week) => week.changed);
  const from = baseline ? `since ${baseline.slug}` : "in these weeks";
  if (weeks.length === 0) return `No week has been published ${from}.`;
  if (changed.length === 0) return `The call has not changed ${from}: ${weeks.length} published week${weeks.length === 1 ? "" : "s"}, the same conditions and the same area states.`;
  const parts = changed.map((week) => {
    const clauses = [
      ...(week.changes?.conditions ? [`conditions ${week.changes.conditions.from} to ${week.changes.conditions.to}`] : []),
      ...(week.changes?.areas ?? []).map((change) => `${decisionAreaLabel(change.area)} ${MOVEMENT_WORDS[change.moved]}`),
    ];
    return `${week.slug}: ${clauses.join(", ")}`;
  });
  return `The call changed ${from}. ${parts.join("; ")}.`;
};

/** Thrown for a `since` that is not a week; the route answers 400 and the tool a refusal. */
export class InvalidSinceWeekError extends Error {
  constructor(since: string) {
    super(`since must be a week slug like 2026-w41; got ${JSON.stringify(since)}.`);
    this.name = "InvalidSinceWeekError";
  }
}

export const buildPublishedChanges = ({
  since,
  briefs = getPublishedBriefs(),
  now = new Date(),
}: {
  since?: string | null;
  briefs?: readonly PublishedBrief[];
  now?: Date;
}) => {
  const sinceSlug = since ? since.trim().toLowerCase() : null;
  const sinceStart = sinceSlug === null ? null : weekStart(sinceSlug);
  if (sinceSlug !== null && sinceStart === null) throw new InvalidSinceWeekError(since ?? "");

  /* Oldest first, so each week is compared with the one published before it. A record whose
     slug names no week has no place in the order, and is left out rather than sorted first. */
  const dated = briefs.flatMap((brief) => {
    const start = weekStart(brief.slug);
    return start === null ? [] : [{ brief, start }];
  });
  const chronological = dated.sort((left, right) => left.start - right.start).map(({ brief }) => brief);
  const entries = chronological.map((brief, index) => ({ brief, entry: weekEntry(brief, chronological[index - 1]) }));

  const baseline =
    sinceStart === null ? null : ([...chronological].reverse().find((brief) => (weekStart(brief.slug) ?? 0) <= sinceStart) ?? null);
  const weeks =
    sinceStart === null
      ? entries.slice(-DEFAULT_WEEKS).map(({ entry }) => entry)
      : entries.filter(({ brief }) => (weekStart(brief.slug) ?? 0) > sinceStart).map(({ entry }) => entry);

  const latest = chronological.at(-1);
  /* `changed` answers "did anything change since the week I gave": null without one, or when
     that week predates the record and there is nothing to have changed from. */
  const changed = sinceSlug === null || baseline === null ? null : weeks.some((week) => week.changed);
  /* `findUnpublishedWeeks` lists every week strictly between two slugs; it is meant for adjacent
     records, so the published weeks in between are taken out here. */
  const published = new Set(chronological.map((brief) => brief.slug));
  const missing = baseline && latest && baseline.slug !== latest.slug ? findUnpublishedWeeks(baseline, latest).filter((week) => !published.has(week)) : [];
  const thisWeek = formatIsoWeekSlug(getIsoWeekInfo(now));
  const awaitingThisWeek = latest ? latest.slug !== thisWeek : true;
  /* This week's brief is due Monday 14:00 UTC and has often landed later in the week. Past that
     time and still missing, the next call is overdue, and `nextCallDue` (next Monday) would send a
     scheduled agent to sleep through it. */
  const thisWeekDue = (weekStart(thisWeek) ?? now.getTime()) + 14 * 60 * 60 * 1000;
  const overdue = awaitingThisWeek && now.getTime() >= thisWeekDue;
  /* A correction to a week the caller has already seen is written into that week's record, which
     no week after `since` carries; these are the ones corrected after the baseline was published. */
  const correctedSince = baseline
    ? chronological
        .filter((brief) => (weekStart(brief.slug) ?? 0) <= (weekStart(baseline.slug) ?? 0) && brief.correction)
        .filter((brief) => publishedBriefModifiedAt(brief) > baseline.publishedAt)
        .map((brief) => ({ slug: brief.slug, correctedAt: publishedBriefModifiedAt(brief), correction: brief.correction }))
    : [];
  const summaryParts = [
    summarize(sinceSlug, baseline, weeks),
    ...(correctedSince.length > 0 ? [`Corrected since: ${correctedSince.map((entry) => entry.slug).join(", ")}.`] : []),
    ...(overdue ? [`This week's brief (${thisWeek}) is due and not published yet; check again daily until it is.`] : []),
  ];

  return {
    type: "published_changes" as const,
    since: sinceSlug,
    /** The published week the comparison starts from: `since` itself, or the last one published before it. */
    baseline: baseline ? { slug: baseline.slug, recordDate: baseline.recordDate, conditions: getRegimePublicLabel(baseline.regime) } : null,
    changed,
    summary: summaryParts.join(" "),
    latest: latest ? { slug: latest.slug, recordDate: latest.recordDate, conditions: getRegimePublicLabel(latest.regime) } : null,
    /** Pass this as `since` next time. */
    nextSince: latest?.slug ?? sinceSlug,
    /** Published after `since`, oldest first; with no `since`, the newest eight. */
    weeks,
    /** Weeks between `since` and the latest that have no published brief. */
    unpublishedWeeks: missing.filter((week) => sinceStart === null || (weekStart(week) ?? 0) > sinceStart),
    /** Weeks at or before the baseline whose record was corrected after the baseline was published. */
    correctedSince,
    thisWeek,
    /** The current week has no brief yet. */
    awaitingThisWeek,
    /** This week's brief was due (Monday 14:00 UTC) and is not published: check again daily, not at `nextCallDue`. */
    overdue,
    /** The next scheduled publication after now. */
    nextCallDue: nextWeeklyCallDue(now),
    use: buildUseConstraint(),
  };
};
