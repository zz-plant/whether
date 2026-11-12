/**
 * What must be true before current-week data may be published.
 *
 * Two writers ask this: `scripts/freezeWeeklyBrief.ts`, which appends to the
 * permanent record, and `scripts/generateWeeklySlackBrief.ts`, which writes the
 * Slack brief text. Both take live data and stamp it with the current week, so
 * both are wrong in the same way when the data is not live.
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
 *
 * Fallback covers the macro inputs too. Until 2026-10-14 only the Treasury was
 * asked, so a run where Treasury loaded live and a FRED macro fetch failed
 * passed: the failed series kept its snapshot value, the engine scored it, and
 * the reading went out as this week's.
 */
import type { MacroSeriesReading } from "../types";
import { listCachedLiveMacroSeries } from "./sourceHealth";

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
  /** The macro series the reading was scored with; every fetch-backed one must be live. */
  macroSeries: readonly Pick<MacroSeriesReading, "id" | "label" | "isLive">[];
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
  macroSeries,
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

  const cachedMacro = listCachedLiveMacroSeries(macroSeries);

  if (cachedMacro.length > 0) {
    return {
      ok: false,
      reason: `Macro inputs are snapshot values, not live readings (${cachedMacro.join(", ")}). Publishing them would stamp stale inputs with the current week.`,
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

/* Reads one field of an unparsed JSON body, so an answer of any shape is a refusal and never a throw. */
const fieldOf = (value: unknown, key: string): unknown =>
  typeof value === "object" && value !== null && key in value ? Reflect.get(value, key) : undefined;

/**
 * Whether a freeze's conditions are the ones production's call carries.
 *
 * The conditions are not a function of the reading alone. The engine commits a change of
 * conditions only through the confirmation gate (`advanceRegimeState`), which reads the
 * committed state from KV (`regime:machine-snapshot`) and holds it while a score sits within the
 * near band of its line. `bun run brief:freeze` runs where there is no KV: the loader gets no
 * machine state, and the reading classifies as if nothing had been committed. On 2026-11-12 that
 * froze w46 as Cloudy (risk appetite 53, three points over its line) while production carried
 * Freezing: a reading of 42 on Nov 6 had committed it, and 53 is inside the band that holds it.
 *
 * So the freeze asks production, which runs the gate, and refuses on any disagreement, and when
 * it cannot ask. A different record date is a refusal too: the two would be judging different
 * readings, and the daily refresh closes that gap within a day.
 */
export const assessGovernedRegime = ({
  regime,
  recordDate,
  governed,
}: {
  regime: string;
  recordDate: string;
  /** Production's `/api/agent?view=state` body as fetched, or null when it could not be. */
  governed: unknown;
}): PublishReadiness => {
  const governedRegime = fieldOf(fieldOf(governed, "conditions"), "key");
  const governedRecordDate = fieldOf(governed, "recordDate");
  if (typeof governedRegime !== "string") {
    return {
      ok: false,
      reason: "Production's state could not be read, so the conditions cannot be checked against the confirmation gate this run has no state for.",
    };
  }
  if (governedRecordDate !== recordDate) {
    return {
      ok: false,
      reason: `Production's state is of the reading of ${String(governedRecordDate)}, this run's of ${recordDate}. Retry after the daily refresh, when both read the same record.`,
    };
  }
  if (governedRegime !== regime) {
    return {
      ok: false,
      reason: `This run classifies the reading as ${regime}; production's call, which applies the confirmation gate, is ${governedRegime}. This run has no committed state to confirm against, so it would publish a change of conditions the gate has not confirmed.`,
    };
  }
  return { ok: true };
};
