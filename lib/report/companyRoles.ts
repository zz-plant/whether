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
import { SPENDING_PAYBACK_BAR_MONTHS, type DecisionArea } from "./boundedDecisionRules";
import type { OperatorStage } from "./operatorStage";
import type { RegimeKey } from "../regimeEngine";

const BAR = SPENDING_PAYBACK_BAR_MONTHS;

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
  /**
   * What this role does differently at each stage, following that stage's rule. Written per pair,
   * because one line per stage told an IT team to "prove customer pull inside one sprint", and left
   * pages for the same role sharing nine words in ten.
   */
  atStage: Record<OperatorStage, string>;
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
    atStage: {
      seed: "Build what can show customer pull inside one sprint, and flag anything that would take longer before you start.",
      "series-a": "Tie your proposal to a number the company tracks, and avoid starting a second big project before the first shows results.",
      "series-b": "Show how the work improves margin or efficiency this quarter. Work that lowers cost to serve is the easiest to defend here.",
      bootstrapped: `Size work in stages you can stop, and show where the cash comes back inside ${BAR} months.`,
    },
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
    atStage: {
      seed: "Run experiments that prove or kill an idea inside a sprint, and fund one proof of demand at a time.",
      "series-a": "Put spend behind what is already converting better, and run one expansion program at a time so you can tell what paid back.",
      "series-b": "Favor the few areas that are already efficient, and show the margin gain before asking for more.",
      bootstrapped: `Fund roadmap bets from revenue, and pick the ones customers would pay for inside ${BAR} months.`,
    },
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
    atStage: {
      seed: "Ask for a hire only when a milestone has landed or revenue covers it, and keep architecture choices easy to change.",
      "series-a": "Add capacity where sales proof is repeating, and keep platform work tied to what customers already buy.",
      "series-b": "Show the efficiency gain before adding headcount, such as lower cost to serve or fewer incidents.",
      bootstrapped: "Stage platform work so it can pause without breaking operations, and avoid anything that needs outside money to finish.",
    },
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
    atStage: {
      seed: "Test with real customers in short cycles, and leave polish until demand is proven.",
      "series-a": "Aim design work at the conversion the company already measures, one major change at a time so the results stay readable.",
      "series-b": "Show what a redesign does for margin or support cost, not only for conversion.",
      bootstrapped: "Ship changes in small stages, and put research where it affects what customers pay for.",
    },
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
    atStage: {
      seed: "Answer whether customers want this with the simplest data that can, and put off heavy pipelines.",
      "series-a": "Build the reporting that shows which channels pay back, because spending at this stage follows that proof.",
      "series-b": "Measure cost to serve and margin by product, because spending at this stage rests on them.",
      bootstrapped: "Track how fast cash comes back on each investment, and keep tooling costs low.",
    },
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
    atStage: {
      seed: "Test channels cheaply to prove pull, and don't scale one before repeat demand shows up.",
      "series-a": `Fund only channels that convert repeatably and pay back inside ${BAR} months, one expansion program at a time.`,
      "series-b": "Put spend into the few channels already efficient, and show the effect on margin.",
      bootstrapped: "Fund campaigns from revenue, in amounts you could pause next month.",
    },
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
    atStage: {
      seed: "Treat every support conversation as evidence of demand, and pass what you hear to whoever decides what's next.",
      "series-a": "Track which customers renew and why, because expansion at this stage rests on repeatable proof.",
      "series-b": "Show how tooling or process lowers cost to serve while keeping renewals steady.",
      bootstrapped: "Protect renewals first, because revenue funds everything here.",
    },
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
    atStage: {
      seed: "Open a role only after a milestone lands or revenue covers it, and avoid several permanent hires at once.",
      "series-a": "Put first the roles tied to sales proof that is already repeating.",
      "series-b": "Expect each new role to need a margin or efficiency case, and ask for it before opening the search.",
      bootstrapped: "Plan hiring around revenue already coming in, and favor arrangements you could pause.",
    },
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
    atStage: {
      seed: "Keep the cash view simple and current, and tie each hire to the milestone that justifies it.",
      "series-a": `Track payback by channel, and hold new spend to what pays back inside ${BAR} months.`,
      "series-b": "Test each new commitment for a margin gain this quarter, and question fixed cost that assumes valuations recover.",
      bootstrapped: "Watch how fast cash comes back on each investment, and flag anything that would need outside money to finish.",
    },
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
    atStage: {
      seed: "Use tools you can drop easily, and cover what customers require before anything else.",
      "series-a": "Put spending where deals depend on it, such as the security reviews customers ask for.",
      "series-b": "Consolidate overlapping tools, and show what each change saves.",
      bootstrapped: "Buy month to month where you can, and cover obligations before upgrades.",
    },
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
