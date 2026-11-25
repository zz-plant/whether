import type { DecisionPageDefinition } from "../../app/answers/decisionPages";
import { decisionAreaLabel, ruleMetricLabel, type BoundedDecisionRule, type DecisionArea } from "../report/boundedDecisionRules";
import { buildHomeAreaRows, type HomeAreaRow } from "../report/home/homeSectionModel";

/*
 * The pages whose question asks whether to do the lead area's own work, and which way: "Should
 * startups hire engineers right now?" asks for Hiring to be open, "Should we freeze hiring this
 * week?" for it to be on hold. Their answer can start with "Yes" or "Not this week". Every other
 * page asks something the area's standing informs but does not settle (layoffs, pricing, a
 * bridge), so it starts with "This week" and the standing.
 */
const ASKS: Record<string, { area: DecisionArea; askedFor: "open" | "on hold" }> = {
  "should-startups-hire-engineers-right-now": { area: "hiring", askedFor: "open" },
  "should-we-freeze-or-selectively-hire": { area: "hiring", askedFor: "on hold" },
  "should-we-expand-sales-headcount-now": { area: "hiring", askedFor: "open" },
  "should-startups-raise-capital-now": { area: "capital-raising", askedFor: "open" },
  "should-startups-slow-roadmap-expansion": { area: "product-tempo", askedFor: "on hold" },
  "should-we-delay-new-product-lines": { area: "expansion-bets", askedFor: "on hold" },
  "should-we-hire-our-first-salesperson-now": { area: "expansion-bets", askedFor: "open" },
  "should-startups-expand-internationally-now": { area: "expansion-bets", askedFor: "open" },
};

type LineSlot = NonNullable<HomeAreaRow["pause"]>;
type Scores = { tightness: number; riskAppetite: number };

/* "funding pressure falls below 66", from the slot the area table prints; null for a line with no number. */
const slotCondition = (slot: LineSlot | undefined) =>
  slot && slot.value !== undefined && slot.holdsAbove !== undefined
    ? { text: `${ruleMetricLabel[slot.metric].toLowerCase()} ${slot.holdsAbove ? "rises above" : "falls below"} ${slot.value}`, metric: slot.metric }
    : null;

/**
 * This week's answer for an answer page, said first (docs/editorial-guardrails.md, "Questions
 * and answers, as people say them"): the lead area's standing and the one line that would change
 * it, with the score it is measured against. "Not this week: hiring is on hold until funding
 * pressure falls below 66; it is 90." The page's own `shortAnswer`, the rule that holds in any
 * week, follows it. Until 2026-11-25 the card under the question opened on that general rule,
 * and this week's answer to the question was a line further down.
 *
 * Built from the same area row the page's table draws (`buildHomeAreaRows`), so the sentence and
 * the row agree. Null where the page has no area row with a numbered line.
 */
const describeThisWeeksAnswer = ({
  slug,
  rows,
  leadArea,
  scores,
}: {
  slug: string;
  rows: readonly HomeAreaRow[];
  /** The first of the page's areas the week has a rule for. */
  leadArea: DecisionArea | undefined;
  scores: Scores;
}): string | null => {
  const ask = ASKS[slug];
  const area = ask && rows.some((row) => row.area === ask.area) ? ask.area : leadArea;
  const row = rows.find((candidate) => candidate.area === area);
  if (!area || !row) return null;
  const onHold = row.pause?.met === true;
  const line = slotCondition(onHold ? row.resume : row.pause);
  if (!line) return null;
  const name = decisionAreaLabel(area).toLowerCase();
  const be = area === "expansion-bets" ? "are" : "is";
  const lead = !ask || ask.area !== area
    ? "This week"
    : ask.askedFor === (onHold ? "on hold" : "open")
      ? "Yes, this week"
      : onHold
        ? "Not this week"
        : "No, not this week";
  const standing = onHold ? `on hold until ${line.text}` : `open until ${line.text}`;
  return `${lead}: ${name} ${be} ${standing}; it is ${Math.round(scores[line.metric])}.`;
};

/**
 * What an answer page says first, and what `get_answer` returns as `leadAnswer`: this week's
 * standing, then the page's rule for any week. The page computed this in `app/answers` until
 * 2026-11-25, so the tool kept the rule alone and an assistant quoting Whether opened on a
 * different line from the page a reader would open. `buildAnswerObject` calls this; the page
 * and the tool read the object.
 */
export const buildAnswerLead = ({
  page,
  mappedRules,
  scores,
}: {
  page: Pick<DecisionPageDefinition, "slug" | "shortAnswer" | "mappedDecisionAreas">;
  /** The week's rules for the page's areas. */
  mappedRules: readonly BoundedDecisionRule[];
  scores: Scores;
}): { leadArea: DecisionArea | undefined; thisWeek: string | null; leadAnswer: string } => {
  const leadArea = page.mappedDecisionAreas.find((area) => mappedRules.some((rule) => rule.area === area));
  const thisWeek = describeThisWeeksAnswer({
    slug: page.slug,
    rows: buildHomeAreaRows({
      decisionRules: mappedRules,
      movement: null,
      scores: { tightness: scores.tightness, riskAppetite: scores.riskAppetite },
    }),
    leadArea,
    scores,
  });
  return { leadArea, thisWeek, leadAnswer: thisWeek ? `${thisWeek} ${page.shortAnswer}` : page.shortAnswer };
};
