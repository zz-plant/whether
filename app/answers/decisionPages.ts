import type { DecisionArea } from "../../lib/report/boundedDecisionRules";

export type AnswerCategory = "climate" | "decision" | "explanation";

export type DecisionPageDefinition = {
  slug: string;
  keyword: string;
  title: string;
  category: AnswerCategory;
  shortAnswer: string;
  directAnswer: string;
  audience: string;
  mappedDecisionAreas: DecisionArea[];
  thresholdFocus: "tightness" | "risk" | "both";
};

export const answerPages: DecisionPageDefinition[] = [
  {
    slug: "startup-funding-climate-this-week",
    keyword: "startup funding climate this week",
    title: "Startup Funding Climate This Week",
    category: "climate",
    shortAnswer: "Funding is open with guardrails, not universally easy.",
    directAnswer: "Run financing decisions with term quality gates while the window is open.",
    audience: "Founders, CFO, board operators",
    mappedDecisionAreas: ["capital-raising", "burn-discipline"],
    thresholdFocus: "both",
  },
  {
    slug: "is-it-risk-on-or-risk-off-for-startups",
    keyword: "is it risk-on or risk-off for startups",
    title: "Is It Risk-On or Risk-Off for Startups?",
    category: "climate",
    shortAnswer: "Current read is expansion with guardrails.",
    directAnswer: "Move faster on reversible bets; keep stop conditions explicit.",
    audience: "Leadership teams",
    mappedDecisionAreas: ["expansion-bets", "product-tempo", "burn-discipline"],
    thresholdFocus: "both",
  },
  {
    slug: "startup-market-outlook",
    keyword: "startup market outlook",
    title: "Startup Market Outlook",
    category: "climate",
    shortAnswer: "Near-term outlook supports execution, but reversal risk remains live.",
    directAnswer: "Prioritize decisions you can reverse in one quarter if thresholds flip.",
    audience: "Founders and operating staff",
    mappedDecisionAreas: ["product-tempo", "expansion-bets"],
    thresholdFocus: "both",
  },
  {
    slug: "is-venture-funding-recovering",
    keyword: "is venture funding recovering",
    title: "Is Venture Funding Recovering?",
    category: "climate",
    shortAnswer: "Recovery is visible, but quality and discipline still separate outcomes.",
    directAnswer: "Treat recovery as a conditional window, not a permanent shift.",
    audience: "CEO/CFO teams",
    mappedDecisionAreas: ["capital-raising", "burn-discipline"],
    thresholdFocus: "risk",
  },
  {
    slug: "tech-funding-environment",
    keyword: "tech funding environment",
    title: "Tech Funding Environment",
    category: "climate",
    shortAnswer: "Capital is available for durable stories with clean unit economics.",
    directAnswer: "If raising, tighten narrative and downside discipline before launch.",
    audience: "Tech operators",
    mappedDecisionAreas: ["capital-raising", "burn-discipline", "expansion-bets"],
    thresholdFocus: "both",
  },
  {
    slug: "startup-hiring-trends",
    keyword: "startup hiring trends",
    title: "Startup Hiring Trends",
    category: "climate",
    shortAnswer: "Hiring is selective and role-specific rather than broad-based.",
    directAnswer: "Concentrate hiring in reliability and revenue-adjacent bottlenecks.",
    audience: "Founders and VP Eng/Product",
    mappedDecisionAreas: ["hiring", "product-tempo"],
    thresholdFocus: "both",
  },
  {
    slug: "should-startups-hire-engineers-right-now",
    keyword: "should startups hire engineers right now",
    title: "Should Startups Hire Engineers Right Now?",
    category: "decision",
    shortAnswer: "Yes for selective roles with short-cycle ROI proof.",
    directAnswer: "Approve only roles tied to delivery reliability or near-term revenue impact.",
    audience: "VP Engineering and founders",
    mappedDecisionAreas: ["hiring", "product-tempo", "burn-discipline"],
    thresholdFocus: "both",
  },
  {
    slug: "should-startups-slow-product-development",
    keyword: "should startups slow product development",
    title: "Should Startups Slow Product Development?",
    category: "decision",
    shortAnswer: "Slow speculative scope, not core delivery tempo.",
    directAnswer: "Keep shipping core roadmap work; pause long-payback bets if thresholds weaken.",
    audience: "Product and engineering leaders",
    mappedDecisionAreas: ["product-tempo", "expansion-bets"],
    thresholdFocus: "risk",
  },
  {
    slug: "should-startups-raise-capital-now",
    keyword: "should startups raise capital now",
    title: "Should Startups Raise Capital Now?",
    category: "decision",
    shortAnswer: "Raise when it extends strategic optionality and preserves terms.",
    directAnswer: "If your next 12 months depend on financing certainty, start now from leverage.",
    audience: "CEO/CFO",
    mappedDecisionAreas: ["capital-raising", "burn-discipline"],
    thresholdFocus: "both",
  },
  {
    slug: "when-should-startups-cut-burn",
    keyword: "when should startups cut burn",
    title: "When Should Startups Cut Burn?",
    category: "decision",
    shortAnswer: "Cut burn when tightness worsens and raise-window strength weakens together.",
    directAnswer: "Pre-commit spend brakes before crossing tighter capital thresholds.",
    audience: "Finance and operations leaders",
    mappedDecisionAreas: ["burn-discipline", "capital-raising"],
    thresholdFocus: "tightness",
  },
  {
    slug: "product-strategy-during-downturn",
    keyword: "product strategy during downturn",
    title: "Product Strategy During Downturn",
    category: "decision",
    shortAnswer: "Defend core retention and conversion; defer speculative platform bets.",
    directAnswer: "Concentrate roadmap on short-cycle outcomes with reversible execution plans.",
    audience: "VP Product",
    mappedDecisionAreas: ["product-tempo", "burn-discipline", "expansion-bets"],
    thresholdFocus: "risk",
  },
  {
    slug: "product-strategy-during-expansion",
    keyword: "product strategy during expansion",
    title: "Product Strategy During Expansion",
    category: "decision",
    shortAnswer: "Speed up validated bets while keeping rollback criteria live.",
    directAnswer: "Use expansion windows to increase tempo on reversible, milestone-gated initiatives.",
    audience: "Product org leaders",
    mappedDecisionAreas: ["product-tempo", "expansion-bets"],
    thresholdFocus: "both",
  },
  {
    slug: "when-to-expand-startup-hiring",
    keyword: "when to expand startup hiring",
    title: "When to Expand Startup Hiring",
    category: "decision",
    shortAnswer: "Expand only after threshold headroom and role-level payback validation.",
    directAnswer: "Move from selective to expanded hiring once both risk and tightness remain supportive.",
    audience: "Founders and HR/Finance",
    mappedDecisionAreas: ["hiring", "burn-discipline"],
    thresholdFocus: "both",
  },
  {
    slug: "startup-strategy-in-uncertain-markets",
    keyword: "startup strategy in uncertain markets",
    title: "Startup Strategy in Uncertain Markets",
    category: "decision",
    shortAnswer: "Prefer reversible decisions and tighter review cadence.",
    directAnswer: "Set explicit pause/resume thresholds for every major commitment.",
    audience: "Cross-functional exec teams",
    mappedDecisionAreas: ["expansion-bets", "burn-discipline", "capital-raising"],
    thresholdFocus: "both",
  },
  {
    slug: "how-macro-conditions-affect-startups",
    keyword: "how macro conditions affect startups",
    title: "How Macro Conditions Affect Startups",
    category: "explanation",
    shortAnswer: "Macro conditions set approval speed, capital flexibility, and risk tolerance.",
    directAnswer: "Translate signals into operating policy for hiring, roadmap tempo, and spend approvals.",
    audience: "Operators new to macro-to-decision translation",
    mappedDecisionAreas: ["hiring", "product-tempo", "burn-discipline"],
    thresholdFocus: "both",
  },
  {
    slug: "how-interest-rates-affect-startups",
    keyword: "how interest rates affect startups",
    title: "How Interest Rates Affect Startups",
    category: "explanation",
    shortAnswer: "Rate shifts change capital tightness and investor risk appetite.",
    directAnswer: "When rates pressure financing conditions, tighten burn and defer irreversible bets.",
    audience: "Finance and strategy teams",
    mappedDecisionAreas: ["capital-raising", "burn-discipline", "expansion-bets"],
    thresholdFocus: "tightness",
  },
  {
    slug: "venture-funding-cycle-explained",
    keyword: "venture funding cycle explained",
    title: "Venture Funding Cycle Explained",
    category: "explanation",
    shortAnswer: "Funding cycles are pacing inputs for when to accelerate versus protect runway.",
    directAnswer: "Use weekly regime and thresholds to decide whether to press growth or preserve optionality.",
    audience: "Founders and staff leaders",
    mappedDecisionAreas: ["capital-raising", "hiring", "burn-discipline"],
    thresholdFocus: "risk",
  },
  {
    slug: "how-macro-affects-product-strategy",
    keyword: "how macro affects product strategy",
    title: "How Macro Affects Product Strategy",
    category: "explanation",
    shortAnswer: "Macro primarily changes roadmap tempo and reversibility requirements.",
    directAnswer: "Stage strategy by threshold headroom: speed with guardrails in expansion, protect core in tighter reads.",
    audience: "Product and engineering leadership",
    mappedDecisionAreas: ["product-tempo", "expansion-bets"],
    thresholdFocus: "both",
  },
  {
    slug: "how-to-brief-executives-on-market-conditions",
    keyword: "how to brief executives on market conditions",
    title: "How to Brief Executives on Market Conditions",
    category: "explanation",
    shortAnswer: "Lead with decision delta, bounded rules, and flip triggers.",
    directAnswer: "Use a one-screen brief: what changed, what to revisit, what pauses/resumes, and what flips the call.",
    audience: "Chief of staff, strategy, and ops",
    mappedDecisionAreas: ["burn-discipline", "capital-raising", "product-tempo"],
    thresholdFocus: "both",
  },
];

export const answerCategories: Array<{ key: AnswerCategory; label: string }> = [
  { key: "decision", label: "Decision calls" },
  { key: "climate", label: "Climate reads" },
  { key: "explanation", label: "Explanation" },
];

// Backward-compatible aliases for existing consumers while answer pages migrate
// to the canonical category model.
export const tierOneDecisionPages = answerPages;

export const tierTwoKeywords = [
  "product strategy in a risk off market",
  "how to operate in expansion mode startup",
  "startup strategy during capital scarcity",
  "engineering hiring during recession",
  "how does yield curve affect startups",
];

export const tierThreeKeywords = [
  "yield curve inversion startup impact",
  "bbb credit spread impact on startups",
  "treasury rates and saas valuations",
  "venture capital risk appetite indicator",
  "best time to hire engineers macro conditions",
];

export const findDecisionPage = (slug: string) => answerPages.find((page) => page.slug === slug);
