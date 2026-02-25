import monthlySummaries from "../data/monthly_summaries_2012_2025.json";
import type { RegimeKey } from "./regimeEngine";

type MonthlySummaryEntry = {
  year: number;
  month: number;
  asOf: string;
  summary: {
    regime: RegimeKey;
    regimeLabel: string;
    summary: string;
    guidance: string;
    constraints: string[];
    recordDateLabel: string | null;
    inputs: Array<{
      id: string;
      label: string;
      value: number;
      unit: string;
    }>;
  };
};

export type ProductConceptEra =
  | "Foundational classics"
  | "Process & strategy shifters"
  | "Modern AI era"
  | "Career & identity frameworks"
  | "Behavioral psychology & user growth"
  | "Tactical masterclasses"
  | "Institutional friction";

export type ProductConceptArticle = {
  slug: string;
  title: string;
  author: string;
  publishedYear: number;
  publishedMonth: number;
  era: ProductConceptEra;
  focus: "Identity" | "Execution" | "Strategy" | "Future-proofing";
  audience: string;
  sourceUrl: string;
  summary: string;
  whyItMattered: string;
  demystificationPrompt: string;
};

const entries = monthlySummaries as MonthlySummaryEntry[];

export const productConceptArticles: ProductConceptArticle[] = [
  {
    slug: "what-exactly-is-a-product-manager",
    title: "What, exactly, is a Product Manager?",
    author: "Martin Eriksson",
    publishedYear: 2011,
    publishedMonth: 7,
    era: "Foundational classics",
    focus: "Identity",
    audience: "New PMs / Career starters",
    sourceUrl: "https://www.mindtheproduct.com/what-exactly-is-a-product-manager/",
    summary:
      "Popularized the PM Venn diagram (UX, technology, business) as a practical job definition.",
    whyItMattered:
      "It gave high-growth software teams shared language for PM scope during a period of broad digital expansion.",
    demystificationPrompt:
      "Did this framing rise because teams suddenly needed cross-functional translators while capital and product surface area were both growing quickly?",
  },
  {
    slug: "good-product-manager-bad-product-manager",
    title: "Good Product Manager/Bad Product Manager",
    author: "Ben Horowitz",
    publishedYear: 2012,
    publishedMonth: 4,
    era: "Foundational classics",
    focus: "Identity",
    audience: "New PMs / Career starters",
    sourceUrl: "https://a16z.com/good-product-manager-bad-product-manager/",
    summary:
      "A durable PM contrast piece that sharpened accountability expectations and fueled the CEO-of-product debate.",
    whyItMattered:
      "As software orgs scaled, leaders needed clearer ownership boundaries between product, design, and engineering.",
    demystificationPrompt:
      "Was this article most useful as a management control mechanism during a period where execution speed was prized?",
  },
  {
    slug: "how-to-hire-a-product-manager",
    title: "How to Hire a Product Manager",
    author: "Ken Norton",
    publishedYear: 2012,
    publishedMonth: 10,
    era: "Foundational classics",
    focus: "Identity",
    audience: "New PMs / Career starters",
    sourceUrl: "https://www.bringthedonuts.com/essays/productmanager.html",
    summary:
      "Framed PM hiring around judgment, communication, and synthesis instead of pure domain pedigree.",
    whyItMattered:
      "It became the template for hiring loops when many teams were building PM functions from scratch.",
    demystificationPrompt:
      "Did companies emphasize PM soft-signal detection because role definitions were still immature and experimentation budgets were high?",
  },
  {
    slug: "product-strategy-means-saying-no",
    title: "Product strategy means saying no",
    author: "Des Traynor",
    publishedYear: 2013,
    publishedMonth: 8,
    era: "Foundational classics",
    focus: "Strategy",
    audience: "Product leaders / Directors",
    sourceUrl: "https://www.intercom.com/blog/product-strategy-means-saying-no/",
    summary:
      "Argued that coherence comes from deliberate exclusion, not idea generation volume.",
    whyItMattered:
      "As SaaS apps ballooned in scope, teams needed clearer constraint discipline to avoid roadmap sprawl.",
    demystificationPrompt:
      "Was strategy language becoming a response to complexity debt as product lines expanded under favorable markets?",
  },
  {
    slug: "the-alternative-to-roadmaps",
    title: "The Alternative to Roadmaps",
    author: "Marty Cagan",
    publishedYear: 2015,
    publishedMonth: 11,
    era: "Process & strategy shifters",
    focus: "Strategy",
    audience: "Product leaders / Directors",
    sourceUrl: "https://www.svpg.com/the-alternative-to-roadmaps/",
    summary:
      "Advanced outcome-oriented planning over feature commitment plans.",
    whyItMattered:
      "It helped organizations separate strategic intent from delivery certainty as uncertainty increased.",
    demystificationPrompt:
      "Did outcome framing gain traction because confidence in long fixed plans weakened as macro conditions became less predictable?",
  },
  {
    slug: "escaping-the-build-trap",
    title: "Escaping the Build Trap",
    author: "Melissa Perri",
    publishedYear: 2016,
    publishedMonth: 9,
    era: "Process & strategy shifters",
    focus: "Execution",
    audience: "Mid-level PMs / Individual contributors",
    sourceUrl: "https://www.amazon.com/Escaping-Build-Trap-Effective-Management/dp/149197379X",
    summary:
      "Shifted PM performance from output volume to measurable customer and business outcomes.",
    whyItMattered:
      "It named a common anti-pattern in mature SaaS orgs where shipping cadence outpaced value capture.",
    demystificationPrompt:
      "Did this idea resonate as budgets tightened and leaders demanded stronger evidence that shipped work changed outcomes?",
  },
  {
    slug: "continuous-discovery",
    title: "Continuous Discovery",
    author: "Teresa Torres",
    publishedYear: 2016,
    publishedMonth: 12,
    era: "Process & strategy shifters",
    focus: "Execution",
    audience: "Mid-level PMs / Individual contributors",
    sourceUrl: "https://www.producttalk.org/continuous-discovery-habits/",
    summary:
      "Codified weekly customer learning loops and later the Opportunity Solution Tree approach.",
    whyItMattered:
      "It gave teams a repeatable alternative to opinion-led roadmap arguments.",
    demystificationPrompt:
      "Did discovery habits spread because risk tolerance dropped and teams needed faster proof before full delivery investment?",
  },
  {
    slug: "mvpm-minimum-viable-product-manager",
    title: "MVPM: Minimum Viable Product Manager",
    author: "Brandon Chu",
    publishedYear: 2018,
    publishedMonth: 6,
    era: "Process & strategy shifters",
    focus: "Execution",
    audience: "Mid-level PMs / Individual contributors",
    sourceUrl: "https://www.brandonchu.com/blog/minimum-viable-product-manager",
    summary:
      "Distilled PM craft into a concise baseline skill stack for high-velocity teams.",
    whyItMattered:
      "It provided role clarity during a period of PM title inflation and inconsistent expectations.",
    demystificationPrompt:
      "Was a stripped-down PM model a pragmatic response to growth-era hiring surges and uneven role onboarding?",
  },
  {
    slug: "the-product-momentum-gap",
    title: "The Product Momentum Gap",
    author: "Andrea Saez & Dave Martin",
    publishedYear: 2024,
    publishedMonth: 5,
    era: "Modern AI era",
    focus: "Strategy",
    audience: "Senior leaders / Innovators",
    sourceUrl: "https://www.reforge.com/blog/product-momentum-gap",
    summary:
      "Explained why products stall after initial PMF and how organizations can re-accelerate.",
    whyItMattered:
      "Leaders used it to diagnose plateau risk as post-zero-rate growth assumptions broke down.",
    demystificationPrompt:
      "Did momentum language emerge because capital efficiency expectations rose while easy growth channels weakened?",
  },
  {
    slug: "the-ai-product-playbook",
    title: "The AI Product Playbook",
    author: "Marily Nika",
    publishedYear: 2025,
    publishedMonth: 2,
    era: "Modern AI era",
    focus: "Future-proofing",
    audience: "Senior leaders / Innovators",
    sourceUrl: "https://www.marilynika.com/",
    summary:
      "A practical operating model for shipping probabilistic AI product experiences safely.",
    whyItMattered:
      "It translated AI hype into execution patterns around trust, evaluation, and guardrails.",
    demystificationPrompt:
      "Did AI playbooks become mainstream once teams needed to justify model risk, latency, and cost under tighter operating scrutiny?",
  },
  {
    slug: "roadmaps-out-principles-and-ai-prototypes-in",
    title: "Roadmaps Are Out, Product Principles and AI Prototypes Are In",
    author: "Industry synthesis",
    publishedYear: 2026,
    publishedMonth: 1,
    era: "Modern AI era",
    focus: "Future-proofing",
    audience: "Senior leaders / Innovators",
    sourceUrl: "https://www.intercom.com/blog/",
    summary:
      "Captures the shift toward principle-led planning and rapid AI-assisted prototyping loops.",
    whyItMattered:
      "Teams are replacing annual feature certainty with continuous model-informed iteration.",
    demystificationPrompt:
      "Is principle-led planning a structural response to volatile assumptions and faster technology half-lives?",
  },
  {
    slug: "pm-levels-career-ladder",
    title: "The PM Levels / Career Ladder",
    author: "Intercom, Figma and peers",
    publishedYear: 2019,
    publishedMonth: 7,
    era: "Career & identity frameworks",
    focus: "Identity",
    audience: "PMs planning promotion and scope growth",
    sourceUrl: "https://progression.fyi/",
    summary:
      "Public PM ladders normalized competency-based progression over tenure-only promotion logic.",
    whyItMattered:
      "PM orgs used these ladders to calibrate expectations around scope, insight quality, and influence.",
    demystificationPrompt:
      "Did ladder frameworks spread as teams needed fairer performance systems during scale and efficiency pressure?",
  },
  {
    slug: "most-difficult-job-youll-ever-love",
    title: "Product Management: The Most Difficult Job You’ll Ever Love",
    author: "Ken Norton",
    publishedYear: 2016,
    publishedMonth: 2,
    era: "Career & identity frameworks",
    focus: "Identity",
    audience: "PMs and cross-functional leaders",
    sourceUrl: "https://www.bringthedonuts.com/essays/",
    summary:
      "A candid reflection on PM emotional load, ambiguity, and burnout risk.",
    whyItMattered:
      "It became a shared empathy artifact for teams under sustained delivery pressure.",
    demystificationPrompt:
      "Did this resonate because PMs were absorbing rising coordination overhead while organizational stakes increased?",
  },
  {
    slug: "the-two-types-of-pms",
    title: "The Two Types of PMs",
    author: "Ben Evans",
    publishedYear: 2020,
    publishedMonth: 6,
    era: "Career & identity frameworks",
    focus: "Identity",
    audience: "Hiring managers and PMs in role transition",
    sourceUrl: "https://www.ben-evans.com/benedictevans?category=Product",
    summary:
      "Contrasted optimization-oriented PMs with visionary invention-oriented PMs.",
    whyItMattered:
      "It sharpened hiring and role design conversations when companies mixed incompatible expectations into one title.",
    demystificationPrompt:
      "Was this taxonomy useful because companies needed tighter role clarity as growth models matured?",
  },
  {
    slug: "psychology-of-product-growth",
    title: "The Psychology of Product Growth",
    author: "Growth.design",
    publishedYear: 2021,
    publishedMonth: 4,
    era: "Behavioral psychology & user growth",
    focus: "Execution",
    audience: "Growth PMs and product designers",
    sourceUrl: "https://growth.design/",
    summary:
      "Visual case-study series translating behavioral psychology into product growth patterns.",
    whyItMattered:
      "The format made complex behavior-change mechanics practical for fast-moving product teams.",
    demystificationPrompt:
      "Did psychology-first growth spread as pure acquisition became more expensive and retention leverage mattered more?",
  },
  {
    slug: "how-to-build-a-habit-forming-product",
    title: "How to Build a Habit-Forming Product",
    author: "Nir Eyal",
    publishedYear: 2012,
    publishedMonth: 12,
    era: "Behavioral psychology & user growth",
    focus: "Execution",
    audience: "Consumer and productivity PMs",
    sourceUrl: "https://www.nirandfar.com/how-to-manufacture-desire/",
    summary:
      "Introduced the Hook Model for recurring user behavior in software products.",
    whyItMattered:
      "It gave teams a shared language for retention loops and repeat engagement design.",
    demystificationPrompt:
      "Did habit frameworks gain traction because sticky engagement became a core growth moat in maturing markets?",
  },
  {
    slug: "retention-is-king",
    title: "Retention is King",
    author: "Brian Balfour",
    publishedYear: 2013,
    publishedMonth: 5,
    era: "Behavioral psychology & user growth",
    focus: "Execution",
    audience: "B2B and B2C growth teams",
    sourceUrl: "https://brianbalfour.com/essays",
    summary:
      "Argued that acquisition efficiency collapses when retention remains leaky.",
    whyItMattered:
      "It reset growth priorities from top-of-funnel obsession to lifecycle durability.",
    demystificationPrompt:
      "Was retention-first strategy a correction to growth spending that failed to compound lasting value?",
  },
  {
    slug: "the-mom-test",
    title: "The Mom Test",
    author: "Rob Fitzpatrick",
    publishedYear: 2013,
    publishedMonth: 6,
    era: "Tactical masterclasses",
    focus: "Execution",
    audience: "Founders and discovery PMs",
    sourceUrl: "https://momtestbook.com/",
    summary:
      "Codified customer interview techniques that avoid biased, leading validation questions.",
    whyItMattered:
      "It offered a practical anti-vanity framework for early product discovery.",
    demystificationPrompt:
      "Did this method spread because teams needed tighter evidence standards before committing scarce engineering time?",
  },
  {
    slug: "how-to-write-a-good-prd",
    title: "How to Write a Good PRD",
    author: "Kevin Yien",
    publishedYear: 2020,
    publishedMonth: 9,
    era: "Tactical masterclasses",
    focus: "Execution",
    audience: "PMs collaborating with engineering and design",
    sourceUrl: "https://www.figma.com/blog/product/",
    summary:
      "Reframed PRDs around problem framing, rationale, and constraints instead of feature laundry lists.",
    whyItMattered:
      "It gave teams a lighter but higher-quality artifact for decision alignment.",
    demystificationPrompt:
      "Did this PRD approach rise as teams sought fewer, clearer commitments under uncertain delivery environments?",
  },
  {
    slug: "superhuman-product-market-fit-framework",
    title: "Superhuman’s Framework for Product-Market Fit",
    author: "Rahul Vohra",
    publishedYear: 2019,
    publishedMonth: 11,
    era: "Tactical masterclasses",
    focus: "Strategy",
    audience: "Founders and PM leaders",
    sourceUrl: "https://review.firstround.com/how-superhuman-built-an-engine-to-find-product-market-fit",
    summary:
      "Popularized PMF measurement using the “How disappointed would you be?” threshold method.",
    whyItMattered:
      "It provided a concrete PMF diagnostic when teams needed faster go/no-go evidence.",
    demystificationPrompt:
      "Did this become canonical because macro uncertainty increased the cost of ambiguous PMF claims?",
  },
  {
    slug: "product-strategy-vs-product-plan",
    title: "Product Strategy vs. Product Plan",
    author: "Marty Cagan",
    publishedYear: 2021,
    publishedMonth: 10,
    era: "Institutional friction",
    focus: "Strategy",
    audience: "Product and engineering leadership",
    sourceUrl: "https://www.svpg.com/product-strategy-actions/",
    summary:
      "Distinguished durable strategy choices from brittle planning artifacts.",
    whyItMattered:
      "It gave leadership teams language for navigating organizational constraints without pretending plans equal strategy.",
    demystificationPrompt:
      "Did this framing become urgent because institutions needed adaptability as forecast confidence declined?",
  },
];

export const productConceptEras: ProductConceptEra[] = [
  "Foundational classics",
  "Process & strategy shifters",
  "Modern AI era",
  "Career & identity frameworks",
  "Behavioral psychology & user growth",
  "Tactical masterclasses",
  "Institutional friction",
];

const regimeBadgeTone: Record<RegimeKey, string> = {
  SCARCITY: "text-rose-200 border-rose-400/60 bg-rose-900/30",
  DEFENSIVE: "text-amber-200 border-amber-400/60 bg-amber-900/30",
  VOLATILE: "text-indigo-200 border-indigo-400/60 bg-indigo-900/30",
  EXPANSION: "text-emerald-200 border-emerald-400/60 bg-emerald-900/30",
};

export const regimeToneByKey = regimeBadgeTone;

export const findProductConceptArticle = (slug: string) => {
  return productConceptArticles.find((article) => article.slug === slug);
};

export const getArticlesByEra = (era: ProductConceptEra) => {
  return productConceptArticles
    .filter((article) => article.era === era)
    .sort((a, b) => a.publishedYear - b.publishedYear || a.publishedMonth - b.publishedMonth);
};

export const getMacroContextForArticle = (article: ProductConceptArticle) => {
  const entry = entries.find(
    (candidate) => candidate.year === article.publishedYear && candidate.month === article.publishedMonth,
  );

  if (!entry) {
    return null;
  }

  const index = entries.findIndex(
    (candidate) => candidate.year === article.publishedYear && candidate.month === article.publishedMonth,
  );

  const surroundingEntries = entries.slice(Math.max(0, index - 3), index + 4);

  return {
    primary: entry,
    surrounding: surroundingEntries,
  };
};
