/**
 * The questions that come up around a piece of work, and the tool that helps answer each one.
 *
 * The questions are written examples, not quotes or research, and the pages say so. A question is
 * chosen by the week's conditions, so a reader types nothing to see the one that applies. A tool is
 * named only where it works on that question: "who's checked whether they need the same people?"
 * has no calculation behind it here, so it prints alone.
 *
 * `/decisions` compares a recorded decision with today's conditions. It cannot say whether finished
 * work paid off, so the question about that carries no tool.
 */
import type { RegimeKey } from "../regimeEngine";
import { operatorStageLabel, type OperatorStage } from "./operatorStage";

type QuestionToolKey = "payback" | "reversible" | "record";

export type QuestionTool = {
  key: QuestionToolKey;
  label: string;
  href: string;
};

const QUESTION_TOOLS: Record<QuestionToolKey, QuestionTool> = {
  /* The planner draws its payback section once a runway is entered, so the link lands on those figures. */
  payback: { key: "payback", label: "Work out the payback", href: "/operate/financial#ops-runway-inputs" },
  reversible: { key: "reversible", label: "Find a more reversible version", href: "/operate#ops-decision-shield" },
  record: { key: "record", label: "See what has changed since you decided", href: "/decisions" },
};

type SeatKey = "founder" | "technicalFounder" | "engineeringLead" | "productLead" | "financeLead" | "chiefOfStaff" | "boardMember";

const SEATS: Record<SeatKey, { title: string; stage: OperatorStage; roleSlug?: string }> = {
  founder: { title: "Founder", stage: "seed" },
  technicalFounder: { title: "Technical founder", stage: "bootstrapped" },
  engineeringLead: { title: "Engineering lead", stage: "series-a", roleSlug: "engineering-managers" },
  productLead: { title: "Product lead", stage: "series-b", roleSlug: "product-managers" },
  financeLead: { title: "Finance lead", stage: "series-b", roleSlug: "finance-teams" },
  chiefOfStaff: { title: "Chief of staff", stage: "series-b" },
  boardMember: { title: "Board member", stage: "series-b" },
};

const CONDITION_QUESTIONS: Record<RegimeKey, readonly { seat: SeatKey; question: string; tool?: QuestionToolKey }[]> = {
  EXPANSION: [
    { seat: "founder", question: "Are we ready to hire for this, or do we need a few more customers using it first?", tool: "reversible" },
    { seat: "engineeringLead", question: "Would two more engineers actually help, or would they just get stuck on the same stuff?" },
    { seat: "productLead", question: "If we gave this another team, what would we get that we’re not getting now?", tool: "payback" },
    { seat: "chiefOfStaff", question: "These all look good individually. Who’s checked whether they need the same people?" },
    { seat: "technicalFounder", question: "We’re spending more time keeping up with demand than improving the product. Is it time to add someone?", tool: "reversible" },
  ],
  DEFENSIVE: [
    { seat: "founder", question: "What would this person let us do that we can’t do today?" },
    { seat: "engineeringLead", question: "I think the refactor’s worth it. How do I make the case for taking two people off features?", tool: "payback" },
    { seat: "productLead", question: "If we can only fund two of these, which two—and what are we giving up?", tool: "payback" },
    { seat: "financeLead", question: "Walk me through the savings. What has to be true for those numbers to work?", tool: "payback" },
    { seat: "technicalFounder", question: "The annual plan’s cheaper, but are we sure we’ll still want this in a year?", tool: "reversible" },
  ],
  VOLATILE: [
    { seat: "founder", question: "Can we test this with the team we have before opening those roles?", tool: "reversible" },
    { seat: "engineeringLead", question: "Can we stay monthly until we know what usage actually looks like?", tool: "reversible" },
    { seat: "productLead", question: "Could we try this with one customer first? What would we need to see before doing more?", tool: "reversible" },
    { seat: "financeLead", question: "If the round closes six months late, would we still choose to do this?", tool: "payback" },
    { seat: "chiefOfStaff", question: "What are we still waiting on to make this call? Who’s getting us the answer?" },
  ],
  SCARCITY: [
    { seat: "founder", question: "What’s the quickest way to find out if customers actually want this?" },
    { seat: "engineeringLead", question: "We’ve lost the two hires, but the dates haven’t changed. What are we taking out?" },
    { seat: "productLead", question: "Sales says we need this for renewals. Which customers, and have we checked with them?" },
    { seat: "financeLead", question: "When you say it saves $200k, does that come out of the budget, or do people get time back?", tool: "payback" },
    { seat: "boardMember", question: "We approved this last quarter. Knowing what we know now, would we approve it again?", tool: "record" },
    { seat: "technicalFounder", question: "Our numbers haven’t changed. What would we actually gain by slowing this down?" },
  ],
};

export type ConditionQuestion = {
  /** "Engineering lead · Series A". */
  who: string;
  question: string;
  /** The seat's own page, where it has one. */
  roleHref?: string;
  tool?: QuestionTool;
};

const toConditionQuestion = ({ seat, question, tool }: { seat: SeatKey; question: string; tool?: QuestionToolKey }): ConditionQuestion => {
  const { title, stage, roleSlug } = SEATS[seat];
  return {
    who: `${title} · ${operatorStageLabel(stage)}`,
    question,
    ...(roleSlug ? { roleHref: `/roles/${roleSlug}` } : {}),
    ...(tool ? { tool: QUESTION_TOOLS[tool] } : {}),
  };
};

export const conditionQuestions = (regime: RegimeKey): ConditionQuestion[] => CONDITION_QUESTIONS[regime].map(toConditionQuestion);

/** The one a role page prints. Not every seat has a question in all four conditions. */
export const conditionQuestionForRole = (roleSlug: string, regime: RegimeKey): ConditionQuestion | undefined => {
  const entry = CONDITION_QUESTIONS[regime].find(({ seat }) => SEATS[seat].roleSlug === roleSlug);
  return entry ? toConditionQuestion(entry) : undefined;
};

export const STARTING_QUESTION = "Is this worth the time and money—and what would make us change our minds?";

export type WorkSituation = {
  situation: string;
  askingYourself: string;
  beingAsked: string;
  tool?: QuestionTool;
};

export const WORK_SITUATIONS: readonly WorkSituation[] = [
  {
    situation: "Making the case for engineering work",
    askingYourself: "How do I show that fixing this is worth taking two engineers off feature work?",
    beingAsked: "What does this buy us, and how long before we see the benefit?",
    tool: QUESTION_TOOLS.payback,
  },
  {
    situation: "Choosing an approach",
    askingYourself: "Do we need the rewrite, or can we fix the part that’s causing problems?",
    beingAsked: "What’s the smallest version that gets us the result?",
    tool: QUESTION_TOOLS.reversible,
  },
  {
    situation: "Setting realistic scope",
    askingYourself: "What can we actually deliver with the team we have?",
    beingAsked: "If we take this on, what slips?",
  },
  {
    situation: "Explaining why now",
    askingYourself: "Is this worth doing this quarter, or can it wait?",
    beingAsked: "What happens if we leave it alone for another six months?",
    tool: QUESTION_TOOLS.payback,
  },
  {
    situation: "Agreeing on a trial or rollout",
    askingYourself: "How can we try this before committing the whole team?",
    beingAsked: "What would we need to see before we roll it out further—and when would we stop?",
    tool: QUESTION_TOOLS.reversible,
  },
  {
    situation: "Getting a decision made",
    askingYourself: "What’s still stopping this from getting approved?",
    beingAsked: "What do you need from me, and what exactly am I agreeing to?",
  },
  {
    situation: "Revisiting an existing commitment",
    askingYourself: "The estimate has doubled. Is this still the right thing to finish?",
    beingAsked: "What’s changed since we approved this?",
    tool: QUESTION_TOOLS.record,
  },
  {
    situation: "Checking whether the work paid off",
    askingYourself: "Did we actually remove the work we said we would?",
    beingAsked: "We spent six weeks on this. What’s better now?",
  },
];

const LEAD_ROLE_SLUGS: ReadonlySet<string> = new Set(["engineering-managers", "product-managers"]);

/** The situations are about engineering and product work, so only those leads' pages print them. */
export const workSituationsForRole = (roleSlug: string): readonly WorkSituation[] =>
  LEAD_ROLE_SLUGS.has(roleSlug) ? WORK_SITUATIONS : [];

/** The questions someone else will put to you, as a list to prepare from. */
export const buildWorkSituationsCopy = (situations: readonly WorkSituation[]): string =>
  ["Questions to be ready for:", ...situations.map(({ beingAsked }) => `- ${beingAsked}`)].join("\n");
