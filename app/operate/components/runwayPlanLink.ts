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
  OPERATOR_PROFILE_LIMITS,
  type OperatorProfile,
  type OperatorProfileNumberKey,
} from "../../../lib/operatorProfile";

import { DEFAULT_OPERATOR_STAGE, isOperatorStage, type OperatorStage } from "../../../lib/report/operatorStage";

/** Short names, because this ends up in something a person pastes into Slack. */
const NUMBER_PARAMS: Record<OperatorProfileNumberKey, string> = {
  runwayMonths: "runway",
  monthlyBurnUsd: "burn",
  monthlyRevenueUsd: "revenue",
  monthlyGrowthPct: "growth",
  grossMarginPct: "margin",
};

/* Iterated instead of `Object.keys`, which widens to string and then needs a
   cast back on every use — the kind of assertion `review:hotspot-preflight`
   exists to keep out of a parser reading a URL someone else wrote. */
const NUMBER_KEYS: readonly OperatorProfileNumberKey[] = [
  "runwayMonths",
  "monthlyBurnUsd",
  "monthlyRevenueUsd",
  "monthlyGrowthPct",
  "grossMarginPct",
];

/* `isPlannerSector` and `isOperatorStage` are the guards the select controls
   already use, so a link cannot accept a value the dropdown beside it would
   refuse — which is the way a URL becomes the one path around a validator. */

const SECTOR_PARAM = "sector";
const STAGE_PARAM = "stage";

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

    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed)) continue;
    const limits = OPERATOR_PROFILE_LIMITS[numberKey];
    if (parsed < limits.min || parsed > limits.max) continue;
    profile[numberKey] = parsed;
  }

  const sector = params.get(SECTOR_PARAM);
  if (sector && isPlannerSector(sector)) profile.sector = sector;

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
  if (stage && stage !== DEFAULT_OPERATOR_STAGE) params.set(STAGE_PARAM, stage);

  return params.toString();
};

/** The link's figures over the stored ones, with neither mutating the other. */
export const resolveSharedRunwayProfile = (
  stored: OperatorProfile,
  shared: Partial<OperatorProfile>,
): OperatorProfile => ({ ...stored, ...shared });
