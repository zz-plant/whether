import type { describeBriefOutcome } from "../../../lib/report/publishedBriefs";
import { HOME_DECISION_PARAM, parseHomeDecision } from "../../../lib/report/home/homeSectionModel";
import type { DecisionArea } from "../../../lib/report/boundedDecisionRules";

/** The area a copied link names (`?decision=hiring`), or nothing for none or an unknown slug. */
export const chosenAreaFromSearch = (search: string): DecisionArea | undefined =>
  parseHomeDecision(new URLSearchParams(search).get(HOME_DECISION_PARAM) ?? undefined);

/** The row id the page gives each area, so a link that names the area lands on its row. */
export const briefAreaRowId = (area: string) => `area-${area}`;

/**
 * "What happened next?" on a frozen week, answered first (docs/editorial-guardrails.md,
 * "Questions and answers, as people say them"): whether conditions held, then the next brief
 * that says so. The section was headed "What happened after this week" and opened on "The next
 * published brief, for the week of …", so the answer came last (2026-11-25).
 *
 * The parts are returned so the page can print the week in `<time>` while the text a reader
 * sees is the `answer` string the page's markup carries.
 */
const OUTCOME_QUESTION = "What happened next?";

export const describeOutcomeAnswer = (outcome: Extract<ReturnType<typeof describeBriefOutcome>, { kind: "superseded" }>) => {
  const lead = outcome.held ? "Conditions held: the next brief, for the week of" : "Conditions changed: the next brief, for the week of";
  const tail = outcome.held ? `, read ${outcome.to} as well.` : `, read ${outcome.to}, where this one read ${outcome.from}.`;
  return {
    question: OUTCOME_QUESTION,
    lead,
    weekLabel: outcome.weekLabel,
    tail,
    answer: `${lead} ${outcome.weekLabel}${tail}`,
  };
};
