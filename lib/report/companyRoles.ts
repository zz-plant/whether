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
  /** The question only this role would think to ask whoever runs the company. */
  leadershipQuestion: string;
  /** False keeps a role off the company pages: 50 pages each, added only once those earn their place. */
  onCompanyPages?: false;
};

export const ROLES: readonly CompanyRole[] = [
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
    leadershipQuestion: "Which projects would stop first if cash got tighter?",
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
    leadershipQuestion: "What has to be true for us to fund discovery next quarter?",
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
    leadershipQuestion: "Is reliability work protected if budgets are cut?",
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
    leadershipQuestion: "Which business number should design work be judged against?",
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
    leadershipQuestion: "Which decisions this quarter are waiting on data?",
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
    leadershipQuestion: "What cost per customer would make us stop spending on a channel?",
    askFor: {
      tight: "Ask for spend only in channels where the cost per customer is proven, and show the payback.",
      unsettled: "Test with small budgets you could pull within a week.",
      open: "Make the case for more acquisition spend, and keep tracking cost per customer as it grows.",
    },
  },
  {
    slug: "customer-support",
    label: "customer success and support teams",
    title: "Customer success and support teams",
    areas: ["burn-discipline", "expansion-bets"],
    decisions: ["Which accounts get the most attention", "What to escalate about renewals and churn", "How to make the case for support capacity"],
    leadershipQuestion: "How much revenue renews in the next two quarters, and which of it is in doubt?",
    onCompanyPages: false,
    askFor: {
      tight: "Tie each request to revenue you'd otherwise lose. Keeping customers is easier to fund than new work when money is tight.",
      unsettled: "Flag renewals in doubt early, while budgets can still move.",
      open: "Make the case for capacity ahead of growth, before support falls behind.",
    },
  },
  {
    slug: "recruiters",
    label: "recruiters and people teams",
    title: "Recruiters and people teams",
    areas: ["hiring"],
    decisions: ["Which roles to open first", "How to plan if hiring pauses", "What to tell candidates about the company's plans"],
    leadershipQuestion: "Which open roles would we keep if hiring had to pause?",
    onCompanyPages: false,
    askFor: {
      tight: "Ask which roles have a payback case behind them and fill those first, and plan for the rest being held.",
      unsettled: "Keep pipelines warm, and avoid promising start dates the plan may not hold to.",
      open: "Ask to open roles ahead of demand, while budget is easier to find.",
    },
  },
  {
    slug: "finance-teams",
    label: "finance teams",
    title: "Finance teams",
    areas: ["burn-discipline", "capital-raising"],
    decisions: ["Which commitments to question", "What to put in the forecast", "How early to raise a cash concern"],
    leadershipQuestion: "What would we stop first if revenue came in below plan?",
    onCompanyPages: false,
    askFor: {
      tight: "Question what's hard to reverse, such as multi-year contracts and fixed cost, and run the forecast with revenue below plan.",
      unsettled: "Keep more than one forecast ready, and agree in advance what would move you between them.",
      open: "Check that new spending still has a payback, because easier money can hide a weak case.",
    },
  },
  {
    slug: "it-security",
    label: "IT and security teams",
    title: "IT and security teams",
    areas: ["burn-discipline"],
    decisions: ["Which tools to keep or cut", "How to defend security spending", "What to do with vendor contracts at renewal"],
    leadershipQuestion: "Which security spending is a customer or legal obligation, and which is a choice?",
    onCompanyPages: false,
    askFor: {
      tight: "Go through tools and seats before someone asks, and tie security spending to the risk or obligation it covers. Avoid long contracts.",
      unsettled: "Renew short where you can, so commitments stay reversible.",
      open: "Propose the upgrades you've put off, while budget is easier to find.",
    },
  },
];

export const COMPANY_ROLES: readonly CompanyRole[] = ROLES.filter((role) => role.onCompanyPages !== false);

export const findCompanyRole = (slug: string) => COMPANY_ROLES.find((role) => role.slug === slug);
export const findRole = (slug: string) => ROLES.find((role) => role.slug === slug);

export const askForThisWeek = (role: CompanyRole, regime: RegimeKey): string => role.askFor[MOOD_BY_REGIME[regime]];

/** The bar the general roadmap rule sets this week, from the rule itself. */
export const paybackBarLine = (regime: RegimeKey): string => {
  const bar = resolvePaybackBar(regime, null);
  return bar.kind === "months"
    ? `The general roadmap rule slows anything that pays back in more than ${bar.months} months.`
    : "The general rules set no payback bar on roadmap work this week.";
};
