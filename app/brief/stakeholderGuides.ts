import { stageGuides } from "./stageGuides";

export type StakeholderGuide = {
  slug: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  tagline: string;
  positioning: string;
  bullets: readonly string[];
  stageSpecificContent: readonly {
    stageSlug: (typeof stageGuides)[number]["slug"];
    guidance: string;
  }[];
  promotionAccelerator?: {
    title: string;
    summary: string;
    signals: readonly string[];
  };
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
    stageSpecificContent: [
      {
        stageSlug: "seed",
        guidance:
          "Use Whether for investor narrative clarity and fundraising timing language, while keeping product learning velocity as the primary driver.",
      },
      {
        stageSlug: "series-a",
        guidance:
          "Set 6–8 week guardrails for hiring pace and burn so the company scales with posture, not optimism swings.",
      },
      {
        stageSlug: "series-b",
        guidance:
          "Pair with your CFO on a single operating baseline to prevent planning politics across functions.",
      },
      {
        stageSlug: "series-c",
        guidance:
          "Use posture language as governance infrastructure so board narrative, planning approvals, and major investments stay coherent.",
      },
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
    stageSpecificContent: [
      {
        stageSlug: "seed",
        guidance:
          "If you are the first product leader, keep posture simple: tie roadmap ambition to runway and avoid abstract macro theater.",
      },
      {
        stageSlug: "series-a",
        guidance:
          "Translate posture into explicit sequencing: short-payback bets first, defer long-horizon exposure unless conditions improve.",
      },
      {
        stageSlug: "series-b",
        guidance:
          "Frame roadmap choices as exposure management so Product, Finance, and Engineering debate parameters, not personalities.",
      },
      {
        stageSlug: "series-c",
        guidance:
          "Use multi-quarter posture language and exit criteria so major roadmap commitments are board-defensible.",
      },
    ],
    promotionAccelerator: {
      title: "Promotion accelerant: PM → Head of Product",
      summary:
        "The leap is not better taste. It is proving you can set posture, manage exposure, align functions, and write memos leadership can reuse.",
      signals: [
        "Senior PM → Group PM: portfolio language replaces feature-by-feature arguments.",
        "Group PM → Director: you run cross-team operating cadence and guardrails.",
        "Director → Head/VP Product: roadmap becomes capital allocation under constraints.",
      ],
    },
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
    stageSpecificContent: [
      {
        stageSlug: "seed",
        guidance:
          "Keep macro guidance lightweight and narrative-oriented so founders can fundraise without overfitting the model.",
      },
      {
        stageSlug: "series-a",
        guidance:
          "Set practical guardrails for hiring and spend to avoid scaling burn before repeatable growth exists.",
      },
      {
        stageSlug: "series-b",
        guidance:
          "Partner with CEO and Product on one baseline so financial rigor informs roadmap decisions early.",
      },
      {
        stageSlug: "series-c",
        guidance:
          "Standardize posture and board language across quarters to strengthen governance confidence.",
      },
    ],
    promotionAccelerator: {
      title: "Promotion accelerant: Finance Manager → Director FP&A / CFO-track",
      summary:
        "Show the CFO muscle by translating external constraints into operating guardrails teams adopt, not just forecasts they read.",
      signals: [
        "Create assumptions that Product, Eng, and Sales can use in planning.",
        "Tie hiring, burn gates, and payback expectations to one narrative.",
        "Improve board narrative consistency with reusable posture language.",
      ],
    },
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
    stageSpecificContent: [
      {
        stageSlug: "seed",
        guidance:
          "Codify simple founder-facing posture language so investor messaging remains calm and consistent.",
      },
      {
        stageSlug: "series-a",
        guidance:
          "Run a recurring 6–8 week posture memo that aligns leadership before quarterly plans are drafted.",
      },
      {
        stageSlug: "series-b",
        guidance:
          "Use Whether as the planning baseline to lower strategy drift and reduce coordination overhead.",
      },
      {
        stageSlug: "series-c",
        guidance:
          "Treat posture as narrative infrastructure across executive reviews, board prep, and investor communication.",
      },
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
    stageSpecificContent: [
      {
        stageSlug: "seed",
        guidance:
          "Keep team shape lean and bias toward shipping; reliability investment should match actual customer risk.",
      },
      {
        stageSlug: "series-a",
        guidance:
          "Set capacity guardrails so reliability and roadmap commitments stay feasible with current hiring pace.",
      },
      {
        stageSlug: "series-b",
        guidance:
          "Anchor engineering investment to shared posture to prevent whiplash between growth pushes and cost controls.",
      },
      {
        stageSlug: "series-c",
        guidance:
          "Translate climate posture into governance for commitments, hiring bars, and infrastructure spend.",
      },
    ],
    promotionAccelerator: {
      title: "Promotion accelerant: VP Eng / Director Eng → CTO-scope",
      summary:
        "Scope expansion happens when you can run delivery, reliability, and hiring as a constraint-aware system.",
      signals: [
        "Reliability posture is framed as operating risk management.",
        "Capacity planning and hiring bars map to explicit guardrails.",
        "Tradeoff governance is transparent and reusable across teams.",
      ],
    },
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
    stageSpecificContent: [
      {
        stageSlug: "seed",
        guidance:
          "Look for narrative maturity without over-rotation: product signal should still dominate company direction.",
      },
      {
        stageSlug: "series-a",
        guidance:
          "Assess whether management can hold hiring and burn posture under pressure.",
      },
      {
        stageSlug: "series-b",
        guidance:
          "Expect explicit exposure management and coherent cross-functional planning assumptions.",
      },
      {
        stageSlug: "series-c",
        guidance:
          "Use posture consistency as a proxy for governance quality and strategic control.",
      },
    ],
  },
] as const;

export const stakeholderPositioning = stakeholderGuides.map((guide) => guide.positioning);

export const findStakeholderGuide = (slug: string) =>
  stakeholderGuides.find((guide) => guide.slug === slug);
