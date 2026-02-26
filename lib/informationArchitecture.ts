export type PostureKey = "risk-on" | "safety-mode" | "transition";

export type PostureDefinition = {
  slug: PostureKey;
  title: string;
  summary: string;
  trigger: string;
  defaults: string[];
};

export const postureDefinitions: PostureDefinition[] = [
  {
    slug: "risk-on",
    title: "Risk-On",
    summary: "Use this when demand confidence is rising and you can reverse decisions quickly.",
    trigger: "You have enough signal strength to speed up learning and selective expansion.",
    defaults: [
      "Increase experiment velocity on high-upside bets.",
      "Fund roadmap options with explicit stop rules.",
      "Prioritize initiatives with short payback and clear demand proof.",
    ],
  },
  {
    slug: "safety-mode",
    title: "Safety Mode",
    summary: "Use this when downside risk is elevated and mistakes are expensive.",
    trigger: "Signals suggest tighter conditions or fragile demand.",
    defaults: [
      "Protect retention, reliability, and cash runway.",
      "Gate hiring and other long-cycle commitments.",
      "Favor reversible work with fast feedback loops.",
    ],
  },
  {
    slug: "transition",
    title: "Transition",
    summary: "Use this when direction is shifting but confidence is still mixed.",
    trigger: "Signals are moving, but persistence is not fully confirmed yet.",
    defaults: [
      "Sequence options behind explicit trigger conditions.",
      "Run upside and downside plans in parallel.",
      "Delay irreversible scaling until confirmation improves.",
    ],
  },
];

export const startSituations = ["Hiring", "Pricing", "Roadmap", "PMF", "Launch", "Governance"] as const;

export const startSituationRoutes: Record<(typeof startSituations)[number], string> = {
  Hiring: "/use-cases/avoid-premature-scaling",
  Pricing: "/use-cases/pricing-change",
  Roadmap: "/use-cases/roadmap-focus",
  PMF: "/use-cases/measure-pmf",
  Launch: "/use-cases/launch-gates",
  Governance: "/use-cases/decision-rights",
};

export type UseCaseRole = {
  slug: string;
  title: string;
  decisions: string[];
  failureModes: string[];
  postureShifts: string[];
  recommendedToolkits: string[];
};

export const useCaseRoles: UseCaseRole[] = [
  {
    slug: "ceo",
    title: "CEO",
    decisions: ["Where to place the next dollar", "How fast to hire", "What to sequence first"],
    failureModes: ["Premature scaling", "Portfolio thrash"],
    postureShifts: ["Shift to Safety Mode when payback stretches", "Re-open Risk-On when demand proves durable"],
    recommendedToolkits: ["pmf", "focus", "rollback"],
  },
  {
    slug: "board",
    title: "Board",
    decisions: ["Risk appetite", "Governance cadence", "Investment gates"],
    failureModes: ["Governance theater", "Risk externalization"],
    postureShifts: ["Tighten oversight in Safety Mode", "Expand delegation in Risk-On"],
    recommendedToolkits: ["decision-rights", "launch-gates"],
  },
  {
    slug: "product",
    title: "Product",
    decisions: ["What gets on the roadmap", "How much discovery to fund", "When to adjust pricing"],
    failureModes: ["Proxy lock-in", "Feedback latency"],
    postureShifts: ["Bias toward proof in Safety Mode", "Increase option velocity in Risk-On"],
    recommendedToolkits: ["focus", "pmf", "claims"],
  },
  {
    slug: "engineering",
    title: "Engineering",
    decisions: ["Capacity allocation", "Reliability posture", "Architecture commitments"],
    failureModes: ["Complexity debt", "Fragility under stress"],
    postureShifts: ["Protect reliability budget in Safety Mode", "Scale platform bets in Risk-On"],
    recommendedToolkits: ["ops-capacity", "rollback", "launch-gates"],
  },
  {
    slug: "growth-gtm",
    title: "Growth & GTM",
    decisions: ["Channel mix", "Campaign pace", "Claims confidence"],
    failureModes: ["AI claims overreach", "Premature scaling"],
    postureShifts: ["Emphasize efficiency in Safety Mode", "Expand acquisition in Risk-On"],
    recommendedToolkits: ["claims", "pmf", "launch-gates"],
  },
  {
    slug: "ops-risk",
    title: "Ops & Risk",
    decisions: ["Decision rights", "Compliance scope", "Stress readiness"],
    failureModes: ["Governance theater", "Risk externalization"],
    postureShifts: ["Increase checkpoints in Transition", "De-escalate controls when stability returns"],
    recommendedToolkits: ["decision-rights", "ops-capacity"],
  },
];

export const situationUseCases = [
  "measure-pmf",
  "avoid-premature-scaling",
  "roadmap-focus",
  "pricing-change",
  "launch-gates",
  "decision-rights",
  "ops-capacity",
  "ai-claims",
] as const;

export const situationRecommendedToolkits: Record<(typeof situationUseCases)[number], string[]> = {
  "measure-pmf": ["pmf", "claims", "focus"],
  "avoid-premature-scaling": ["rollback", "launch-gates", "ops-capacity"],
  "roadmap-focus": ["focus", "pmf", "decision-rights"],
  "pricing-change": ["claims", "pmf", "focus"],
  "launch-gates": ["launch-gates", "rollback", "ops-capacity"],
  "decision-rights": ["decision-rights", "ops-capacity", "rollback"],
  "ops-capacity": ["ops-capacity", "decision-rights", "rollback"],
  "ai-claims": ["claims", "launch-gates", "pmf"],
};

export type ToolkitDefinition = {
  slug: string;
  title: string;
  whenToUse: string;
  byPosture: string;
  instruments: string[];
  misuseCases: string[];
  canonLinks: { label: string; href: string }[];
};

export const toolkitDefinitions: ToolkitDefinition[] = [
  {
    slug: "pmf",
    title: "PMF Toolkit",
    whenToUse: "Use this when you need demand proof before adding cost or complexity.",
    byPosture: "In Safety Mode, focus on retention proof; in Risk-On, push for repeatable growth.",
    instruments: ["PMF evidence checklist", "Cohort quality rubric", "Retention interview template"],
    misuseCases: ["Treating top-line growth as PMF", "Scaling channels before cohort quality is stable"],
    canonLinks: [{ label: "PMF concepts", href: "/library/canon" }],
  },
  {
    slug: "focus",
    title: "Roadmap Focus Toolkit",
    whenToUse: "Use this when your team is overcommitted and priorities are blurred.",
    byPosture: "In Safety Mode, narrow scope; in Risk-On, re-open adjacent options with guardrails.",
    instruments: ["Keep/pause/accelerate board", "Dependency heatmap", "Focus memo template"],
    misuseCases: ["Adding projects without explicit trade-offs"],
    canonLinks: [{ label: "Roadmap canon", href: "/library/canon" }],
  },
  {
    slug: "rollback",
    title: "Commitment & Rollback Toolkit",
    whenToUse: "Use this before hiring, pricing, or architecture moves that are hard to undo.",
    byPosture: "In Safety Mode, tighten rollback triggers; in Risk-On, widen experiment boundaries.",
    instruments: ["Reversibility test", "Rollback trigger register", "Pre-mortem checklist"],
    misuseCases: ["Making irreversible bets without contingency paths"],
    canonLinks: [{ label: "Irreversibility failure mode", href: "/library/failure-modes/irreversibility" }],
  },
  {
    slug: "decision-rights",
    title: "Decision Rights Toolkit",
    whenToUse: "Use this when unclear ownership is slowing decisions or increasing risk.",
    byPosture: "In Safety Mode, increase escalation rigor; in Risk-On, increase delegated speed.",
    instruments: ["Decision rights matrix", "Escalation ladder", "Governance cadence checklist"],
    misuseCases: ["Confusing consensus with accountability"],
    canonLinks: [{ label: "Governance canon", href: "/library/canon" }],
  },
  {
    slug: "launch-gates",
    title: "Launch Gates Toolkit",
    whenToUse: "Use this when launches need objective go/no-go thresholds.",
    byPosture: "In Safety Mode, raise quality gates; in Risk-On, raise learning velocity.",
    instruments: ["Launch gate scorecard", "Risk register", "Rollback comms template"],
    misuseCases: ["Launching on optimism without threshold evidence"],
    canonLinks: [{ label: "Launch failures", href: "/library/failure-modes/premature-scaling" }],
  },
  {
    slug: "ops-capacity",
    title: "Ops Capacity Toolkit",
    whenToUse: "Use this when team load is running ahead of resilience.",
    byPosture: "In Safety Mode, protect resilience capacity; in Risk-On, redeploy surplus into growth loops.",
    instruments: ["Capacity stress test", "Service-level guardrail checklist", "Escalation dashboard"],
    misuseCases: ["Assuming normal capacity under stress"],
    canonLinks: [{ label: "Complexity debt", href: "/library/failure-modes/complexity-debt" }],
  },
  {
    slug: "claims",
    title: "Claims & Positioning Toolkit",
    whenToUse: "Use this when messaging may outrun what the product can reliably deliver.",
    byPosture: "In Safety Mode, tighten claim defensibility; in Risk-On, expand differentiated positioning responsibly.",
    instruments: ["Claims evidence table", "Positioning sanity check", "Review checklist"],
    misuseCases: ["Publishing AI claims without operational proof"],
    canonLinks: [{ label: "Claims and trust", href: "/library/failure-modes/risk-externalization" }],
  },
];

export const failureModes = [
  "regime-mismatch",
  "premature-scaling",
  "irreversibility",
  "proxy-lock-in",
  "feedback-latency",
  "portfolio-thrash",
  "governance-theater",
  "fragility-under-stress",
  "complexity-debt",
  "risk-externalization",
] as const;
