export type StakeholderGuide = {
  slug: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  tagline: string;
  positioning: string;
  bullets: readonly string[];
};

export const stakeholderGuides: readonly StakeholderGuide[] = [
  {
    slug: "founders-ceos",
    title: "Founders / CEOs",
    seoTitle: "Whether for Founders & CEOs",
    seoDescription:
      "See how founders and CEOs can turn macro volatility into clear operating posture, hiring discipline, and investor-ready communication.",
    tagline: "Lead with confidence as market conditions shift.",
    positioning: "Founder/CEO → Lead with clarity.",
    bullets: [
      "Decide when to accelerate growth and when to protect runway.",
      "Time fundraising conversations to real market conditions.",
      "Keep your leadership team aligned on one operating stance.",
      "Reduce headline-driven debates and emotional decision loops.",
      "Explain strategy to investors with clear, disciplined logic.",
      "Bring stronger capital fluency into board conversations.",
      "Avoid over-hiring in tight cycles and under-investing in expansion cycles.",
      "Turn volatility into structured, repeatable decisions.",
    ],
  },
  {
    slug: "heads-of-product",
    title: "Heads of Product",
    seoTitle: "Whether for Heads of Product",
    seoDescription:
      "Learn how product leaders can align roadmap pace, prioritization, and burn decisions with the current funding climate.",
    tagline: "Connect product strategy to capital reality.",
    positioning: "Head of Product → Prioritize with posture.",
    bullets: [
      "Set roadmap pace based on the current funding climate.",
      "Prioritize work by payback, risk, and exposure—not just demand.",
      "Align product bets with executive and finance expectations.",
      "Resolve growth-versus-efficiency tradeoffs with shared posture language.",
      "Raise the quality of executive memos and review conversations.",
      "Show strategic maturity in promotion and performance discussions.",
      "Manage burn through product choices, not only budget controls.",
      "Shift the question from “What should we build next?” to “How should we operate now?”",
    ],
  },
  {
    slug: "finance-leaders",
    title: "CFOs / Finance Leaders",
    seoTitle: "Whether for CFOs and Finance Leaders",
    seoDescription:
      "Translate rates, risk appetite, and funding climate into practical planning guardrails for cross-functional teams.",
    tagline: "Turn macro conditions into practical operating guardrails.",
    positioning: "CFO/Finance → Convert macro into guardrails.",
    bullets: [
      "Translate rates and risk appetite into planning constraints teams can use.",
      "Align hiring pace and spend posture with current capital conditions.",
      "Create a consistent risk posture across product, engineering, and ops.",
      "Reduce reactive cost-cutting with proactive posture guidance.",
      "Improve capital literacy across cross-functional leadership.",
      "Support board updates with an external, structured reference point.",
      "Frame discipline as environment-aware leadership, not fear-driven cuts.",
      "Replace ad hoc macro interpretation with a repeatable framework.",
    ],
  },
  {
    slug: "strategy-chief-of-staff",
    title: "Strategy / Chief of Staff",
    seoTitle: "Whether for Strategy and Chiefs of Staff",
    seoDescription:
      "Use Whether to create alignment architecture, improve executive narrative quality, and reduce planning entropy during uncertainty.",
    tagline: "Build alignment infrastructure before teams debate tactics.",
    positioning: "Strategy/CoS → Build alignment architecture.",
    bullets: [
      "Introduce a shared external reference point for planning.",
      "Reduce personality-driven planning cycles and narrative drift.",
      "Keep executive storytelling consistent across functions.",
      "Strengthen scenario planning with structured, recurring signals.",
      "Clarify constraints before teams enter tactical tradeoff discussions.",
      "Increase quality and consistency of board-ready materials.",
      "Create coherence across product, finance, and operations.",
      "Lower internal entropy during uncertain markets.",
    ],
  },
  {
    slug: "vps-of-engineering",
    title: "VPs of Engineering",
    seoTitle: "Whether for VPs of Engineering",
    seoDescription:
      "Align engineering capacity, hiring pace, and infrastructure investment with business posture and capital constraints.",
    tagline: "Match engineering capacity to business posture.",
    positioning: "Engineering → Match capacity to capital.",
    bullets: [
      "Know when to emphasize reliability versus delivery speed.",
      "Avoid scaling infrastructure too early during tight capital cycles.",
      "Justify hiring and org-shape decisions with external market context.",
      "Improve planning coordination with product and finance partners.",
      "Reduce whiplash from frequent leadership direction changes.",
      "Tie sprint focus and hiring approvals to operating posture.",
      "Plan platform investments against funding climate realities.",
      "Increase predictability when markets are uncertain.",
    ],
  },
  {
    slug: "boards-investors",
    title: "Boards / Investors",
    seoTitle: "Whether for Boards and Investors",
    seoDescription:
      "Understand management posture in context: hiring pace, burn profile, and strategic exposure relative to market conditions.",
    tagline: "See disciplined exposure management from the leadership team.",
    positioning: "Board/Investors → See disciplined exposure management.",
    bullets: [
      "Evaluate strategy in the context of current capital conditions.",
      "Understand the logic behind hiring pace, burn profile, and risk posture.",
      "Reduce surprises during tightening cycles.",
      "Improve the quality of strategic dialogue with management.",
      "Align expectations with real macro constraints and opportunities.",
      "Encourage expansion when conditions support it and defense when warranted.",
      "Recognize environment-aware execution as a leadership strength.",
      "Track management maturity through consistent capital literacy.",
    ],
  },
] as const;

export const stakeholderPositioning = stakeholderGuides.map((guide) => guide.positioning);

export const findStakeholderGuide = (slug: string) =>
  stakeholderGuides.find((guide) => guide.slug === slug);
