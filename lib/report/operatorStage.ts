/**
 * The one stage vocabulary an operator can set, and where it lives.
 *
 * Stage used to be asked for in five places with five answer sets: a settings
 * cookie (pre-seed … public), a config route writing the same cookie name from
 * a different list, the hero's `?stage=` selector, the runway planner's own
 * select, and the plan stress test's lifecycle dropdown. None read another, so
 * choosing Seed in one left the other four on their defaults. This module is
 * the single answer set, the single cookie, and the mappings into the two
 * engine types that still have their own internal stage names.
 *
 * The four options are the hero's four. `StartupVariantMode` also carries
 * `growth` and `public` for legacy links, which fold into Series B+ here.
 */
import type { LifecycleStage } from "../decisionShield";
import type { StartupVariantMode } from "./boundedDecisionRules";
import type { PlannerStage } from "./runwayPlanner";

export type OperatorStage = Extract<StartupVariantMode, "seed" | "series-a" | "series-b" | "bootstrapped">;

type OperatorStageOption = {
  key: OperatorStage;
  label: string;
  sublabel: string;
};

export const OPERATOR_STAGE_OPTIONS: readonly OperatorStageOption[] = [
  /* The sublabels used to prescribe each stage a single concern ("Payback & GTM", "Operating
     Leverage") in a control that decides which rules the reader sees. They say who the rules
     are for now, and nothing about what that company should care about. */
  { key: "seed", label: "Seed", sublabel: "Pre-revenue or early revenue" },
  { key: "series-a", label: "Series A", sublabel: "First repeatable revenue" },
  { key: "series-b", label: "Series B+", sublabel: "Scaling" },
  { key: "bootstrapped", label: "Bootstrapped", sublabel: "Funded by revenue" },
];

/** The brief's untouched default; the hero drops `?stage=` for it. */
export const DEFAULT_OPERATOR_STAGE: OperatorStage = "series-a";

export const OPERATOR_STAGE_COOKIE = "whether-company-stage";
const OPERATOR_STAGE_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

const OPERATOR_STAGES: ReadonlySet<string> = new Set(OPERATOR_STAGE_OPTIONS.map((option) => option.key));

export const isOperatorStage = (value: unknown): value is OperatorStage =>
  typeof value === "string" && OPERATOR_STAGES.has(value);

export const operatorStageLabel = (stage: OperatorStage): string =>
  OPERATOR_STAGE_OPTIONS.find((option) => option.key === stage)?.label ?? stage;

/** Legacy `?stage=growth|public` links read as Series B+; anything unknown is the default. */
export const operatorStageForVariantMode = (mode: StartupVariantMode | null | undefined): OperatorStage => {
  if (isOperatorStage(mode)) return mode;
  if (mode === "growth" || mode === "public") return "series-b";
  return DEFAULT_OPERATOR_STAGE;
};

/** The runway planner's engine keeps its own four stages; Series B+ and bootstrapped teams share the growth band. */
export const plannerStageForOperatorStage: Record<OperatorStage, PlannerStage> = {
  seed: "seed",
  "series-a": "series-a",
  "series-b": "growth",
  bootstrapped: "growth",
};

export const lifecycleStageForOperatorStage: Record<OperatorStage, LifecycleStage> = {
  seed: "DISCOVERY",
  "series-a": "GROWTH",
  "series-b": "SCALE",
  bootstrapped: "MATURE",
};

export const operatorStageForLifecycleStage: Record<LifecycleStage, OperatorStage> = {
  DISCOVERY: "seed",
  GROWTH: "series-a",
  SCALE: "series-b",
  MATURE: "bootstrapped",
};

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

/**
 * Reads the stage out of a Cookie header or `document.cookie`. Any value that
 * is not one of the four options — including the pre-seed / series-b-plus /
 * public values older builds wrote — reads as unset rather than as a guess.
 */
export const readOperatorStageCookie = (cookieHeader: string | null | undefined): OperatorStage | null => {
  if (!cookieHeader) return null;
  const value = readCookieValue(cookieHeader, OPERATOR_STAGE_COOKIE);
  return isOperatorStage(value) ? value : null;
};

/**
 * Reads a stage out of a query parameter or an embed attribute.
 *
 * Unlike the cookie reader this folds the legacy `growth` and `public` values
 * into Series B+, because those two were published in `/embed` snippets and in
 * `?stage=` links that are still in the wild. Anything else — an absent value
 * included — reads as unset, so a stage-agnostic brief is served rather than a
 * guess. Callers must not label the output from the raw parameter: `/embed`
 * did, and a widget requested with `stage=growth` carried a "growth" badge on a
 * brief that had been calibrated for nobody.
 */
export const parseOperatorStageParam = (value: string | null | undefined): OperatorStage | null => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (isOperatorStage(trimmed)) return trimmed;
  if (trimmed === "growth" || trimmed === "public") return "series-b";
  return null;
};

/** The `document.cookie` assignment that stores (or, with `null`, clears) the stage. */
export const buildOperatorStageCookie = (stage: OperatorStage | null): string => {
  const maxAge = stage ? OPERATOR_STAGE_COOKIE_MAX_AGE_SECONDS : 0;
  return `${OPERATOR_STAGE_COOKIE}=${stage ?? ""}; path=/; max-age=${maxAge}; SameSite=Lax`;
};
