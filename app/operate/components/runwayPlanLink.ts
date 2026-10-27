/**
 * A runway plan you can send someone.
 *
 * The planner's figures live in the operator profile, which is local storage,
 * so a plan existed only in the browser that typed it. That is the wrong home
 * for the one output on this page whose whole point is to be taken to a board
 * meeting — the panel already builds a memo and offers to copy it, and the
 * memo's figures were unreachable from the link beside it.
 *
 * The scenario studio next to it has had `?rate=` and `?slope=` since it was
 * written, and `/history/compare` takes its two months from the URL. This is
 * the tool that was left out.
 *
 * Precedence is stated once, in render, rather than resolved by whichever
 * effect runs last — the rule `thresholdsPanel` paid for: **the link wins where
 * it speaks, and the stored profile fills the rest.** A link therefore shows
 * the sender's plan without overwriting the recipient's saved figures, and
 * editing any field writes both, so the link always reflects what is on screen.
 */
import {
  isPlannerSector,
  MAX_PAYBACK_PROJECTS,
  OPERATOR_PROFILE_LIMITS,
  PAYBACK_PROJECT_NUMBER_KEYS,
  parsePaybackProjects,
  type OperatorProfile,
  type OperatorProfileNumberKey,
  type PaybackProjectEntry,
} from "../../../lib/operatorProfile";

import { DEFAULT_OPERATOR_STAGE, isOperatorStage, type OperatorStage } from "../../../lib/report/operatorStage";

/** Short names, because this ends up in something a person pastes into Slack. */
const NUMBER_PARAMS: Record<OperatorProfileNumberKey, string> = {
  cashUsd: "cash",
  runwayMonths: "runway",
  monthlyBurnUsd: "burn",
  monthlyRevenueUsd: "revenue",
  monthlyGrowthPct: "growth",
  grossMarginPct: "margin",
  raiseAtRunwayMonths: "raiseAt",
  hiringPauseAtRunwayMonths: "hirePauseAt",
  engineerWeekCostUsd: "engWeek",
};

/* Iterated instead of `Object.keys`, which widens to string and then needs a
   cast back on every use — the kind of assertion `review:hotspot-preflight`
   exists to keep out of a parser reading a URL someone else wrote. */
const NUMBER_KEYS: readonly OperatorProfileNumberKey[] = [
  "cashUsd",
  "runwayMonths",
  "monthlyBurnUsd",
  "monthlyRevenueUsd",
  "monthlyGrowthPct",
  "grossMarginPct",
  "raiseAtRunwayMonths",
  "hiringPauseAtRunwayMonths",
  "engineerWeekCostUsd",
];

/* `isPlannerSector` and `isOperatorStage` are the guards the select controls
   already use, so a link cannot accept a value the dropdown beside it would
   refuse — which is the way a URL becomes the one path around a validator. */

const SECTOR_PARAM = "sector";
const STAGE_PARAM = "stage";

/*
 * One `project` per row of the planner's project list, in its order:
 * `weeks_engineers_hours_hourly_other_name`, a blank between underscores for
 * a figure not given. An underscore because a URL leaves it as typed, where a
 * tilde comes out as `%7E` in the link people paste. Figures first and the name
 * last, so a name with an underscore in it costs nothing. An empty row is written too: it is one the reader just
 * added, and a link that dropped it would take it off their screen, since the
 * link wins over the stored list where it speaks.
 */
const PROJECT_PARAM = "project";
const PROJECT_SEPARATOR = "_";

/*
 * The whole value is the number, or it is not one. `parseFloat` read the digits
 * off the front and dropped the rest, so a hand-edited `?cash=2.1M` was $2.10 of
 * cash and `?runway=14months` passed as 14. A link the app builds is a plain
 * `String(value)`, which this always reads back; money also takes the k/M/B
 * shorthand the money boxes accept, since that is how a person edits one.
 */
const PLAIN_NUMBER = /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i;
const SUFFIXED_MONEY = /^(\d+(?:\.\d+)?)([kmb])$/i;
const MONEY_KEYS: ReadonlySet<OperatorProfileNumberKey> = new Set([
  "cashUsd",
  "monthlyBurnUsd",
  "monthlyRevenueUsd",
  "engineerWeekCostUsd",
]);
const MONEY_SUFFIXES: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9 };

const readLinkNumber = (key: OperatorProfileNumberKey, raw: string): number | null => {
  const text = raw.trim();
  if (PLAIN_NUMBER.test(text)) return Number(text);
  const suffixed = MONEY_KEYS.has(key) ? SUFFIXED_MONEY.exec(text) : null;
  const multiplier = suffixed?.[2] ? MONEY_SUFFIXES[suffixed[2].toLowerCase()] : undefined;
  return suffixed?.[1] && multiplier !== undefined ? Number(suffixed[1]) * multiplier : null;
};

/* Each figure is checked against the project limits by `parsePaybackProjects`,
   the same parse a stored row goes through. */
const readLinkProject = (raw: string): Record<string, unknown> => {
  const parts = raw.split(PROJECT_SEPARATOR);
  const project: Record<string, unknown> = { name: parts.slice(PAYBACK_PROJECT_NUMBER_KEYS.length).join(PROJECT_SEPARATOR) };
  PAYBACK_PROJECT_NUMBER_KEYS.forEach((key, index) => {
    const text = (parts[index] ?? "").trim();
    if (PLAIN_NUMBER.test(text)) project[key] = Number(text);
  });
  return project;
};

const writeLinkProject = (project: PaybackProjectEntry): string =>
  [
    ...PAYBACK_PROJECT_NUMBER_KEYS.map((key) => {
      const value = project[key];
      return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
    }),
    project.name ?? "",
  ].join(PROJECT_SEPARATOR);

type SharedRunwayPlan = {
  profile: Partial<OperatorProfile>;
  stage: OperatorStage | null;
};

/**
 * What a link asks for, dropping anything it cannot mean.
 *
 * A figure outside the profile's own limits is a typo or a units mix-up, and
 * `lib/operatorProfile` already refuses to store one — a link must not be a way
 * around that, or a pasted URL becomes the one path by which a nonsense burn
 * rate reaches a board memo.
 */
export const readSharedRunwayPlan = (params: URLSearchParams | null): SharedRunwayPlan => {
  const profile: Partial<OperatorProfile> = {};
  if (!params) return { profile, stage: null };

  for (const numberKey of NUMBER_KEYS) {
    const raw = params.get(NUMBER_PARAMS[numberKey]);
    if (raw === null) continue;

    const parsed = readLinkNumber(numberKey, raw);
    if (parsed === null || !Number.isFinite(parsed)) continue;
    const limits = OPERATOR_PROFILE_LIMITS[numberKey];
    if (parsed < limits.min || parsed > limits.max) continue;
    profile[numberKey] = parsed;
  }

  const sector = params.get(SECTOR_PARAM);
  if (sector && isPlannerSector(sector)) profile.sector = sector;

  const projects = params.getAll(PROJECT_PARAM);
  if (projects.length > 0) profile.paybackProjects = parsePaybackProjects(projects.slice(0, MAX_PAYBACK_PROJECTS).map(readLinkProject));

  const stage = params.get(STAGE_PARAM);
  return { profile, stage: stage && isOperatorStage(stage) ? stage : null };
};

/**
 * The query string for a plan as it currently stands.
 *
 * Omits anything not entered, so a half-filled planner produces a short link
 * rather than one asserting zeros nobody typed — the same reason the panel
 * refuses to size a plan until the three required figures are there.
 */
export const buildSharedRunwayPlanQuery = (profile: OperatorProfile, stage: OperatorStage | null): string => {
  const params = new URLSearchParams();

  for (const numberKey of NUMBER_KEYS) {
    const value = profile[numberKey];
    if (typeof value === "number" && Number.isFinite(value)) {
      params.set(NUMBER_PARAMS[numberKey], String(value));
    }
  }

  if (profile.sector) params.set(SECTOR_PARAM, profile.sector);
  for (const project of profile.paybackProjects ?? []) params.append(PROJECT_PARAM, writeLinkProject(project));
  if (stage && stage !== DEFAULT_OPERATOR_STAGE) params.set(STAGE_PARAM, stage);

  return params.toString();
};

/**
 * The link's figures over the stored ones, with neither mutating the other.
 *
 * Cash and runway are one answer given two ways, so a link that speaks to
 * either replaces both: a sender's runway beside the recipient's own cash
 * would size the plan on the recipient's balance under the sender's name.
 */
export const resolveSharedRunwayProfile = (
  stored: OperatorProfile,
  shared: Partial<OperatorProfile>,
): OperatorProfile => {
  const linkSetsRunway = shared.cashUsd !== undefined || shared.runwayMonths !== undefined;
  const base: OperatorProfile = linkSetsRunway ? { ...stored, cashUsd: undefined, runwayMonths: undefined } : stored;
  return { ...base, ...shared };
};

/**
 * Whether an edit made in the planner still stands over the address bar.
 *
 * `queries` is every address the planner has written since the edit began,
 * starting with the one on screen when it did. The edit stands while the bar
 * shows one it wrote before the last: the round trip has not landed, and that
 * older link is not the plan. It is done once the bar shows the last, which says
 * the same thing; and an address it never wrote is someone else's link, which
 * wins as any link does.
 */
export const plannerEditStands = (queries: readonly string[], currentQuery: string): boolean =>
  queries.includes(currentQuery) && queries.at(-1) !== currentQuery;
