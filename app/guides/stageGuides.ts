export type StageGuide = {
  slug: string;
  title: string;
  teamSize: string;
  primaryValue: string;
  operationalLeverage: "Low" | "Medium" | "High" | "Very high";
  narrativeLeverage: "Medium" | "High" | "Very high";
  summary: string;
  whoBenefitsMost: readonly string[];
  bestUse: string;
  failureMode?: string;
  seoTitle: string;
  seoDescription: string;
};

export const stageGuides: readonly StageGuide[] = [
  {
    slug: "seed",
    title: "Seed",
    teamSize: "0–15 people",
    primaryValue: "Investor narrative + sanity check",
    operationalLeverage: "Low",
    narrativeLeverage: "Medium",
    summary:
      "At seed, Whether helps founders explain timing and posture without letting macro become an excuse to avoid core product truth.",
    whoBenefitsMost: [
      "Founder/CEO fundraising who needs a calm and credible timing narrative.",
    ],
    bestUse: "Use concise posture language for investor updates and fundraising conversations.",
    failureMode:
      "Overusing macro framing to avoid product and customer decisions that still matter most at this stage.",
    seoTitle: "Whether for Seed Stage Startups",
    seoDescription:
      "Seed-stage macro posture guidance for fundraising narrative, hiring discipline, and founder decision clarity.",
  },
  {
    slug: "series-a",
    title: "Series A",
    teamSize: "15–50 people",
    primaryValue: "Posture discipline before you scale mistakes",
    operationalLeverage: "Medium",
    narrativeLeverage: "Medium",
    summary:
      "At Series A, Whether sets 6–8 week operating guardrails across hiring, burn, and roadmap pacing before expensive patterns lock in.",
    whoBenefitsMost: [
      "Founder/CEO setting hiring pace and burn posture.",
      "First Head of Product arguing from constraints, not preference.",
    ],
    bestUse: "Define a short-cycle operating posture with explicit guardrails and adaptation triggers.",
    seoTitle: "Whether for Series A Companies",
    seoDescription:
      "Series A operating posture guidance to set hiring, burn, and roadmap guardrails before planning entropy compounds.",
  },
  {
    slug: "series-b",
    title: "Series B",
    teamSize: "50–150 people",
    primaryValue: "Delete planning entropy",
    operationalLeverage: "High",
    narrativeLeverage: "High",
    summary:
      "Series B is the leverage sweet spot: Whether creates a shared baseline across Product, Finance, and leadership so planning debates stay objective.",
    whoBenefitsMost: [
      "CEO and CFO pairing on one operating baseline.",
      "Head of Product calibrating roadmap aggressiveness.",
      "Strategy or Chief of Staff reducing alignment drift.",
    ],
    bestUse: "Use Whether to anchor planning cadence, investor updates, and cross-functional tradeoff decisions.",
    seoTitle: "Whether for Series B Planning",
    seoDescription:
      "Series B climate posture guidance for CEO, CFO, and Product alignment, reducing planning entropy and board narrative drift.",
  },
  {
    slug: "series-c",
    title: "Series C / Pre-IPO",
    teamSize: "150–500+ people",
    primaryValue: "Operating governance + narrative infrastructure",
    operationalLeverage: "Very high",
    narrativeLeverage: "Very high",
    summary:
      "At Series C and pre-IPO scale, Whether supports governance-level posture, board coherence, and defensible capital discipline.",
    whoBenefitsMost: [
      "CFO setting guardrails and board language.",
      "CEO keeping quarter-to-quarter decision coherence.",
      "Head of Product managing multi-quarter exposure.",
      "IR, Strategy, and Chief of Staff standardizing narrative.",
    ],
    bestUse: "Set a standardized planning baseline and exportable board-ready rationale.",
    seoTitle: "Whether for Series C and Pre-IPO Teams",
    seoDescription:
      "Series C and pre-IPO operating posture guidance for governance, quarterly planning, and consistent board-grade narrative.",
  },
] as const;

export const findStageGuide = (slug: string) =>
  stageGuides.find((guide) => guide.slug === slug);
