import { z } from "zod";
import {
  buildRuleCondition,
  decisionAreaLabel,
  isDecisionArea,
  isRuleConditionMet,
  type BoundedDecisionRule,
  type DecisionArea,
  type RuleCondition,
} from "../report/boundedDecisionRules";
import { isRunwayBand, runwayBandPhrase, runwayBandSublabel, type RunwayBand } from "../report/operatorRunway";
import { buildRunwayConditionedNotes, resolveRunwayForNotes } from "../report/runwayConditionedNotes";
import { isRegimeKey } from "../regimePresentation";
import { formatDateUTC } from "../formatters";

/**
 * A plan's own lines: for each decision area a reader chose, the conditions that
 * pause it and the conditions that resume it, on the two published scores.
 *
 * The guidance moves a few times a year (`lineCrossingMonths` in
 * `lib/report/trackRecord.ts`), so the use that fits it is a set of lines agreed
 * when a plan is made and an email the day one is crossed. The published lines
 * are the same for every company; these let a team move them, say releasing the
 * second half of a hiring plan at funding pressure 60 rather than 66.
 *
 * Same shape as a published rule (`BoundedDecisionRule.pause` / `.resume`), as
 * numbers only: the pause holds when any of its conditions does, the resume
 * when all of its conditions do — the join every published rule uses. Stored
 * on the subscriber record, against the email address and nothing else.
 */

const conditionSchema = z.object({
  metric: z.enum(["tightness", "riskAppetite"]),
  operator: z.enum([">", "<"]),
  value: z.number().int().min(0).max(100),
});

const planLineSchema = z.object({
  area: z.custom<DecisionArea>((value) => typeof value === "string" && isDecisionArea(value)),
  pause: z.array(conditionSchema).min(1).max(2),
  resume: z.array(conditionSchema).min(1).max(2),
});

/** At most one entry per area; an empty list clears a plan's lines. */
const planLinesSchema = z
  .array(planLineSchema)
  .max(5)
  .refine((lines) => new Set(lines.map((line) => line.area)).size === lines.length, "One entry per area");

export type PlanLineCondition = z.infer<typeof conditionSchema>;
export type PlanLines = z.infer<typeof planLineSchema>;

/** Plan lines out of a request body or a stored record; null when the value is not a valid set. */
export const parsePlanLines = (raw: unknown): PlanLines[] | null => {
  const parsed = planLinesSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
};

const toPlanCondition = (condition: RuleCondition): PlanLineCondition[] =>
  condition.operator === ">" || condition.operator === "<"
    ? [{ metric: condition.metric, operator: condition.operator, value: Math.round(condition.value) }]
    : [];

/**
 * The published rules as plan lines: where the /operate form starts, so a reader
 * moves a number rather than writing a rule, and an unmoved form watches exactly
 * the lines the guidance already prints. A rule with no numeric line is left out.
 */
export const planLinesFromRules = (
  rules: readonly Pick<BoundedDecisionRule, "area" | "pause" | "resume">[],
): PlanLines[] =>
  rules.flatMap((rule) => {
    const pause = rule.pause.conditions.flatMap(toPlanCondition);
    const resume = rule.resume.conditions.flatMap(toPlanCondition);
    return pause.length > 0 && resume.length > 0 ? [{ area: rule.area, pause, resume }] : [];
  });

type Scores = { tightness: number; riskAppetite: number };

const pauseHolds = (line: PlanLines, scores: Scores) =>
  line.pause.some((condition) => isRuleConditionMet(buildRuleCondition(condition.metric, condition.operator, condition.value), scores[condition.metric]));

const resumeHolds = (line: PlanLines, scores: Scores) =>
  line.resume.every((condition) => isRuleConditionMet(buildRuleCondition(condition.metric, condition.operator, condition.value), scores[condition.metric]));

type PlanLineCrossing = { area: DecisionArea; side: "pause" | "resume"; line: PlanLines };

/**
 * The plan lines that started holding between two readings. A pause or resume
 * that already held at the previous reading is not news, and one that stops
 * holding is the other side's business: a pause ends when the resume holds.
 * Without a previous reading nothing is judged, as with flash moves.
 */
export const evaluatePlanLineCrossings = (
  lines: readonly PlanLines[],
  current: Scores,
  previous: Scores | null | undefined,
): PlanLineCrossing[] => {
  if (!previous) return [];
  const crossings: PlanLineCrossing[] = [];
  for (const line of lines) {
    if (pauseHolds(line, current) && !pauseHolds(line, previous)) {
      crossings.push({ area: line.area, side: "pause", line });
    }
    if (resumeHolds(line, current) && !resumeHolds(line, previous)) {
      crossings.push({ area: line.area, side: "resume", line });
    }
  }
  return crossings;
};

/** The key a plan-line email is deduplicated on: one per area and side a week. */
export const planLineDeliveryKey = (crossing: Pick<PlanLineCrossing, "area" | "side">) =>
  `plan:${crossing.area}:${crossing.side}`;

const conditionLabel = (condition: PlanLineCondition) =>
  buildRuleCondition(condition.metric, condition.operator, condition.value).label;

/** "Funding pressure > 72 or Risk appetite < 40" — the clause as the reader set it. */
const formatPlanLineClause = (line: PlanLines, side: "pause" | "resume") =>
  (side === "pause" ? line.pause : line.resume).map(conditionLabel).join(side === "pause" ? " or " : " and ");

/** "hiring and spending", for a confirmation email that says what is being confirmed. */
export const describePlanLineAreas = (lines: readonly PlanLines[]) => {
  const labels = lines.map((line) => decisionAreaLabel(line.area).toLowerCase());
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
};

/**
 * The runway band a reader had set when they confirmed their lines, and the day.
 * The band only, never a figure: the figures stay in the browser that typed them.
 */
export type PlanRunway = { band: RunwayBand; setOn: string };

/** A stored band, read field by field: an unknown band or an unreadable date is no band. */
export const parsePlanRunway = (value: unknown): PlanRunway | null => {
  if (typeof value !== "object" || value === null) return null;
  const band: unknown = Reflect.get(value, "band");
  const setOn: unknown = Reflect.get(value, "setOn");
  if (!isRunwayBand(band) || typeof setOn !== "string" || !Number.isFinite(Date.parse(setOn))) return null;
  return { band, setOn };
};

/**
 * What a crossing means at the reader's own runway.
 *
 * Every company that kept the published lines gets its crossing email on the
 * same day, and an email that says only "the line was crossed" asks all of them
 * to do the same thing at once: a hiring freeze or a raise started in step
 * across every reader. The lines are shared on purpose; what a company does
 * about a crossing is not. So the email adds the note this guidance already
 * carries for that area at the reader's runway band (`buildRunwayConditionedNotes`),
 * or the band's own one-line stance where the band has no note for the area,
 * and dates the band, because runway falls every month after it was set.
 */
const describeCrossingAtRunway = (area: DecisionArea, regime: string, runway: PlanRunway): string => {
  const setOn = formatDateUTC(runway.setOn);
  const forNotes = resolveRunwayForNotes({ band: runway.band });
  const note = forNotes && isRegimeKey(regime)
    ? buildRunwayConditionedNotes({ regime, ...forNotes }).find((entry) => entry.area === area)?.note
    : undefined;
  return note
    ? `${note} (Your runway band, set on ${setOn}.)`
    : `With ${runwayBandPhrase(runway.band)} of runway, the band you set on ${setOn}: ${runwayBandSublabel(runway.band).toLowerCase()}.`;
};

/**
 * The email for one crossing, in the reader's terms: their area, their line,
 * today's scores, and — when they set one — what it means at their runway.
 */
export const describePlanLineCrossing = (
  crossing: PlanLineCrossing,
  scores: Scores,
  context?: { regime: string; runway?: PlanRunway },
) => {
  const area = decisionAreaLabel(crossing.area);
  const clause = formatPlanLineClause(crossing.line, crossing.side);
  const today = `Funding pressure is ${Math.round(scores.tightness)} and risk appetite ${Math.round(scores.riskAppetite)} today.`;
  const atRunway = context?.runway ? ` ${describeCrossingAtRunway(crossing.area, context.regime, context.runway)}` : "";
  return crossing.side === "pause"
    ? {
      headline: `${area}: your pause line was crossed`,
      body: `You set ${area.toLowerCase()} to pause if ${clause}. ${today} The plan you made for ${area.toLowerCase()} pauses until your resume line holds.${atRunway}`,
    }
    : {
      headline: `${area}: your resume line holds`,
      body: `You set ${area.toLowerCase()} to resume when ${clause}. ${today} The work you held can resume.${atRunway}`,
    };
};
