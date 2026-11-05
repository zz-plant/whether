/**
 * The runway vocabulary an operator can select, and where it lives.
 *
 * Parallel to `operatorStage.ts`, this defines the canonical cash runway bands
 * that scale bounded operating decisions across Whether's surfaces.
 *
 * One setting. The band lives in the `whether-company-runway` cookie, which the
 * server reads to calibrate the guidance; an exact figure entered on /operate
 * lives in the browser profile and moves the band with it. Choosing a band
 * never writes a figure: "12–24 mo" is not "18 months", and writing 18 into
 * the profile used to put an invented runway into the planner and the stress
 * test. (There were two runway settings on `/` until 2026-09-23, with
 * different bands, and neither updated the other.)
 *
 * A band is true on the day it is set, and runway falls every month after, so
 * the cookie carries that day and a read ages the band from it
 * (`ageRunwayBand`). A cookie from before 2026-11-04 has no day, and reads as
 * it was written.
 */

import { formatDateUTC } from "../formatters";
import type { ProfileRunway } from "../operatorProfile";

export type RunwayBand = "critical" | "tight" | "balanced" | "abundant";

type RunwayBandOption = {
  key: RunwayBand;
  label: string;
  sublabel: string;
  months: number;
  /** The band in a sentence: "With 12–24 months of runway…". */
  phrase: string;
  minMonths: number;
  maxMonths: number | null;
};

export const RUNWAY_BAND_OPTIONS: readonly RunwayBandOption[] = [
  /* The sublabels used to be internal band names — "Payback Gate", "Macro Corridor",
     "Counter-Cyclical" — shown to someone picking how much cash they have. They say what the
     band changes now, in the reader's terms. */
  { key: "critical", label: "<6 mo", sublabel: "Cash first", months: 4, phrase: "less than 6 months", minMonths: 0, maxMonths: 6 },
  { key: "tight", label: "6–12 mo", sublabel: "Short payback only", months: 9, phrase: "6–12 months", minMonths: 6, maxMonths: 12 },
  { key: "balanced", label: "12–24 mo", sublabel: "Follow the guidance", months: 18, phrase: "12–24 months", minMonths: 12, maxMonths: 24 },
  { key: "abundant", label: "24+ mo", sublabel: "Room to spend", months: 30, phrase: "more than 24 months", minMonths: 24, maxMonths: null },
];

export const DEFAULT_RUNWAY_BAND: RunwayBand = "balanced";

export const OPERATOR_RUNWAY_COOKIE = "whether-company-runway";
const OPERATOR_RUNWAY_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

const RUNWAY_BANDS: ReadonlySet<string> = new Set(RUNWAY_BAND_OPTIONS.map((opt) => opt.key));

export const isRunwayBand = (value: unknown): value is RunwayBand =>
  typeof value === "string" && RUNWAY_BANDS.has(value);

export const runwayBandLabel = (band: RunwayBand): string =>
  RUNWAY_BAND_OPTIONS.find((opt) => opt.key === band)?.label ?? band;

export const runwayBandSublabel = (band: RunwayBand): string =>
  RUNWAY_BAND_OPTIONS.find((opt) => opt.key === band)?.sublabel ?? "";

export const runwayBandPhrase = (band: RunwayBand): string =>
  RUNWAY_BAND_OPTIONS.find((opt) => opt.key === band)?.phrase ?? runwayBandLabel(band);

/** From the band table, so a moved boundary moves every reader of it. */
export const runwayBandForMonths = (months: number | undefined | null): RunwayBand | null => {
  if (typeof months !== "number" || !Number.isFinite(months) || months <= 0) {
    return null;
  }
  return (
    RUNWAY_BAND_OPTIONS.find((opt) => months >= opt.minMonths && (opt.maxMonths === null || months < opt.maxMonths))?.key ??
    null
  );
};

/** The lowest and highest bands' own boundaries, so a moved boundary moves these too. */
const COVERED_CUSHION_FLOOR_MONTHS = RUNWAY_BAND_OPTIONS.find((opt) => opt.key === "critical")?.maxMonths ?? 6;
const ABUNDANT_FLOOR_MONTHS = RUNWAY_BAND_OPTIONS.find((opt) => opt.maxMonths === null)?.minMonths ?? 24;

/**
 * The band an operator's own figures put them in, or null when they state no
 * runway. A company whose revenue covers its spending has no runway counting
 * down, so it never reads as short of cash: not "less than 6 months… cash is
 * what limits you" beside "cash is not running down" (2026-10-01).
 *
 * Nor does covering spending alone earn the band with no ceiling, which tells a
 * reader to use the cushion. $20k in the bank, $80k of spend and $80.5k of
 * revenue falling 10% a month was told to "recruit senior talent" until
 * 2026-11-04. That band needs a balance that would carry six months of spending
 * and revenue that still covers spending at the end of the band's 24 months.
 * Short of either, the company sits in the band that leaves the guidance as
 * written.
 */
export const runwayBandForProfileRunway = (runway: ProfileRunway | null): RunwayBand | null => {
  if (!runway) return null;
  if (runway.basis === "cash-flow-positive") return coveredRunwayIsCushioned(runway) ? "abundant" : "balanced";
  const band = runwayBandForMonths(runway.months);
  return band === "abundant" && runway.basis === "cash" && runway.debtLimitsRunway ? "balanced" : band;
};

const coveredRunwayIsCushioned = ({ cushionMonths, coveredForMonths, debtLimitsRunway }: Extract<ProfileRunway, { basis: "cash-flow-positive" }>): boolean =>
  !debtLimitsRunway
  && cushionMonths !== undefined
  && cushionMonths >= COVERED_CUSHION_FLOOR_MONTHS
  && (coveredForMonths === undefined || coveredForMonths >= ABUNDANT_FLOOR_MONTHS);

/** True when revenue covers spending but the figures fall short of the band with no ceiling. */
export const isThinlyCoveredRunway = (runway: ProfileRunway | null): boolean =>
  runway?.basis === "cash-flow-positive" && !coveredRunwayIsCushioned(runway);

/**
 * The band an edit to the operator's figures moves the cookie to, or null to
 * leave the cookie alone: when the runway did not move, or when it went away —
 * clearing a figure is not choosing a runway.
 */
export const runwayBandForProfileEdit = (before: ProfileRunway | null, after: ProfileRunway | null): RunwayBand | null => {
  const reading = (runway: ProfileRunway | null) =>
    runway === null ? "none" : runway.basis === "cash-flow-positive" ? `covered:${coveredRunwayIsCushioned(runway)}` : String(runway.months);
  return reading(before) === reading(after) ? null : runwayBandForProfileRunway(after);
};

/** A band wins over a figure; a figure alone is banded; neither is null. */
export const resolveRunwayBand = (
  band: RunwayBand | null | undefined,
  months?: number | null,
): RunwayBand | null => band ?? runwayBandForMonths(months);

export const monthsForRunwayBand = (band: RunwayBand): number =>
  RUNWAY_BAND_OPTIONS.find((opt) => opt.key === band)?.months ?? 18;

const DAYS_PER_MONTH = 30.44;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * The band a band set on `setOn` has reached by `now`, if nothing has changed:
 * its representative months less the months since. It moves only ever down, and
 * a reader told to expect it can correct it in one click (`describeRunwayBandAge`).
 * No date, or one in the future, leaves the band as it was set.
 *
 * An estimate stops at the 6–12 band. Under six months the guidance says "hold every
 * new commitment whatever this week's guidance says", which only a stated figure can
 * justify: a 6–12 band reached it about three months on, for a reader who may have raised.
 */
export const ageRunwayBand = (band: RunwayBand, setOn: string | null | undefined, now: Date = new Date()): RunwayBand => {
  if (!setOn) return band;
  const elapsedMonths = (now.getTime() - Date.parse(setOn)) / MS_PER_DAY / DAYS_PER_MONTH;
  if (!Number.isFinite(elapsedMonths) || elapsedMonths <= 0) return band;
  const aged = runwayBandForMonths(monthsForRunwayBand(band) - elapsedMonths) ?? "critical";
  return aged === "critical" && band !== "critical" ? "tight" : aged;
};

/** The band a reader set, its day, and where it has aged to. Present only once it has moved. */
export type RunwayBandAge = { chosen: RunwayBand; setOn: string; band: RunwayBand };

/** One sentence for the reader, so a band they did not pick never reads as one they did. */
export const describeRunwayBandAge = ({ chosen, setOn, band }: RunwayBandAge): string =>
  `Your runway was ${runwayBandPhrase(chosen)} on ${formatDateUTC(setOn)}, so this now assumes ${runwayBandPhrase(band)}.`;

const readCookieValue = (cookieHeader: string, name: string): string | null => {
  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rest] = part.split("=");
    if (rawKey?.trim() !== name) continue;
    try {
      return decodeURIComponent(rest.join("=").trim());
    } catch {
      return null;
    }
  }
  return null;
};

const SET_ON_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** `tight:2026-11-04`, or a bare `tight` from before the day was kept or from a band figures earned. */
const readStoredRunway = (cookieHeader: string | null | undefined): { band: RunwayBand; setOn: string | null } | null => {
  if (!cookieHeader) return null;
  const [band, setOn] = (readCookieValue(cookieHeader, OPERATOR_RUNWAY_COOKIE) ?? "").split(":");
  if (!isRunwayBand(band)) return null;
  return { band, setOn: setOn && SET_ON_PATTERN.test(setOn) ? setOn : null };
};

/** The band the guidance scales to: the one stored, aged from the day it was set. */
export const readOperatorRunwayCookie = (cookieHeader: string | null | undefined, now: Date = new Date()): RunwayBand | null => {
  const stored = readStoredRunway(cookieHeader);
  return stored ? ageRunwayBand(stored.band, stored.setOn, now) : null;
};

/**
 * True for a stored band with no day: one earned by revenue covering spending, or
 * one from before the day was kept. A subscription carries this, or the email
 * would count down from the day they subscribed a band the site leaves alone.
 */
export const isUndatedRunwayCookie = (cookieHeader: string | null | undefined): boolean => {
  const stored = readStoredRunway(cookieHeader);
  return stored !== null && stored.setOn === null;
};

export const readRunwayBandAge = (cookieHeader: string | null | undefined, now: Date = new Date()): RunwayBandAge | null => {
  const stored = readStoredRunway(cookieHeader);
  if (!stored?.setOn) return null;
  const band = ageRunwayBand(stored.band, stored.setOn, now);
  return band === stored.band ? null : { chosen: stored.band, setOn: stored.setOn, band };
};

export const parseOperatorRunwayParam = (value: string | null | undefined): RunwayBand | null => {
  const trimmed = value?.trim().toLowerCase();
  if (!trimmed) return null;
  if (isRunwayBand(trimmed)) return trimmed;

  const num = Number.parseFloat(trimmed);
  if (Number.isFinite(num) && num > 0) {
    return runwayBandForMonths(num);
  }
  return null;
};

/**
 * `setOn` is the day the band was stated, and null for one that does not age: a
 * band earned by revenue covering spending counts no runway down.
 */
export const buildOperatorRunwayCookie = (band: RunwayBand | null, setOn: Date | null = new Date()): string => {
  const maxAge = band ? OPERATOR_RUNWAY_COOKIE_MAX_AGE_SECONDS : 0;
  const value = band && setOn ? `${band}:${setOn.toISOString().slice(0, 10)}` : band ?? "";
  return `${OPERATOR_RUNWAY_COOKIE}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
};
