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
const OPERATOR_PROFILE_VERSION = 1;

export type OperatorProfileNumberKey =
  | "cashUsd"
  | "runwayMonths"
  | "monthlyBurnUsd"
  | "monthlyRevenueUsd"
  | "monthlyGrowthPct"
  | "grossMarginPct";

export type OperatorProfile = {
  version: typeof OPERATOR_PROFILE_VERSION;
  /**
   * Cash in the bank. The figure a founder without a finance lead can read off
   * their bank app, where runway is one somebody has to work out: with spend in,
   * `resolveProfileRunway` does that. It and an entered `runwayMonths` are two
   * answers to one question, so entering either clears the other.
   */
  cashUsd?: number;
  runwayMonths?: number;
  /** Total monthly spend (gross burn). What cash falls by is this less revenue: `netMonthlyBurnUsd`. */
  monthlyBurnUsd?: number;
  monthlyRevenueUsd?: number;
  /** Month-over-month revenue growth, in percent. */
  monthlyGrowthPct?: number;
  /** Gross margin percentage (0 to 100). */
  grossMarginPct?: number;
  sector?: PlannerSector;
  updatedAt?: string;
};

export const EMPTY_OPERATOR_PROFILE: OperatorProfile = Object.freeze({ version: OPERATOR_PROFILE_VERSION });

/** Beyond these a value is a typo or a units mix-up, and is dropped rather than clamped. */
export const OPERATOR_PROFILE_LIMITS: Record<OperatorProfileNumberKey, { min: number; max: number }> = {
  cashUsd: { min: 0, max: 1e12 },
  runwayMonths: { min: 0, max: 240 },
  monthlyBurnUsd: { min: 0, max: 1e10 },
  monthlyRevenueUsd: { min: 0, max: 1e10 },
  monthlyGrowthPct: { min: -100, max: 300 },
  grossMarginPct: { min: 0, max: 100 },
};

const NUMBER_KEYS: readonly OperatorProfileNumberKey[] = [
  "cashUsd",
  "runwayMonths",
  "monthlyBurnUsd",
  "monthlyRevenueUsd",
  "monthlyGrowthPct",
  "grossMarginPct",
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
    // One runway: a cash figure and a typed runway would disagree about the same company.
    if (key === "cashUsd") delete next.runwayMonths;
    if (key === "runwayMonths") delete next.cashUsd;
  }
  return next;
};

/**
 * What the bank balance falls by each month: spend less revenue. Negative when
 * revenue covers spending. Undefined until spend is given.
 *
 * `monthlyBurnUsd` is total spend — the runway planner subtracts revenue from
 * it — and until 2026-10-01 the commitment test, the runway notes and the plan
 * stress test divided by it as if it were already net. With 12 months of
 * runway, $200k of spend and $150k of revenue, that put the runway left after a
 * $20k-a-month hire at 10.9 months when it was 8.6. Revenue left blank counts
 * as none: the cautious reading, and the one those three gave when spend was
 * all they had.
 */
export const netMonthlyBurnUsd = (profile: OperatorProfile): number | undefined =>
  profile.monthlyBurnUsd === undefined ? undefined : profile.monthlyBurnUsd - (profile.monthlyRevenueUsd ?? 0);

export type ProfileRunway =
  /** Worked out: cash divided by net burn. */
  | { basis: "cash"; months: number; cashUsd: number; netBurnUsd: number }
  /** Typed in as a number of months. */
  | { basis: "entered"; months: number }
  /**
   * Revenue covers spending, so cash is not running down and there is no runway
   * to count. `cashUsd` is absent when the runway was typed rather than worked out.
   */
  | { basis: "cash-flow-positive"; cashUsd?: number; surplusUsd: number };

/**
 * The runway every surface reads: worked out from cash and net burn when cash
 * is given, else the figure typed in, else nothing. A cash figure without spend
 * is not a runway yet, and never reads as one.
 *
 * Revenue at or above spend is cash-flow positive whichever way the runway was
 * given. Until 2026-10-01 only a cash figure was checked, so a typed 14 months
 * beside $100k of spend and $120k of revenue sized a full plan and dated a
 * cash-out month, while the same company with its cash entered was told there
 * was no runway to plan against.
 */
export const resolveProfileRunway = (profile: OperatorProfile): ProfileRunway | null => {
  const netBurn = netMonthlyBurnUsd(profile);
  const cash = profile.cashUsd !== undefined && profile.cashUsd > 0 ? profile.cashUsd : undefined;
  const typedMonths = profile.runwayMonths !== undefined && profile.runwayMonths > 0 ? profile.runwayMonths : undefined;
  if (netBurn !== undefined && netBurn <= 0 && (cash !== undefined || typedMonths !== undefined)) {
    const surplusUsd = Math.max(0, -netBurn);
    return cash !== undefined ? { basis: "cash-flow-positive", cashUsd: cash, surplusUsd } : { basis: "cash-flow-positive", surplusUsd };
  }
  if (cash !== undefined && netBurn !== undefined) {
    // Tenths of a month, and never zero: a balance under one tenth of a month is still a runway.
    const months = Math.max(0.1, Math.round((cash / netBurn) * 10) / 10);
    return { basis: "cash", months, cashUsd: cash, netBurnUsd: netBurn };
  }
  if (typedMonths !== undefined) {
    return { basis: "entered", months: typedMonths };
  }
  return null;
};

/** The runway in months, when there is one to count. */
export const resolveProfileRunwayMonths = (profile: OperatorProfile): number | undefined => {
  const runway = resolveProfileRunway(profile);
  return runway && runway.basis !== "cash-flow-positive" ? runway.months : undefined;
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
  if (key === "cashUsd" || key === "monthlyBurnUsd" || key === "monthlyRevenueUsd") return compactUsd.format(value);
  return String(value);
};
