/**
 * The roles the company pages speak to, and what each can do with a week's conditions.
 *
 * These were the leadership roles from `decisionDomainCatalog`, whose decisions ("what gets on the
 * roadmap") belong to whoever holds the budget. Most people reading a page about their employer are
 * asking for a budget, not holding one, so each role says what to ask for. The pages can name a role,
 * being opt-in. Each role's words are its own: the section that used to repeat across every company's
 * page for a role is now what most separates the roles.
 *
 * The advice stays inside the published rules: tighter conditions favor what pays back soon and can be
 * stopped, and `paybackBarLine` prints the rule's own bar rather than a second one.
 */
import { resolvePaybackBar } from "./projectPayback";
import type { DecisionArea } from "./boundedDecisionRules";
import type { RegimeKey } from "../regimeEngine";

type ConditionsMood = "tight" | "unsettled" | "open";

const MOOD_BY_REGIME: Record<RegimeKey, ConditionsMood> = {
  SCARCITY: "tight",
  DEFENSIVE: "tight",
  VOLATILE: "unsettled",
  EXPANSION: "open",
};

export type CompanyRole = {
  slug: string;
  /** Mid-sentence: "for product managers at Microsoft". */
  label: string;
  /** Leading a link or a breadcrumb. */
  title: string;
  /** The areas whose general rules bear on these decisions, the closest first. */
  areas: readonly DecisionArea[];
  decisions: readonly string[];
  askFor: Record<ConditionsMood, string>;
};

export const COMPANY_ROLES: readonly CompanyRole[] = [
  {
    slug: "software-engineers",
    label: "software engineers",
    title: "Software engineers",
    areas: ["product-tempo"],
    decisions: [
      "Which project to attach yourself to",
      "What to propose, and how to size it",
      "How to make the case for reliability or tech-debt work",
    ],
    askFor: {
      tight: "Propose work that saves money or protects revenue, and put the payback in your first sentence.",
      unsettled: "Propose something small enough to ship before priorities can shift.",
      open: "This is a good week to propose a longer bet, as long as you can say what it would earn.",
    },
  },
  {
    slug: "product-managers",
    label: "product managers",
    title: "Product managers",
    areas: ["product-tempo"],
    decisions: ["What gets on the roadmap", "How much discovery to fund", "When to adjust pricing"],
    askFor: {
      tight: "Lead with what customers can use this quarter and the revenue it protects. Keep discovery small enough to stop after one round.",
      unsettled: "Pitch in stages you can stop, and ask for the first stage rather than the whole plan.",
      open: "Ask to fund more options at once, including discovery that may not pay off this year.",
    },
  },
  {
    slug: "engineering-managers",
    label: "engineering managers",
    title: "Engineering managers",
    areas: ["product-tempo", "hiring"],
    decisions: ["Where capacity goes", "How much to spend on reliability", "Which architecture commitments to make"],
    askFor: {
      tight: "Protect the reliability budget, and frame new platform work by the cost it removes. Avoid commitments you can't unwind.",
      unsettled: "Prefer work you can stop or reverse, and put off long architecture commitments until conditions settle.",
      open: "Make the case for platform work now, while longer payoffs are easier to fund.",
    },
  },
  {
    slug: "designers",
    label: "designers",
    title: "Designers",
    areas: ["product-tempo"],
    decisions: ["Which research to run", "What to redesign and what to leave", "How to show design's effect on revenue"],
    askFor: {
      tight: "Tie each proposal to a number the business already tracks, such as conversion or retention. Keep research to what changes a near-term decision.",
      unsettled: "Run quick tests you can act on within weeks, rather than long programs.",
      open: "Ask for the broader research or redesign that tighter periods tend to squeeze.",
    },
  },
  {
    slug: "data-analysts",
    label: "data analysts and scientists",
    title: "Data analysts and scientists",
    areas: ["product-tempo", "burn-discipline"],
    decisions: [
      "Which analyses to put first",
      "Which models and pipelines to keep funding",
      "How to show that an analysis changed a decision",
    ],
    askFor: {
      tight: "Put first the analysis behind a spending or pricing decision being made now, and check which pipelines and models could be retired.",
      unsettled: "Favor analyses that can answer in days, because the question may change.",
      open: "Propose the longer-term models and data work that need a year to pay off.",
    },
  },
  {
    slug: "growth-leaders",
    label: "growth and sales leaders",
    title: "Growth and sales leaders",
    areas: ["expansion-bets", "burn-discipline"],
    decisions: ["Which channels to fund", "How fast to run campaigns", "Which claims to make in public"],
    askFor: {
      tight: "Ask for spend only in channels where the cost per customer is proven, and show the payback.",
      unsettled: "Test with small budgets you could pull within a week.",
      open: "Make the case for more acquisition spend, and keep tracking cost per customer as it grows.",
    },
  },
];

export const findCompanyRole = (slug: string) => COMPANY_ROLES.find((role) => role.slug === slug);

export const askForThisWeek = (role: CompanyRole, regime: RegimeKey): string => role.askFor[MOOD_BY_REGIME[regime]];

/** The bar the general roadmap rule sets this week, from the rule itself. */
export const paybackBarLine = (regime: RegimeKey): string => {
  const bar = resolvePaybackBar(regime, null);
  return bar.kind === "months"
    ? `The general roadmap rule slows anything that pays back in more than ${bar.months} months.`
    : "The general rules set no payback bar on roadmap work this week.";
};
