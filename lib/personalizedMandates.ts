import type { RegimeAssessment } from "./regimeEngine";
import { deriveSectorAdjustedPosture, SECTOR_TAXONOMY } from "./report/sectorSensitivity";

export type CompanyStage = "seed" | "series-a" | "growth" | "public";
export type CompanySector = "b2b-saas" | "consumer" | "infrastructure";
export type TeamSize = "small" | "mid" | "large";
export type RevenueBand = "pre-revenue" | "<$1m" | "$1m-$10m" | "$10m-$50m" | "$50m+";
export type CashRunway = "<6m" | "6-12m" | "12-18m" | "18m+";
export type GrowthRate = "declining" | "0-10%" | "10-30%" | "30%+";
export type BusinessModel = "product-led" | "sales-led" | "usage-based" | "hybrid";

export type TeamContextProfile = {
  stage: CompanyStage;
  sector: CompanySector;
  teamSize: TeamSize;
  revenueBand: RevenueBand;
  cashRunway: CashRunway;
  growthRate: GrowthRate;
  businessModel: BusinessModel;
};

export const STAGE_OPTIONS: CompanyStage[] = ["seed", "series-a", "growth", "public"];
export const SECTOR_OPTIONS: CompanySector[] = ["b2b-saas", "consumer", "infrastructure"];
export const TEAM_SIZE_OPTIONS: TeamSize[] = ["small", "mid", "large"];
export const REVENUE_BAND_OPTIONS: RevenueBand[] = ["pre-revenue", "<$1m", "$1m-$10m", "$10m-$50m", "$50m+"];
export const CASH_RUNWAY_OPTIONS: CashRunway[] = ["<6m", "6-12m", "12-18m", "18m+"];
export const GROWTH_RATE_OPTIONS: GrowthRate[] = ["declining", "0-10%", "10-30%", "30%+"];
export const BUSINESS_MODEL_OPTIONS: BusinessModel[] = ["product-led", "sales-led", "usage-based", "hybrid"];

const DEFAULT_PROFILE: TeamContextProfile = {
  stage: "growth",
  sector: "b2b-saas",
  teamSize: "mid",
  revenueBand: "$1m-$10m",
  cashRunway: "12-18m",
  growthRate: "10-30%",
  businessModel: "hybrid",
};

const pickValue = <T extends string>(candidate: string | undefined, options: readonly T[], fallback: T): T =>
  candidate && options.includes(candidate as T) ? (candidate as T) : fallback;

export const normalizeCompanyProfile = (input: Partial<Record<keyof TeamContextProfile, string>> = {}) => {
  const profile: TeamContextProfile = {
    stage: pickValue(input.stage, STAGE_OPTIONS, DEFAULT_PROFILE.stage),
    sector: pickValue(input.sector, SECTOR_OPTIONS, DEFAULT_PROFILE.sector),
    teamSize: pickValue(input.teamSize, TEAM_SIZE_OPTIONS, DEFAULT_PROFILE.teamSize),
    revenueBand: pickValue(input.revenueBand, REVENUE_BAND_OPTIONS, DEFAULT_PROFILE.revenueBand),
    cashRunway: pickValue(input.cashRunway, CASH_RUNWAY_OPTIONS, DEFAULT_PROFILE.cashRunway),
    growthRate: pickValue(input.growthRate, GROWTH_RATE_OPTIONS, DEFAULT_PROFILE.growthRate),
    businessModel: pickValue(input.businessModel, BUSINESS_MODEL_OPTIONS, DEFAULT_PROFILE.businessModel),
  };

  const missingFields = (Object.keys(DEFAULT_PROFILE) as (keyof TeamContextProfile)[]).filter((key) => !input[key]);
  return {
    profile,
    completeness: missingFields.length === 0 ? "complete" : "partial",
    missingFields,
  } as const;
};

const stageAdjustment = {
  seed: "Protect runway while preserving discovery velocity.",
  "series-a": "Prioritize repeatable GTM learning over broad expansion.",
  growth: "Scale proven loops while tightening operational discipline.",
  public: "Bias toward predictability and cross-functional execution reliability.",
} as const;

const sectorNudge = {
  "b2b-saas": "Anchor roadmap on retention and measurable payback while preserving optionality for reversible expansion bets.",
  consumer: "Favor habit-forming loops with low-cost experimentation tied to weekly conversion signals.",
  infrastructure: "Emphasize reliability, migration safety, and platform trust with explicit fixed-cost stage gates.",
} as const;

const sizeNudge = {
  small: "Keep scope narrow and decision cycles weekly.",
  mid: "Codify guardrails and reduce cross-team dependency risk.",
  large: "Use explicit ownership boundaries and staged rollout gates.",
} as const;

const overlayAction = {
  tighten: "Tighten approval gates now: require shorter payback windows and pause irreversible commitments until the next read confirms.",
  hold: "Hold base cadence: keep current approval speed and limit changes to reversible bets with explicit stop triggers.",
  loosen: "Loosen selectively: accelerate reversible expansion bets while preserving existing stop triggers and weekly review cadence.",
} as const;

const runwayConstraint = {
  "<6m": "Runway constraint: freeze net-new fixed cost and execute only survival-critical bets until runway is rebuilt above 9 months.",
  "6-12m": "Runway constraint: allow only tranche-gated investments with monthly burn checkpoints and explicit stop-loss triggers.",
  "12-18m": "Runway constraint: keep expansion reversible with quarterly checkpoint gates tied to conversion and retention proof.",
  "18m+": "Runway constraint: use option value deliberately; expand only where milestones are measurable and reversible.",
} as const;

const growthRateAdjustment = {
  declining: "Current growth trend is declining, so bias toward retention and recovery loops before expansion.",
  "0-10%": "Growth is modest, so maintain disciplined experimentation with strict payback thresholds.",
  "10-30%": "Growth is healthy, so selectively fund proven loops while preserving reversal triggers.",
  "30%+": "Growth is strong, so accelerate winning loops but keep fixed-cost commitments staged.",
} as const;

const businessModelAdjustment = {
  "product-led": "Product-led model: prioritize self-serve conversion and activation efficiency over top-of-funnel volume.",
  "sales-led": "Sales-led model: tie headcount and quota expansion to leading pipeline quality indicators.",
  "usage-based": "Usage-based model: protect reliability and gross margin before pushing aggressive volume growth.",
  hybrid: "Hybrid model: sequence product and sales motions to avoid channel conflict and spend duplication.",
} as const;

const buildMovement = (adjustmentStrength: "none" | "light" | "moderate" | "strong", delta: number) => {
  if (adjustmentStrength === "none" || delta === 0) return "Stable versus base posture";
  return delta > 0 ? `Shift looser (${adjustmentStrength})` : `Shift tighter (${adjustmentStrength})`;
};

export const buildCompanySpecificRules = (assessment: RegimeAssessment, profile: TeamContextProfile) => {
  const sectorOverlay = deriveSectorAdjustedPosture(assessment, profile.sector);
  const postureRules = [
    `Base regime ${assessment.regime}: ${assessment.description || "follow current operating posture safeguards."}`,
    `Team operating cadence: ${sizeNudge[profile.teamSize]}`,
    growthRateAdjustment[profile.growthRate],
    businessModelAdjustment[profile.businessModel],
  ];

  return {
    posture_rules: postureRules,
    sector_adjustment: `${sectorNudge[profile.sector]} Overlay posture: ${sectorOverlay.adjustedPostureLabel}. ${overlayAction[sectorOverlay.actionBias]}`,
    stage_adjustment: stageAdjustment[profile.stage],
    runway_constraint: runwayConstraint[profile.cashRunway],
    sectorOverlay,
  } as const;
};

export const buildPersonalizedMandate = (assessment: RegimeAssessment, inputProfile: Partial<Record<keyof TeamContextProfile, string>>) => {
  const normalized = normalizeCompanyProfile(inputProfile);
  const profile = normalized.profile;
  const rules = buildCompanySpecificRules(assessment, profile);
  const base = `Current regime: ${assessment.regime}. Tightness ${assessment.scores.tightness}/100 and risk appetite ${assessment.scores.riskAppetite}/100.`;
  const overlaySummary =
    rules.sectorOverlay.adjustmentStrength === "none"
      ? `Sector overlay: ${SECTOR_TAXONOMY[profile.sector].label} remains aligned with base posture ${rules.sectorOverlay.basePostureLabel}.`
      : `Sector overlay: ${SECTOR_TAXONOMY[profile.sector].label} reads as ${rules.sectorOverlay.adjustedPostureLabel} (${rules.sectorOverlay.adjustmentStrength} ${rules.sectorOverlay.adjustmentDelta > 0 ? "upside" : "downside"} tilt, damping ${(rules.sectorOverlay.dampingFactor * 100).toFixed(0)}%).`;

  return {
    output: {
      Posture: rules.sectorOverlay.adjustedPostureLabel,
      Movement: buildMovement(rules.sectorOverlay.adjustmentStrength, rules.sectorOverlay.adjustmentDelta),
      Confidence: assessment.diagnostics.confidence,
      Instruction: `${rules.stage_adjustment} ${rules.runway_constraint}`,
    },
    profileInterpretation: {
      profile,
      profileCompleteness: normalized.completeness,
      fallbackFields: normalized.missingFields,
      rules,
      stageComparisons: Object.fromEntries(
        STAGE_OPTIONS.map((stage) => [stage, stageAdjustment[stage]]),
      ) as Record<CompanyStage, string>,
    },
    headline: `${assessment.regime} mandate for ${profile.stage} ${profile.sector} teams`,
    recommendation: `${base} ${overlaySummary}`,
    sectorOverlay: rules.sectorOverlay,
    tailoredActions: [
      rules.stage_adjustment,
      rules.sector_adjustment,
      `${sizeNudge[profile.teamSize]} Reversal condition: ${rules.sectorOverlay.reversalCondition}`,
      rules.runway_constraint,
    ],
  };
};
