import { formatCommitmentUsd } from "../planCommitment";
import type { PaybackProjectEntry } from "../operatorProfile";
import type { RegimeKey } from "../regimeEngine";
import { getRegimePublicLabel } from "../regimePresentation";
import { ROADMAP_PAYBACK_BAR_MONTHS, TIGHT_RUNWAY_PAYBACK_BAR_MONTHS } from "./boundedDecisionRules";
import { runwayBandForMonths, runwayBandPhrase, type RunwayBand } from "./operatorRunway";

/**
 * Engineering work against the payback bar, in the runway planner.
 *
 * A piece of work is costed in engineer time (weeks × engineers × what an
 * engineer-week costs) and credited with what it saves a month: hours someone
 * no longer spends, at what an hour of theirs costs, plus any bill it cuts. The
 * month it breaks even is checked against the bar the published rules already
 * set, never a new one:
 *
 * - under six months of runway, the cash gate holds every new commitment;
 * - with 6–12 months, every commitment needs a payback inside
 *   `TIGHT_RUNWAY_PAYBACK_BAR_MONTHS`;
 * - otherwise, outside Sunny, the Product tempo rule slows work that pays back
 *   in more than `ROADMAP_PAYBACK_BAR_MONTHS`;
 * - in Sunny with a year or more of runway, the rules set no bar on roadmap work.
 *
 * Added 2026-10-13 from a set of essays arguing that "product craft" has to be
 * justified as cost removed once the person who pays is not the person who
 * uses the product. The essays priced that with a discount rate. The planner
 * does not: at a 22% hurdle, a project that breaks even inside two years does so
 * about a month later than undiscounted, while the rules' bars move by six
 * months with runway and conditions. What moves the decision is the bar, so the
 * bar is what this draws.
 *
 * The engineers are taken to be on payroll already, so building the work does
 * not change cash; what it saves does, once it ships. That is the runway it
 * adds, at today's net burn and with revenue held flat, the same arithmetic as
 * the planner's own "in dates and dollars" lines.
 */

const WEEKS_PER_MONTH = 52 / 12;

export type PaybackBar =
  /** Under six months of runway: the rules hold every new commitment, whatever it pays back. */
  | { kind: "cash-gate" }
  | { kind: "months"; months: number; basis: "tight-runway" | "roadmap" }
  /** Sunny with a year or more of runway: no bar on roadmap work. */
  | { kind: "none" };

export const resolvePaybackBar = (regime: RegimeKey, band: RunwayBand | null): PaybackBar => {
  if (band === "critical") return { kind: "cash-gate" };
  if (band === "tight") return { kind: "months", months: TIGHT_RUNWAY_PAYBACK_BAR_MONTHS, basis: "tight-runway" };
  if (regime !== "EXPANSION") return { kind: "months", months: ROADMAP_PAYBACK_BAR_MONTHS, basis: "roadmap" };
  return { kind: "none" };
};

/** The rule that sets the bar, in one sentence, for the top of the section and the copied lines. */
export const describePaybackBar = (bar: PaybackBar, regime: RegimeKey): string => {
  if (bar.kind === "cash-gate") return "Under six months of cash, the rules hold every new commitment, whatever it pays back.";
  if (bar.kind === "none") {
    return `In ${getRegimePublicLabel(regime)} conditions, with a year or more of runway, the rules set no payback bar on roadmap work: your runway is the limit.`;
  }
  if (bar.basis === "tight-runway") {
    return `With ${runwayBandPhrase("tight")} of runway, every new commitment needs a payback inside ${bar.months} months.`;
  }
  return `In ${getRegimePublicLabel(regime)} conditions, the roadmap rule slows anything that pays back in more than a year.`;
};

export type ProjectPaybackContext = {
  regime: RegimeKey;
  runwayMonths: number;
  /** Spend less revenue. The planner only sizes a plan when this is above zero. */
  netMonthlyBurnUsd: number;
  engineerWeekCostUsd: number | undefined;
};

type ProjectRunwayEffect =
  /** It ships after the cash runs out, so its saving never reaches this runway. */
  | { kind: "ships-after-cash-out" }
  | { kind: "covers-burn" }
  | { kind: "extends"; runwayAfterMonths: number; bandAfter: RunwayBand | null; barAfter: PaybackBar };

export type SizedProjectPayback = {
  status: "sized";
  name: string;
  weeksToShip: number;
  engineers: number;
  buildCostUsd: number;
  /** Months from now to the week it ships. */
  shipMonth: number;
  monthlySavingUsd: number;
  /** Months from now to the point the saving has repaid the engineer time; null when it saves nothing. */
  breakEvenMonth: number | null;
  verdict: "clears" | "misses" | "no-bar" | "held" | "no-saving";
  afterCashOut: boolean;
  runwayEffect: ProjectRunwayEffect;
  sentence: string;
};

export type ProjectPayback =
  | SizedProjectPayback
  | { status: "incomplete"; name: string; missing: readonly string[] };

const roundTenth = (value: number) => Math.round(value * 10) / 10;
const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);
const figure = (value: number) => (Number.isInteger(value) ? String(value) : String(roundTenth(value)));

const projectName = (entry: PaybackProjectEntry, index: number) => entry.name ?? `Project ${index + 1}`;

const missingFigures = (entry: PaybackProjectEntry, engineerWeekCostUsd: number | undefined): string[] => {
  const missing: string[] = [];
  if (engineerWeekCostUsd === undefined) missing.push("what an engineer-week costs");
  if (entry.weeksToShip === undefined) missing.push("weeks to ship");
  if (entry.engineers === undefined) missing.push("engineers on it");
  if (entry.hoursSavedPerMonth !== undefined && entry.hourlyCostUsd === undefined) missing.push("what one of those hours costs");
  if (entry.hoursSavedPerMonth === undefined && entry.otherMonthlySavingsUsd === undefined) missing.push("what it saves a month");
  return missing;
};

/**
 * Runway once the saving starts: cash falls at today's net burn until the work
 * ships, then at net burn less the saving. Cash is runway × net burn, as in
 * `describeRunwayPlanInYourNumbers`.
 */
const runwayEffect = (
  shipMonth: number,
  monthlySavingUsd: number,
  context: ProjectPaybackContext,
): ProjectRunwayEffect => {
  const { runwayMonths, netMonthlyBurnUsd, regime } = context;
  if (shipMonth >= runwayMonths) return { kind: "ships-after-cash-out" };
  if (monthlySavingUsd >= netMonthlyBurnUsd) return { kind: "covers-burn" };
  const runwayAfterMonths =
    shipMonth + (netMonthlyBurnUsd * (runwayMonths - shipMonth)) / (netMonthlyBurnUsd - monthlySavingUsd);
  const bandAfter = runwayBandForMonths(runwayAfterMonths);
  return { kind: "extends", runwayAfterMonths, bandAfter, barAfter: resolvePaybackBar(regime, bandAfter) };
};

const sameBar = (left: PaybackBar, right: PaybackBar) =>
  left.kind === right.kind && (left.kind !== "months" || (right.kind === "months" && left.months === right.months));

const verdictClause = (verdict: SizedProjectPayback["verdict"], bar: PaybackBar, regime: RegimeKey): string => {
  if (verdict === "held") return "with under six months of cash, the rules hold it with every other new commitment";
  if (verdict === "no-bar") return `the rules set no bar on roadmap work in ${getRegimePublicLabel(regime)} conditions`;
  if (bar.kind !== "months") return "";
  if (verdict === "clears") return `inside the ${bar.months}-month bar`;
  if (bar.basis === "tight-runway") {
    return `past the ${bar.months}-month bar your runway sets, which lifts once runway clears 12 months or a round is signed`;
  }
  return `past the ${bar.months}-month bar, so the roadmap rule slows it until conditions turn ${getRegimePublicLabel("EXPANSION")}`;
};

const describeBarAfter = (bar: PaybackBar): string => {
  if (bar.kind === "months") return `where the bar is ${bar.months} months`;
  if (bar.kind === "none") return "where the rules set no bar on roadmap work";
  return "where the cash gate holds every commitment";
};

export const buildProjectPayback = (
  entry: PaybackProjectEntry,
  index: number,
  context: ProjectPaybackContext,
): ProjectPayback => {
  const name = projectName(entry, index);
  const missing = missingFigures(entry, context.engineerWeekCostUsd);
  const { weeksToShip, engineers } = entry;
  const engineerWeekCostUsd = context.engineerWeekCostUsd;
  if (missing.length > 0 || weeksToShip === undefined || engineers === undefined || engineerWeekCostUsd === undefined) {
    return { status: "incomplete", name, missing };
  }

  const bar = resolvePaybackBar(context.regime, runwayBandForMonths(context.runwayMonths));
  const buildCostUsd = weeksToShip * engineers * engineerWeekCostUsd;
  const shipMonth = weeksToShip / WEEKS_PER_MONTH;
  const monthlySavingUsd = (entry.hoursSavedPerMonth ?? 0) * (entry.hourlyCostUsd ?? 0) + (entry.otherMonthlySavingsUsd ?? 0);
  const breakEvenMonth = monthlySavingUsd > 0 ? shipMonth + buildCostUsd / monthlySavingUsd : null;

  const verdict: SizedProjectPayback["verdict"] =
    breakEvenMonth === null
      ? "no-saving"
      : bar.kind === "cash-gate"
        ? "held"
        : bar.kind === "none"
          ? "no-bar"
          : breakEvenMonth <= bar.months
            ? "clears"
            : "misses";
  const afterCashOut = breakEvenMonth !== null && breakEvenMonth > context.runwayMonths;
  const effect = runwayEffect(shipMonth, monthlySavingUsd, context);

  const cost = `${name}: ${figure(weeksToShip)} ${plural(weeksToShip, "week", "weeks")} with ${figure(engineers)} ${plural(engineers, "engineer", "engineers")}, ${formatCommitmentUsd(buildCostUsd)} of engineer time`;
  const parts: string[] = [];
  if (breakEvenMonth === null) {
    parts.push(`${cost}. It saves no cash a month, so it has no payback to check: argue it on revenue or retention instead.`);
  } else {
    parts.push(`${cost}, to save ${formatCommitmentUsd(monthlySavingUsd)} a month.`);
    parts.push(
      `It breaks even in month ${Math.ceil(breakEvenMonth)}${afterCashOut ? ", after your cash runs out" : ""}: ${verdictClause(verdict, bar, context.regime)}.`,
    );
    // Shipping after the cash runs out needs no clause of its own: the break-even one says so.
    if (effect.kind === "covers-burn") {
      parts.push("Once it ships, the saving covers your net burn.");
    } else if (effect.kind === "extends") {
      const added = roundTenth(effect.runwayAfterMonths - context.runwayMonths);
      if (added >= 0.1) parts.push(`Once it ships, it adds ${figure(added)} ${plural(added, "month", "months")} of runway.`);
      if (!sameBar(bar, effect.barAfter)) {
        parts.push(`That takes runway to ${figure(roundTenth(effect.runwayAfterMonths))} months, ${describeBarAfter(effect.barAfter)}.`);
      }
    }
  }

  return {
    status: "sized",
    name,
    weeksToShip,
    engineers,
    buildCostUsd,
    shipMonth,
    monthlySavingUsd,
    breakEvenMonth,
    verdict,
    afterCashOut,
    runwayEffect: effect,
    sentence: parts.join(" "),
  };
};

/** Every row, in the reader's order, against one context. */
export const buildProjectPaybacks = (
  entries: readonly PaybackProjectEntry[],
  context: ProjectPaybackContext,
): ProjectPayback[] => entries.map((entry, index) => buildProjectPayback(entry, index, context));

/**
 * What the copy block and the budget memo carry: the bar's sentence, then one
 * sentence per sized project. Null until a project is sized, so neither
 * artifact prints a heading over nothing.
 */
export type EngineeringPaybackLines = { bar: string; projects: readonly string[] };

export const buildEngineeringPaybackLines = (
  projects: readonly ProjectPayback[],
  bar: PaybackBar,
  regime: RegimeKey,
): EngineeringPaybackLines | null => {
  const sentences = projects.flatMap((project) => (project.status === "sized" ? [project.sentence] : []));
  return sentences.length > 0 ? { bar: describePaybackBar(bar, regime), projects: sentences } : null;
};

const CHART_MAX_MONTHS = 36;

/**
 * The months the chart runs to: far enough to show the bar, the cash-out month
 * and every break-even up to three years, in six-month steps. A break-even past
 * the end is drawn as an arrow at the edge with its month beside it.
 */
export const paybackChartMonths = (projects: readonly ProjectPayback[], bar: PaybackBar, runwayMonths: number): number => {
  const sized = projects.filter((project): project is SizedProjectPayback => project.status === "sized");
  const reach = Math.max(
    12,
    runwayMonths,
    bar.kind === "months" ? bar.months : 0,
    ...sized.map((project) => project.shipMonth),
    ...sized.map((project) => project.breakEvenMonth ?? 0),
  );
  return Math.min(CHART_MAX_MONTHS, Math.ceil(reach / 6) * 6);
};
