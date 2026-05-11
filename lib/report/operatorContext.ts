/**
 * Operator context — server-side cookie reading for personalization.
 *
 * Reads company stage and rate sensitivity from request cookies
 * and passes them into the decision pipeline without accounts/login.
 */

export type CompanyStage = "pre-seed" | "seed" | "series-a" | "series-b-plus" | "public";
export type RateSensitivity = "high" | "medium" | "low";

export interface OperatorContext {
  companyStage: CompanyStage | null;
  rateSensitivity: RateSensitivity | null;
}

const COOKIE_STAGE = "whether-company-stage";
const COOKIE_RATE_SENSITIVITY = "whether-rate-sensitivity";

const VALID_STAGES: ReadonlySet<string> = new Set([
  "pre-seed",
  "seed",
  "series-a",
  "series-b-plus",
  "public",
]);

const VALID_SENSITIVITIES: ReadonlySet<string> = new Set(["high", "medium", "low"]);

const parseCookieValue = (cookieHeader: string, name: string): string | null => {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

/**
 * Parse operator context from a cookie header string (from request.headers.get("cookie")).
 * Returns null context if cookies are missing or invalid.
 */
export const parseOperatorContextFromCookies = (
  cookieHeader: string | null,
): OperatorContext => {
  if (!cookieHeader) {
    return { companyStage: null, rateSensitivity: null };
  }

  const stageRaw = parseCookieValue(cookieHeader, COOKIE_STAGE);
  const sensitivityRaw = parseCookieValue(cookieHeader, COOKIE_RATE_SENSITIVITY);

  const companyStage: CompanyStage | null =
    stageRaw && VALID_STAGES.has(stageRaw) ? (stageRaw as CompanyStage) : null;

  const rateSensitivity: RateSensitivity | null =
    sensitivityRaw && VALID_SENSITIVITIES.has(sensitivityRaw)
      ? (sensitivityRaw as RateSensitivity)
      : null;

  return { companyStage, rateSensitivity };
};

/**
 * Business logic: adjust a regime-based knob value (0–3) based on operator context.
 *
 * Rules:
 * - Pre-seed/seed companies get more conservative knobs (runway preservation)
 * - High rate sensitivity amplifies conservative adjustments
 * - Low rate sensitivity dampens adjustments
 * - Public companies get standard adjustments
 */

export type AdjustKnobInput = {
  /** The base knob value derived from regime (0–3) */
  baseValue: number;
  /** The knob key being adjusted */
  knobKey: "approvalVelocity" | "reversibility" | "payback" | "experimentTolerance";
  /** Operator's company stage */
  companyStage: CompanyStage | null;
  /** Operator's rate sensitivity */
  rateSensitivity: RateSensitivity | null;
};

/**
 * Stage multiplier — how much to shift from the baseline.
 * Negative values = more conservative, positive = more aggressive.
 */
const STAGE_MULTIPLIER: Record<CompanyStage, number> = {
  "pre-seed": -0.75,
  "seed": -0.5,
  "series-a": -0.25,
  "series-b-plus": 0,
  "public": 0.25,
};

/**
 * Sensitivity multiplier — amplifies or dampens the stage adjustment.
 */
const SENSITIVITY_MULTIPLIER: Record<RateSensitivity, number> = {
  high: 1.5,
  medium: 1.0,
  low: 0.5,
};

/**
 * Direction: for approvalVelocity and experimentTolerance, higher is more aggressive.
 * For reversibility and payback, higher is more conservative (stricter).
 * The stage multiplier makes earlier stages more conservative,
 * which means: lower approvalVelocity, higher reversibility, higher payback, lower experimentTolerance.
 */
const KNOB_DIRECTION: Record<AdjustKnobInput["knobKey"], 1 | -1> = {
  approvalVelocity: 1, // positive = more velocity (aggressive)
  reversibility: -1, // positive = more reversibility required (conservative)
  payback: -1, // positive = stricter payback (conservative)
  experimentTolerance: 1, // positive = more tolerance (aggressive)
};

/**
 * Adjust a regime-derived knob value based on operator context.
 * Returns a value clamped to [0, 3].
 */
export const adjustKnobForContext = (input: AdjustKnobInput): number => {
  if (!input.companyStage || !input.rateSensitivity) {
    return input.baseValue;
  }

  const stageMult = STAGE_MULTIPLIER[input.companyStage];
  const sensMult = SENSITIVITY_MULTIPLIER[input.rateSensitivity];
  const direction = KNOB_DIRECTION[input.knobKey];

  // The adjustment: earlier stages + high sensitivity → more conservative
  // stageMult is negative for earlier stages, so direction flips it for conservative knobs
  const adjustment = stageMult * sensMult * direction;

  // Clamp to [0, 3]
  return Math.min(3, Math.max(0, Math.round(input.baseValue + adjustment)));
};

/**
 * Generate a context-aware label suffix describing why a decision was adjusted.
 */
export const buildContextAdjustmentLabel = (
  companyStage: CompanyStage | null,
  rateSensitivity: RateSensitivity | null,
): string | null => {
  if (!companyStage || !rateSensitivity) {
    return null;
  }

  const stageLabel: Record<CompanyStage, string> = {
    "pre-seed": "pre-seed",
    "seed": "seed-stage",
    "series-a": "Series A",
    "series-b-plus": "growth-stage",
    "public": "public",
  };

  const sensLabel: Record<RateSensitivity, string> = {
    high: "rate-sensitive",
    medium: "moderately rate-sensitive",
    low: "rate-insulated",
  };

  return `Adjusted for ${stageLabel[companyStage]} ${sensLabel[rateSensitivity]} context`;
};