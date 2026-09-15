/**
 * What must be true before current-week data may be published.
 *
 * Two writers ask this: `scripts/freezeWeeklyBrief.ts`, which appends to the
 * permanent record, and `scripts/generateWeeklySlackBrief.ts`, which publishes
 * the brief people paste into a channel. Both take live data and stamp it with
 * the current week, so both are wrong in the same way when the data is not live.
 *
 * `data/published_briefs.json` is append-only and citable: a brief someone
 * quoted in a board deck has to still say what it said that day. That makes a
 * bad freeze unfixable in the way that matters — the correction is visible
 * forever, and the archive is the product's proof of cadence.
 *
 * The freeze script used to guard this with `degraded`, which is
 * `!reportResult.ok` — true only when report assembly *fails*. A total live-data
 * outage is not a failure by that definition: every FRED fetch 403s, the loader
 * falls back to the bundled snapshot, and assembly succeeds. Observed on
 * 2026-08-29, that combination froze week 2026-w25 from a 2026-06-17 record
 * date, ten weeks stale, and exited 0. The guard was reading the one flag that
 * does not move when the thing it protects against happens.
 *
 * So readiness is judged on the flags that do move: whether the data is
 * fallback, and whether the record date is recent enough that the week derived
 * from it is actually the week being published.
 */

/**
 * How stale a record date may be and still name the right week to freeze.
 *
 * Matches PUBLISHED_BRIEF_STALE_AFTER_DAYS: the same threshold that decides
 * whether the archive is current enough for the homepage to advertise it should
 * decide whether a reading is current enough to be published as this week.
 */
export const PUBLISH_MAX_RECORD_AGE_DAYS = 10;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Midnight UTC of a moment.
 *
 * Record dates are date-only ("2026-08-19", i.e. midnight), so comparing one
 * against a timestamped clock measures a partial day too: at 04:00 a date ten
 * days back reads as 10.17 days old and a threshold of 10 rejects it. Both
 * sides are floored to their UTC date so the limit means ten calendar days,
 * which is how the threshold reads and how the dates are actually written.
 */
const startOfUtcDay = (value: Date) =>
  Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());

type PublishReadinessInput = {
  /** `!reportResult.ok` — report assembly failed outright. */
  degraded: boolean;
  /** Treasury data came from the bundled snapshot rather than a live fetch. */
  isFallback: boolean;
  /** Explicit liveness flag when the provider sets one. */
  isLive?: boolean | null;
  fallbackReason?: string | null;
  /** The record date the published week would be dated by. */
  recordDate: string;
  now: Date;
};

type PublishReadiness =
  | { ok: true }
  | { ok: false; reason: string };

export const assessPublishReadiness = ({
  degraded,
  isFallback,
  isLive,
  fallbackReason,
  recordDate,
  now,
}: PublishReadinessInput): PublishReadiness => {
  if (degraded) {
    return { ok: false, reason: "Report assembly failed; there is nothing sound to publish." };
  }

  if (isFallback || isLive === false) {
    return {
      ok: false,
      reason: `Data is a fallback snapshot, not a live reading${
        fallbackReason ? ` (${fallbackReason})` : ""
      }. Publishing it would stamp a stale reading with the current week.`,
    };
  }

  const recordTime = Date.parse(recordDate);

  if (!Number.isFinite(recordTime)) {
    return { ok: false, reason: `Record date "${recordDate}" is unreadable; the week cannot be derived from it.` };
  }

  const ageDays = (startOfUtcDay(now) - startOfUtcDay(new Date(recordTime))) / MS_PER_DAY;

  if (ageDays > PUBLISH_MAX_RECORD_AGE_DAYS) {
    return {
      ok: false,
      reason: `Record date ${recordDate} is ${Math.floor(ageDays)} days old (limit ${PUBLISH_MAX_RECORD_AGE_DAYS}). The week derived from it is not the week being published.`,
    };
  }

  // A record date meaningfully ahead of now means a clock or parsing problem,
  // not fresh data, and would file the week under the wrong slug.
  if (ageDays < -1) {
    return { ok: false, reason: `Record date ${recordDate} is in the future; refusing to guess which week it belongs to.` };
  }

  return { ok: true };
};
