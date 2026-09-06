/**
 * The figures an operator has told Whether about their own company, kept in
 * the browser and shared by every surface that needs a number.
 *
 * The runway planner, the plan stress test on the brief, and the stress test
 * on Planning each used to hold their own copy of runway and burn — the
 * planner reset to a fictional company on every visit, and the two testers
 * disagreed on which runway options even existed. One stored shape, one parse,
 * and a blank field means "not given", never zero.
 *
 * This is deliberately not a company model. It holds the handful of numbers
 * the engines already divide by, and nothing the product does not consume.
 */
import type { PlannerSector } from "./report/runwayPlanner";

export const OPERATOR_PROFILE_STORAGE_KEY = "whether.operatorProfile";
export const OPERATOR_PROFILE_VERSION = 1;

export type OperatorProfileNumberKey =
  | "runwayMonths"
  | "monthlyBurnUsd"
  | "monthlyRevenueUsd"
  | "monthlyGrowthPct";

export type OperatorProfile = {
  version: typeof OPERATOR_PROFILE_VERSION;
  runwayMonths?: number;
  monthlyBurnUsd?: number;
  monthlyRevenueUsd?: number;
  /** Month-over-month revenue growth, in percent. */
  monthlyGrowthPct?: number;
  sector?: PlannerSector;
  updatedAt?: string;
};

export const EMPTY_OPERATOR_PROFILE: OperatorProfile = Object.freeze({ version: OPERATOR_PROFILE_VERSION });

/** Beyond these a value is a typo or a units mix-up, and is dropped rather than clamped. */
export const OPERATOR_PROFILE_LIMITS: Record<OperatorProfileNumberKey, { min: number; max: number }> = {
  runwayMonths: { min: 0, max: 240 },
  monthlyBurnUsd: { min: 0, max: 1e10 },
  monthlyRevenueUsd: { min: 0, max: 1e10 },
  monthlyGrowthPct: { min: -100, max: 300 },
};

const NUMBER_KEYS: readonly OperatorProfileNumberKey[] = [
  "runwayMonths",
  "monthlyBurnUsd",
  "monthlyRevenueUsd",
  "monthlyGrowthPct",
];

const PLANNER_SECTORS: ReadonlySet<string> = new Set(["b2b-saas", "consumer", "infrastructure"]);

export const isPlannerSector = (value: unknown): value is PlannerSector =>
  typeof value === "string" && PLANNER_SECTORS.has(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const withinLimits = (key: OperatorProfileNumberKey, value: unknown): value is number =>
  typeof value === "number"
  && Number.isFinite(value)
  && value >= OPERATOR_PROFILE_LIMITS[key].min
  && value <= OPERATOR_PROFILE_LIMITS[key].max;

/**
 * Reads a stored profile of any shape. Fields that are missing, the wrong
 * type, or outside their limits are dropped one at a time, so a corrupted
 * entry costs one number rather than the whole profile.
 */
export const parseOperatorProfile = (value: unknown): OperatorProfile => {
  if (!isRecord(value)) return EMPTY_OPERATOR_PROFILE;
  const record = value;
  const profile: OperatorProfile = { version: OPERATOR_PROFILE_VERSION };

  for (const key of NUMBER_KEYS) {
    const candidate = record[key];
    if (withinLimits(key, candidate)) profile[key] = candidate;
  }
  if (isPlannerSector(record.sector)) profile.sector = record.sector;
  if (typeof record.updatedAt === "string") profile.updatedAt = record.updatedAt;

  return profile;
};

export const setOperatorProfileField = <K extends keyof OperatorProfile>(
  current: unknown,
  key: K,
  value: OperatorProfile[K] | undefined,
  now: Date = new Date(),
): OperatorProfile => {
  const next: OperatorProfile = { ...parseOperatorProfile(current), updatedAt: now.toISOString() };
  if (value === undefined) {
    delete next[key];
  } else {
    next[key] = value;
  }
  return next;
};

const NUMBER_PATTERN = /-?\d+(?:\.\d+)?/;

/**
 * Reads a plain number out of a field where the label already names the unit
 * ("Runway (months)", "growth (%)"). Tolerates the unit being typed again —
 * "14 months", "12%" — and returns null for anything without a number in it.
 */
export const parsePlainNumberInput = (raw: string): number | null => {
  const text = (raw ?? "").replace(/,/g, "").trim();
  if (!text) return null;
  const match = NUMBER_PATTERN.exec(text);
  if (!match) return null;
  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

const compactUsd = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** The text a stored value shows in its field; money shows grouped digits, everything else as typed. */
export const formatOperatorProfileValue = (key: OperatorProfileNumberKey, value: number | undefined): string => {
  if (value === undefined) return "";
  if (key === "monthlyBurnUsd" || key === "monthlyRevenueUsd") return compactUsd.format(value);
  return String(value);
};
