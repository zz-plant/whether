export type DecisionPageDefinition = {
  slug: string;
  keyword: string;
  title: string;
  shortAnswer: string;
  recommendedActions: string[];
  avoidActions: string[];
  audience: string;
};

export const tierOneDecisionPages: DecisionPageDefinition[] = [
  {
    slug: "should-we-hire-engineers-right-now",
    keyword: "should we hire engineers right now",
    title: "Should We Hire Engineers Right Now?",
    shortAnswer: "Yes — but selectively and with ROI gates.",
    audience: "Founders, VP Engineering, and product leaders deciding near-term team capacity.",
    recommendedActions: [
      "Backfill critical engineering roles that protect release reliability.",
      "Add targeted product-engineering capacity tied to activation or retention.",
      "Require measurable payback inside two quarters before approving net-new headcount.",
      "Prioritize hires that reduce cycle time in validated product areas.",
    ],
    avoidActions: [
      "Large speculative hiring waves.",
      "Platform rebuilds without defined ROI gates.",
      "Hiring ahead of validated demand signals.",
    ],
  },
  {
    slug: "is-it-a-good-time-to-hire-engineers",
    keyword: "is it a good time to hire engineers",
    title: "Is It a Good Time to Hire Engineers?",
    shortAnswer: "Yes for targeted roles; no for blanket growth hiring.",
    audience: "Engineering and finance leaders setting hiring plans.",
    recommendedActions: [
      "Prioritize roles with direct throughput or retention impact.",
      "Use staged offers tied to delivery milestones.",
      "Protect recruiter and interviewer bandwidth for highest-leverage openings.",
    ],
    avoidActions: [
      "Headcount plans based on optimism alone.",
      "Role expansion without measurable demand proof.",
      "Multi-quarter commitments without trigger-based review checkpoints.",
    ],
  },
  {
    slug: "should-startups-hire-right-now",
    keyword: "should startups hire right now",
    title: "Should Startups Hire Right Now?",
    shortAnswer: "Selective hiring is supported when demand proof is real.",
    audience: "Startup founders balancing growth and runway.",
    recommendedActions: [
      "Tie hiring to validated growth levers.",
      "Preserve 1–2 quarter payback discipline.",
      "Sequence offers by mission-critical outcomes, not org chart completeness.",
    ],
    avoidActions: [
      "Scaling teams before PMF evidence is stable.",
      "Adding management layers ahead of execution need.",
      "Treating temporary market optimism as a permanent regime shift.",
    ],
  },
  {
    slug: "should-we-expand-our-team-in-2026",
    keyword: "should we expand our team in 2026",
    title: "Should We Expand Our Team in 2026?",
    shortAnswer: "Expand in controlled increments with explicit rollback triggers.",
    audience: "Executive teams planning annual headcount envelopes.",
    recommendedActions: [
      "Expand in quarterly tranches tied to product and revenue milestones.",
      "Use trigger reversals to halt expansion before burn compounds.",
      "Keep optionality in contractor and fractional capacity.",
    ],
    avoidActions: [
      "Annualized hiring plans that cannot pause mid-cycle.",
      "Expanding every function at once.",
      "Committing to long-cycle spend before evidence updates.",
    ],
  },
  {
    slug: "is-now-a-good-time-to-raise-venture-capital",
    keyword: "is now a good time to raise venture capital",
    title: "Is Now a Good Time to Raise Venture Capital?",
    shortAnswer: "Conditions are supportive, but raise from leverage — not urgency.",
    audience: "Founders preparing fundraising strategy.",
    recommendedActions: [
      "Run a process only after core traction metrics are clean.",
      "Use climate tailwinds to improve terms, not to skip diligence.",
      "Prepare downside plan in case the regime flips.",
    ],
    avoidActions: [
      "Raising with unclear use-of-funds narrative.",
      "Extending process timelines without runway margin.",
      "Assuming risk-on windows stay open indefinitely.",
    ],
  },
  {
    slug: "should-we-raise-funding-right-now",
    keyword: "should we raise funding right now",
    title: "Should We Raise Funding Right Now?",
    shortAnswer: "Raise if it extends strategic optionality and preserves execution speed.",
    audience: "CEO and CFO teams making financing timing calls.",
    recommendedActions: [
      "Quantify runway extension and strategic uses before launching a process.",
      "Align fundraising pacing with product milestones.",
      "Set a minimum acceptable term profile before first meetings.",
    ],
    avoidActions: [
      "Raising because peers are raising.",
      "Accepting weak terms to chase speed without alternatives.",
      "Delaying until a possible risk-off flip compresses options.",
    ],
  },
  {
    slug: "startup-funding-climate-2026",
    keyword: "startup funding climate 2026",
    title: "Startup Funding Climate 2026",
    shortAnswer: "Capital access is open with guardrails; quality signals still matter most.",
    audience: "Operators tracking funding environment and board planning.",
    recommendedActions: [
      "Benchmark valuation expectations against current Treasury and credit signals.",
      "Prepare both base and downside financing plans.",
      "Keep investor updates consistent to reduce process friction.",
    ],
    avoidActions: [
      "Relying on climate headlines instead of company-level evidence.",
      "Ignoring dilution scenarios during favorable windows.",
      "Overextending burn because markets look temporarily open.",
    ],
  },
  {
    slug: "is-the-market-risk-on-or-risk-off-right-now",
    keyword: "is the market risk on or risk off right now",
    title: "Is the Market Risk On or Risk Off Right Now?",
    shortAnswer: "Current posture is expansion with guardrails.",
    audience: "Decision-makers needing a weekly posture call.",
    recommendedActions: [
      "Use posture to set approval velocity and budget cadence.",
      "Escalate only long-cycle bets with milestone gating.",
      "Maintain weekly monitoring for threshold reversals.",
    ],
    avoidActions: [
      "Treating one positive print as a permanent state.",
      "Ignoring tightness even when risk appetite is strong.",
      "Running planning cycles without explicit flip conditions.",
    ],
  },
  {
    slug: "capital-tightness-right-now",
    keyword: "capital tightness right now",
    title: "Capital Tightness Right Now",
    shortAnswer: "Tightness is currently low, so near-term liquidity pressure is contained.",
    audience: "CFO and operations leaders deciding spend pace.",
    recommendedActions: [
      "Use low tightness to execute validated investments faster.",
      "Preserve a spend gate for projects without short-cycle payback.",
      "Monitor weekly for abrupt credit spread changes.",
    ],
    avoidActions: [
      "Conflating low tightness with unlimited capital access.",
      "Dropping guardrails on discretionary hiring and vendor spend.",
      "Ignoring downside triggers because current data is favorable.",
    ],
  },
  {
    slug: "should-we-slow-hiring-in-a-risk-off-market",
    keyword: "should we slow hiring in a risk off market",
    title: "Should We Slow Hiring in a Risk-Off Market?",
    shortAnswer: "Yes — shift to critical backfills and ROI-proven roles when risk turns off.",
    audience: "Leadership teams preparing contingency hiring policies.",
    recommendedActions: [
      "Predefine risk-off hiring policy before thresholds are crossed.",
      "Protect reliability and revenue-adjacent staffing first.",
      "Pause speculative hiring until two stronger reads return.",
    ],
    avoidActions: [
      "Maintaining expansion hiring pace after a regime flip.",
      "Freezing all hiring without identifying mission-critical exceptions.",
      "Waiting for board pressure before introducing controls.",
    ],
  },
];

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

export const findDecisionPage = (slug: string) =>
  tierOneDecisionPages.find((page) => page.slug === slug);
