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

export const situationRouting = {
  Hiring: "avoid-premature-scaling",
  Pricing: "pricing-change",
  Roadmap: "roadmap-focus",
  PMF: "measure-pmf",
  Launch: "launch-gates",
  Governance: "decision-rights",
} as const satisfies Record<(typeof startSituations)[number], (typeof situationUseCases)[number]>;

export const recommendedSituationToolkits = {
  "measure-pmf": ["pmf", "focus"],
  "avoid-premature-scaling": ["rollback", "launch-gates"],
  "roadmap-focus": ["focus", "ops-capacity"],
  "pricing-change": ["claims", "rollback"],
  "launch-gates": ["launch-gates", "rollback"],
  "decision-rights": ["decision-rights", "ops-capacity"],
  "ops-capacity": ["ops-capacity", "decision-rights"],
  "ai-claims": ["claims", "launch-gates"],
} as const satisfies Record<(typeof situationUseCases)[number], readonly ToolkitDefinition["slug"][]>;

export type ToolkitDefinition = {
  slug: string;
  title: string;
  whenToUse: string;
  byPosture: string;
  operatingOutcome: string;
  decisionThisSession: string;
  tightenNow: string;
  loosenNow: string;
  proceedThreshold: string;
  stopTrigger: string;
  reversalTrigger: string;
  decisionArtifact: string;
  timeToRun: string;
  recommendedParticipants: string;
  prepChecklist: string[];
  successSignals: string[];
  instruments: string[];
  runSequence: {
    phase: string;
    objective: string;
    prompts: string[];
    deliverable: string;
  }[];
  misuseCases: string[];
  canonLinks: { label: string; href: string }[];
};

export const toolkitDefinitions: ToolkitDefinition[] = [
  {
    slug: "pmf",
    title: "PMF Toolkit",
    whenToUse: "Use this when you need demand proof before adding cost or complexity.",
    byPosture: "In Safety Mode, focus on retention proof; in Risk-On, push for repeatable growth.",
    operatingOutcome: "A go/hold decision backed by retention quality, not just topline excitement.",
    decisionThisSession: "Choose one gate now: invest, hold, or narrow to one segment.",
    tightenNow: "In Safety Mode, tighten spend until retention quality is proven by segment.",
    loosenNow: "In Risk-On, loosen channel expansion only for segments with repeat usage.",
    proceedThreshold: "Proceed when core-value retention crosses your agreed PMF threshold for two cohorts.",
    stopTrigger: "Stop incremental acquisition spend when repeat usage drops below the agreed floor.",
    reversalTrigger: "Reverse from invest back to hold if two consecutive cohorts lose retention quality.",
    decisionArtifact: "30-day PMF action memo with gate, threshold, and next review date.",
    timeToRun: "60-90 minutes with Product + Growth + Finance.",
    recommendedParticipants: "Product lead, Growth lead, Finance partner, and the team owning activation/retention.",
    prepChecklist: [
      "Bring the latest 2-3 cohorts with activation and retention broken out by segment.",
      "Pull paid vs organic acquisition split so the room can separate demand from spend effects.",
      "Collect 5 recent churn and 5 retained-user interviews for qualitative context.",
    ],
    successSignals: [
      "Leadership exits with one PMF gate (invest / hold / narrow) and a date to re-evaluate.",
      "At least one low-quality segment is deprioritized to protect focus.",
      "Next-cycle budget is tied to an explicit retention threshold rather than top-line growth alone.",
    ],
    instruments: ["PMF evidence checklist", "Cohort quality rubric", "Retention interview template"],
    runSequence: [
      {
        phase: "Collect",
        objective: "Ground the discussion in observable behavior from the last 2-3 cohorts.",
        prompts: [
          "What percentage of users return in the behavior window that maps to core value?",
          "Which cohort improved naturally versus through one-off interventions?",
        ],
        deliverable: "One-page PMF evidence sheet with cohort trend highlights.",
      },
      {
        phase: "Stress-test",
        objective: "Separate demand quality from channel spend or novelty effects.",
        prompts: [
          "If acquisition spend stopped this week, where would active usage settle?",
          "Which segments show repeat behavior without high-touch support?",
        ],
        deliverable: "Cohort quality score with confidence notes and known blind spots.",
      },
      {
        phase: "Decide",
        objective: "Convert evidence into a specific investment gate.",
        prompts: [
          "What threshold upgrades this from hold to scale?",
          "What do we stop funding until that threshold is met?",
        ],
        deliverable: "30-day PMF action memo: invest, hold, or narrow segment.",
      },
    ],
    misuseCases: ["Treating top-line growth as PMF", "Scaling channels before cohort quality is stable"],
    canonLinks: [{ label: "PMF concepts", href: "/concepts" }],
  },
  {
    slug: "focus",
    title: "Roadmap Focus Toolkit",
    whenToUse: "Use this when your team is overcommitted and priorities are blurred.",
    byPosture: "In Safety Mode, narrow scope; in Risk-On, re-open adjacent options with guardrails.",
    operatingOutcome: "A capacity-matched roadmap with explicit trade-offs and paused work.",
    decisionThisSession: "Commit to keep, pause, and accelerate decisions for this cycle.",
    tightenNow: "In Safety Mode, tighten WIP and pause lower-leverage streams quickly.",
    loosenNow: "In Risk-On, loosen constraints only on bets with <90 day impact.",
    proceedThreshold: "Proceed when capacity load and critical dependencies are both within plan.",
    stopTrigger: "Stop adding scope when any team breaches agreed WIP or dependency limits.",
    reversalTrigger: "Re-open a paused stream only when a named trigger condition is met.",
    decisionArtifact: "Published focus memo with not-doing list and escalation owners.",
    timeToRun: "45-75 minutes with Product + Engineering + Design.",
    recommendedParticipants: "Product manager, engineering manager, design lead, and one operations/program partner.",
    prepChecklist: [
      "List all in-flight initiatives with owner, stage, and expected customer impact.",
      "Bring current team capacity assumptions (headcount, PTO, support/on-call load).",
      "Identify any date commitments that cannot move without external impact.",
    ],
    successSignals: [
      "The quarter has a published \"not doing\" list that teams can reference.",
      "Critical path dependencies are reduced or given explicit escalation owners.",
      "Team-level WIP limits are set and reviewed weekly.",
    ],
    instruments: ["Keep/pause/accelerate board", "Dependency heatmap", "Focus memo template"],
    runSequence: [
      {
        phase: "Map",
        objective: "Make current commitments and hidden dependencies visible.",
        prompts: [
          "Which initiatives consume the most critical path capacity?",
          "Where does one delayed team block multiple outcomes?",
        ],
        deliverable: "Dependency heatmap across current quarter initiatives.",
      },
      {
        phase: "Prioritize",
        objective: "Choose what to keep, pause, or accelerate against posture constraints.",
        prompts: [
          "Which item drives the biggest posture-aligned outcome in <90 days?",
          "What can be paused with the smallest customer/regret impact?",
        ],
        deliverable: "Keep/Pause/Accelerate board with named owners.",
      },
      {
        phase: "Commit",
        objective: "Lock scope and communicate what will not happen this cycle.",
        prompts: [
          "What are we explicitly saying no to this quarter?",
          "Which trigger would cause us to re-open a paused stream?",
        ],
        deliverable: "Focus memo shared with leadership and execution teams.",
      },
    ],
    misuseCases: ["Adding projects without explicit trade-offs"],
    canonLinks: [{ label: "Roadmap canon", href: "/concepts" }],
  },
  {
    slug: "rollback",
    title: "Commitment & Rollback Toolkit",
    whenToUse: "Use this before hiring, pricing, or architecture moves that are hard to undo.",
    byPosture: "In Safety Mode, tighten rollback triggers; in Risk-On, widen experiment boundaries.",
    operatingOutcome: "Decision packages that define rollback triggers before irreversible spend begins.",
    decisionThisSession: "Approve or reject the commitment with rollback ownership assigned now.",
    tightenNow: "In Safety Mode, tighten rollback windows and require earlier trigger thresholds.",
    loosenNow: "In Risk-On, loosen experiment scope while keeping rollback authority explicit.",
    proceedThreshold: "Proceed only when unwind cost, owner, and trigger thresholds are documented.",
    stopTrigger: "Stop commitment expansion when a leading indicator breaches the trigger register.",
    reversalTrigger: "Reverse to rollback mode immediately when trigger owner calls degradation.",
    decisionArtifact: "Signed commitment note with rollback trigger register and comms packet.",
    timeToRun: "45-60 minutes per major commitment.",
    recommendedParticipants: "Decision owner, finance owner, delivery owner, and communications counterpart.",
    prepChecklist: [
      "Quantify sunk cost exposure at day 7, day 30, and day 90.",
      "Pre-identify the metric dashboard that will be used to trigger rollback.",
      "Draft customer and internal rollback messaging before the decision is approved.",
    ],
    successSignals: [
      "Rollback threshold and owner are written into the launch/commitment note.",
      "A dry-run confirms teams can unwind within the stated window.",
      "Review cadence is scheduled before resources are committed.",
    ],
    instruments: ["Reversibility test", "Rollback trigger register", "Pre-mortem checklist"],
    runSequence: [
      {
        phase: "Classify",
        objective: "Determine whether the commitment is reversible, partially reversible, or locked-in.",
        prompts: [
          "What is the fastest path to unwind this decision within 30 days?",
          "Which costs become sunk immediately after launch?",
        ],
        deliverable: "Reversibility classification with unwind cost estimate.",
      },
      {
        phase: "Pre-wire",
        objective: "Define observable signals that trigger rollback.",
        prompts: [
          "Which two leading indicators tell us this move is failing early?",
          "Who has the authority to trigger rollback in real time?",
        ],
        deliverable: "Rollback trigger register with thresholds and owners.",
      },
      {
        phase: "Rehearse",
        objective: "Validate that rollback can be executed without organizational confusion.",
        prompts: [
          "What sequence would we run in the first 24 hours of rollback?",
          "Which customers, teams, or vendors must be informed first?",
        ],
        deliverable: "Pre-mortem and rollback communication plan.",
      },
    ],
    misuseCases: ["Making irreversible bets without contingency paths"],
    canonLinks: [{ label: "Irreversibility failure mode", href: "/library/failure-modes/irreversibility" }],
  },
  {
    slug: "decision-rights",
    title: "Decision Rights Toolkit",
    whenToUse: "Use this when unclear ownership is slowing decisions or increasing risk.",
    byPosture: "In Safety Mode, increase escalation rigor; in Risk-On, increase delegated speed.",
    operatingOutcome: "Named decision owners, escalation paths, and review cadence for critical calls.",
    decisionThisSession: "Assign one accountable DRI and escalation boundary for each critical call.",
    tightenNow: "In Safety Mode, tighten escalation triggers and approval checks for risk-heavy calls.",
    loosenNow: "In Risk-On, loosen decision latency by increasing delegated authority.",
    proceedThreshold: "Proceed when every critical decision has a DRI, reviewer set, and SLA.",
    stopTrigger: "Stop meeting-based consensus loops when no accountable owner is named.",
    reversalTrigger: "Revert to tighter approval paths if delegated calls repeatedly miss risk bounds.",
    decisionArtifact: "Decision rights matrix with escalation ladder and weekly governance cadence.",
    timeToRun: "60 minutes to map rights, plus 15-minute weekly operating review.",
    recommendedParticipants: "Exec sponsor, function leads, and program/operations owner who tracks decision cycle time.",
    prepChecklist: [
      "Gather 5-10 recent decisions that slipped, escalated late, or bounced between teams.",
      "Document current (implicit) approvers so hidden bottlenecks are visible.",
      "Agree a single source of truth where decision rights will live after the session.",
    ],
    successSignals: [
      "Every critical decision has one accountable DRI and known escalation path.",
      "Decision cycle time reduces within the next two operating reviews.",
      "Escalations happen against predefined triggers instead of ad hoc urgency.",
    ],
    instruments: ["Decision rights matrix", "Escalation ladder", "Governance cadence checklist"],
    runSequence: [
      {
        phase: "Inventory",
        objective: "List recurring decisions where ownership ambiguity creates delay or risk.",
        prompts: [
          "Which decisions repeatedly stall in cross-functional meetings?",
          "Where do we currently rely on consensus with no accountable owner?",
        ],
        deliverable: "Top decision inventory with cycle-time pain points.",
      },
      {
        phase: "Assign",
        objective: "Set accountable owner, required contributors, and escalation boundaries.",
        prompts: [
          "Who is DRI for this call and what input is mandatory versus optional?",
          "At what risk threshold does this escalate to exec or board?",
        ],
        deliverable: "Decision rights matrix and escalation ladder.",
      },
      {
        phase: "Operate",
        objective: "Enforce rhythm so rights do not decay back into ad hoc governance.",
        prompts: [
          "What weekly checkpoint confirms decisions are executed and reviewed?",
          "What anti-patterns signal governance theater returning?",
        ],
        deliverable: "Governance cadence checklist integrated into leadership routine.",
      },
    ],
    misuseCases: ["Confusing consensus with accountability"],
    canonLinks: [{ label: "Governance canon", href: "/concepts" }],
  },
  {
    slug: "launch-gates",
    title: "Launch Gates Toolkit",
    whenToUse: "Use this when launches need objective go/no-go thresholds.",
    byPosture: "In Safety Mode, raise quality gates; in Risk-On, raise learning velocity.",
    operatingOutcome: "Launch decisions tied to threshold evidence, with clear rollback ownership.",
    decisionThisSession: "Make a go/no-go call with owners for deferred risks and rollback.",
    tightenNow: "In Safety Mode, tighten hard blockers around reliability and support readiness.",
    loosenNow: "In Risk-On, loosen non-critical gates only when learning value is high.",
    proceedThreshold: "Proceed only when scorecard gates pass and residual risks have named mitigations.",
    stopTrigger: "Stop launch when any hard blocker falls below pass criteria.",
    reversalTrigger: "Revert to rollback communications when early-launch signals degrade beyond limits.",
    decisionArtifact: "Signed go/no-go note linked to gate scorecard and rollback owner.",
    timeToRun: "30-45 minutes per launch gate review.",
    recommendedParticipants: "Release owner, engineering lead, product lead, support lead, and incident commander/backstop.",
    prepChecklist: [
      "Pre-fill the gate scorecard with current values 24 hours before review.",
      "List unresolved launch risks with severity and mitigation owner.",
      "Prepare rollback communication drafts for customer-facing and internal channels.",
    ],
    successSignals: [
      "Go/no-go is recorded with rationale and ownership in the same meeting.",
      "Any deferred risk has a named mitigation owner and review date.",
      "Rollback communications can be sent within minutes, not hours.",
    ],
    instruments: ["Launch gate scorecard", "Risk register", "Rollback comms template"],
    runSequence: [
      {
        phase: "Define gates",
        objective: "Set measurable go/no-go criteria before final launch week.",
        prompts: [
          "Which reliability, adoption, and support thresholds must be met?",
          "Which gate is a hard blocker versus a mitigatable risk?",
        ],
        deliverable: "Launch gate scorecard with pass/fail criteria.",
      },
      {
        phase: "Assess risk",
        objective: "Capture residual risks with owner, severity, and mitigation plan.",
        prompts: [
          "What could break in first 72 hours and how quickly can we detect it?",
          "Which dependencies outside our team threaten launch confidence?",
        ],
        deliverable: "Risk register linked to monitoring and response owners.",
      },
      {
        phase: "Call the launch",
        objective: "Make an explicit call with fallback communication ready.",
        prompts: [
          "Who gives final launch approval and who can halt if signal degrades?",
          "What customer/internal message is pre-approved for rollback?",
        ],
        deliverable: "Signed go/no-go note and rollback communications packet.",
      },
    ],
    misuseCases: ["Launching on optimism without threshold evidence"],
    canonLinks: [{ label: "Launch failures", href: "/library/failure-modes/premature-scaling" }],
  },
  {
    slug: "ops-capacity",
    title: "Ops Capacity Toolkit",
    whenToUse: "Use this when team load is running ahead of resilience.",
    byPosture: "In Safety Mode, protect resilience capacity; in Risk-On, redeploy surplus into growth loops.",
    operatingOutcome: "Capacity plan that protects reliability and prevents silent overload.",
    decisionThisSession: "Cut, sequence, or re-staff work to keep reliability guardrails intact.",
    tightenNow: "In Safety Mode, tighten capacity buffers and protect non-negotiable SLO floors.",
    loosenNow: "In Risk-On, loosen buffers only where stress indicators stay green for two cycles.",
    proceedThreshold: "Proceed with added scope only when capacity stress remains within agreed bands.",
    stopTrigger: "Stop roadmap expansion when overload persists for two operating cycles.",
    reversalTrigger: "Reverse to protective mode when SLO or on-call load breaches guardrail limits.",
    decisionArtifact: "Capacity plan with guardrail checklist and escalation dashboard.",
    timeToRun: "60 minutes monthly plus weekly stress signal review.",
    recommendedParticipants: "Engineering manager, support/on-call owner, product counterpart, and operations/finance partner.",
    prepChecklist: [
      "Compile on-call load, incident trend, and delivery throughput for the last 4-6 weeks.",
      "List planned work that assumes additional capacity not yet staffed.",
      "Define non-negotiable reliability guardrails for the next planning window.",
    ],
    successSignals: [
      "At least one overload source is removed or re-sequenced each cycle.",
      "Guardrail breaches trigger automatic roadmap triage within the same week.",
      "Leadership can see forward-looking capacity risk two sprints out.",
    ],
    instruments: ["Capacity stress test", "Service-level guardrail checklist", "Escalation dashboard"],
    runSequence: [
      {
        phase: "Measure load",
        objective: "Quantify demand on people/systems versus sustainable throughput.",
        prompts: [
          "Which teams are consistently above healthy on-call or delivery load?",
          "Which commitments assume best-case capacity?",
        ],
        deliverable: "Capacity stress test by team with red/yellow/green status.",
      },
      {
        phase: "Protect guardrails",
        objective: "Lock service and reliability floors before adding new scope.",
        prompts: [
          "Which SLOs cannot be traded away this quarter?",
          "What planned work should pause when guardrails are breached?",
        ],
        deliverable: "Service-level guardrail checklist tied to roadmap rules.",
      },
      {
        phase: "Escalate early",
        objective: "Create visibility loops before capacity issues become incidents.",
        prompts: [
          "What weekly indicator predicts stress two sprints ahead?",
          "Who receives escalation when overload persists for two cycles?",
        ],
        deliverable: "Escalation dashboard used in leadership review.",
      },
    ],
    misuseCases: ["Assuming normal capacity under stress"],
    canonLinks: [{ label: "Complexity debt", href: "/library/failure-modes/complexity-debt" }],
  },
  {
    slug: "claims",
    title: "Claims & Positioning Toolkit",
    whenToUse: "Use this when messaging may outrun what the product can reliably deliver.",
    byPosture: "In Safety Mode, tighten claim defensibility; in Risk-On, expand differentiated positioning responsibly.",
    operatingOutcome: "Public claims that are evidence-backed, monitorable, and low-regret.",
    decisionThisSession: "Approve, revise, or pull claims based on current operational proof.",
    tightenNow: "In Safety Mode, tighten claim language to what is demonstrably reliable now.",
    loosenNow: "In Risk-On, loosen positioning scope only for claims with strong monitoring coverage.",
    proceedThreshold: "Proceed when each claim has evidence source, owner, and monitoring trigger.",
    stopTrigger: "Stop publishing or promoting claims that lack verifiable product evidence.",
    reversalTrigger: "Reverse published copy when expectation-gap indicators cross agreed thresholds.",
    decisionArtifact: "Claims evidence table with approved language and rollback SLA.",
    timeToRun: "45 minutes for campaign reviews; 20 minutes for incremental claim changes.",
    recommendedParticipants: "Marketing lead, product lead, legal/risk reviewer, and support/reliability representative.",
    prepChecklist: [
      "Bring current external claims and map each one to measurable product behavior.",
      "Review recent support tickets for expectation mismatch patterns.",
      "Collect legal/compliance constraints tied to market or vertical-specific language.",
    ],
    successSignals: [
      "Every published claim has a named evidence source and update owner.",
      "Expectation-gap support tickets trend down after copy updates.",
      "Claim changes can be rolled back quickly when reliability drifts.",
    ],
    instruments: ["Claims evidence table", "Positioning sanity check", "Review checklist"],
    runSequence: [
      {
        phase: "Evidence claims",
        objective: "Map each external claim to product behavior and proof source.",
        prompts: [
          "What observable proof supports each headline claim today?",
          "Which claim depends on roadmap promises instead of current capability?",
        ],
        deliverable: "Claims evidence table with confidence grade.",
      },
      {
        phase: "Challenge positioning",
        objective: "Pressure-test language against customer interpretation and risk exposure.",
        prompts: [
          "How could a skeptical buyer interpret this claim literally?",
          "Which phrasing increases legal, trust, or support risk unnecessarily?",
        ],
        deliverable: "Positioning sanity check with approved language edits.",
      },
      {
        phase: "Ship with controls",
        objective: "Publish with monitoring and rapid correction path.",
        prompts: [
          "Which signals indicate this claim is creating expectation debt?",
          "Who owns takedown/update decisions if reliability drifts?",
        ],
        deliverable: "Final review checklist including rollback owner and SLA.",
      },
    ],
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

export type FailureModeDefinition = {
  slug: (typeof failureModes)[number];
  title: string;
  summary: string;
  trigger: string;
  symptoms: string[];
  firstMoves: string[];
  linkedToolkits: { label: string; href: string }[];
  linkedConcepts: { label: string; href: string }[];
};

export const failureModeDefinitions: FailureModeDefinition[] = [
  {
    slug: "regime-mismatch",
    title: "Regime mismatch",
    summary: "Operating as if conditions are stable while demand, capital, or risk posture has already shifted.",
    trigger: "Metrics conflict because teams are following stale assumptions from the prior quarter.",
    symptoms: [
      "Roadmap and spend plans still optimize for growth while confidence signals are deteriorating.",
      "Leadership narratives sound optimistic, but execution teams quietly de-scope to protect reliability.",
      "Teams debate goals weekly because no explicit posture call anchors trade-offs.",
    ],
    firstMoves: [
      "Run a posture reset and publish one operating mode with confidence level and review date.",
      "Align hiring, roadmap scope, and spend approvals to that posture before launching new initiatives.",
      "Define trigger conditions that would change posture so teams know what evidence matters next.",
    ],
    linkedToolkits: [
      { label: "Decision Rights Toolkit", href: "/toolkits/decision-rights" },
      { label: "Roadmap Focus Toolkit", href: "/toolkits/focus" },
    ],
    linkedConcepts: [{ label: "Posture concepts", href: "/concepts" }],
  },
  {
    slug: "premature-scaling",
    title: "Premature scaling",
    summary: "Expanding headcount, channel spend, or platform complexity before demand quality is proven.",
    trigger: "Top-line signals look exciting, but retention and payback quality are still fragile.",
    symptoms: [
      "Hiring plans assume growth continuation despite weak cohort durability.",
      "Channel budgets increase faster than evidence of repeatable conversion quality.",
      "Teams add process layers to coordinate growth that has not yet stabilized.",
    ],
    firstMoves: [
      "Gate expansion decisions behind explicit retention or payback thresholds.",
      "Pause non-critical hiring and concentrate resources on proving repeat behavior.",
      "Reframe weekly reporting around quality of demand, not gross volume.",
    ],
    linkedToolkits: [
      { label: "PMF Toolkit", href: "/toolkits/pmf" },
      { label: "Launch Gates Toolkit", href: "/toolkits/launch-gates" },
    ],
    linkedConcepts: [{ label: "PMF concepts", href: "/concepts" }],
  },
  {
    slug: "irreversibility",
    title: "Irreversibility",
    summary: "Committing to decisions that are expensive to unwind before uncertainty has been reduced.",
    trigger: "A high-cost commitment is framed as urgent even though its assumptions are untested.",
    symptoms: [
      "Long-cycle vendor, hiring, or architecture commitments happen before pilot evidence is complete.",
      "Teams cannot describe a rollback path without major disruption.",
      "Decision forums prioritize confidence theater over option preservation.",
    ],
    firstMoves: [
      "Classify active decisions by reversibility and pause irreversible bets missing proof.",
      "Add explicit rollback owners and trigger conditions to each major launch.",
      "Shift near-term work toward reversible experiments that reduce uncertainty quickly.",
    ],
    linkedToolkits: [
      { label: "Rollback Planner Toolkit", href: "/toolkits/rollback" },
      { label: "Launch Gates Toolkit", href: "/toolkits/launch-gates" },
    ],
    linkedConcepts: [{ label: "Decision quality concepts", href: "/concepts" }],
  },
  {
    slug: "proxy-lock-in",
    title: "Proxy lock-in",
    summary: "Optimizing for easy-to-measure proxy metrics that drift away from real customer outcomes.",
    trigger: "Teams ship rapidly against internal KPIs while external value signals flatten.",
    symptoms: [
      "Success criteria emphasize activity metrics over retained customer behavior.",
      "Product discussions focus on dashboard wins with little user-level evidence.",
      "Roadmap prioritization resists correction because the proxy metric still rises.",
    ],
    firstMoves: [
      "Replace proxy-only scorecards with one core value metric tied to repeat usage.",
      "Require every roadmap bet to state the customer behavior it should change.",
      "Audit the top dashboard metrics and retire those without outcome linkage.",
    ],
    linkedToolkits: [
      { label: "Roadmap Focus Toolkit", href: "/toolkits/focus" },
      { label: "PMF Toolkit", href: "/toolkits/pmf" },
    ],
    linkedConcepts: [{ label: "Measurement concepts", href: "/concepts" }],
  },
  {
    slug: "feedback-latency",
    title: "Feedback latency",
    summary: "Learning loops are too slow, so teams repeat mistakes before evidence reaches decision makers.",
    trigger: "Critical product and market signals arrive after planning and budget decisions are locked.",
    symptoms: [
      "Incident, churn, or adoption insights surface weeks after release decisions.",
      "Different teams keep their own dashboards and review cadences with no shared cycle.",
      "Executives review lagging snapshots instead of current trend movement.",
    ],
    firstMoves: [
      "Tighten review cadence on leading indicators for adoption, retention, and reliability.",
      "Create one cross-functional decision brief with timestamped evidence each week.",
      "Assign owners for stale data and set freshness expectations for every critical signal.",
    ],
    linkedToolkits: [
      { label: "Ops Capacity Toolkit", href: "/toolkits/ops-capacity" },
      { label: "Roadmap Focus Toolkit", href: "/toolkits/focus" },
    ],
    linkedConcepts: [{ label: "Signal interpretation concepts", href: "/concepts" }],
  },
  {
    slug: "portfolio-thrash",
    title: "Portfolio thrash",
    summary: "Constantly reshuffling priorities creates motion without accumulating meaningful progress.",
    trigger: "Leadership changes priorities every cycle without explicit stop/start criteria.",
    symptoms: [
      "Initiatives frequently restart with new framing but identical unresolved dependencies.",
      "Teams carry too many in-flight bets and finish very few.",
      "Roadmaps are rewritten as reactions rather than intentional posture-aligned choices.",
    ],
    firstMoves: [
      "Set WIP limits for strategic initiatives and enforce finish-before-new-start discipline.",
      "Publish a keep/pause/accelerate decision with ownership and next review date.",
      "Require clear trigger evidence for introducing net-new priority streams.",
    ],
    linkedToolkits: [
      { label: "Roadmap Focus Toolkit", href: "/toolkits/focus" },
      { label: "Decision Rights Toolkit", href: "/toolkits/decision-rights" },
    ],
    linkedConcepts: [{ label: "Execution concepts", href: "/concepts" }],
  },
  {
    slug: "governance-theater",
    title: "Governance theater",
    summary: "Creating rituals that signal control without improving decision quality or risk outcomes.",
    trigger: "Review meetings multiply, yet accountability and decision rights remain ambiguous.",
    symptoms: [
      "Approvals occur in many forums, but nobody owns final calls or follow-through.",
      "Status updates dominate governance time while risk decisions are deferred.",
      "Teams escalate for visibility rather than for concrete unblock decisions.",
    ],
    firstMoves: [
      "Map decision rights by domain and document who decides, advises, and executes.",
      "Redesign governance meetings around explicit decisions, owners, and deadlines.",
      "Track unresolved decisions as operational risk, not administrative backlog.",
    ],
    linkedToolkits: [
      { label: "Decision Rights Toolkit", href: "/toolkits/decision-rights" },
      { label: "Ops Capacity Toolkit", href: "/toolkits/ops-capacity" },
    ],
    linkedConcepts: [{ label: "Governance concepts", href: "/concepts" }],
  },
  {
    slug: "fragility-under-stress",
    title: "Fragility under stress",
    summary: "Systems and teams operate well in normal conditions but fail when load or volatility spikes.",
    trigger: "Small shocks produce outsized outages, delivery delays, or decision paralysis.",
    symptoms: [
      "Reliability incidents repeatedly consume roadmap capacity.",
      "On-call and support teams become the hidden bottleneck for product delivery.",
      "Leadership confidence drops because operational surprises are frequent and severe.",
    ],
    firstMoves: [
      "Reserve explicit reliability capacity and protect it from roadmap encroachment.",
      "Run stress scenarios for people, systems, and vendor dependencies.",
      "Define minimum operating standards that must hold before new launches proceed.",
    ],
    linkedToolkits: [
      { label: "Ops Capacity Toolkit", href: "/toolkits/ops-capacity" },
      { label: "Rollback Planner Toolkit", href: "/toolkits/rollback" },
    ],
    linkedConcepts: [{ label: "Reliability concepts", href: "/concepts" }],
  },
  {
    slug: "complexity-debt",
    title: "Complexity debt",
    summary: "Accumulated process, architecture, and coordination overhead slows execution below market needs.",
    trigger: "Simple changes require too many teams, approvals, or brittle system touchpoints.",
    symptoms: [
      "Cycle time rises despite no corresponding increase in outcome quality.",
      "Teams duplicate solutions because shared platforms are too hard to use or evolve.",
      "Operational work expands as hidden coupling increases.",
    ],
    firstMoves: [
      "Inventory recurring coordination hotspots and remove one layer each cycle.",
      "Prioritize simplification work tied to the highest throughput constraint.",
      "Set architecture guardrails that prevent adding net-new complexity without sunset plans.",
    ],
    linkedToolkits: [
      { label: "Roadmap Focus Toolkit", href: "/toolkits/focus" },
      { label: "Ops Capacity Toolkit", href: "/toolkits/ops-capacity" },
    ],
    linkedConcepts: [{ label: "Architecture and execution concepts", href: "/concepts" }],
  },
  {
    slug: "risk-externalization",
    title: "Risk externalization",
    summary: "Short-term internal gains are created by shifting risk onto customers, partners, or frontline teams.",
    trigger: "Messaging or launch pace outstrips operational capability, creating expectation debt.",
    symptoms: [
      "Claims are marketed before delivery confidence is validated.",
      "Support and legal teams absorb recurring fallout from avoidable promise gaps.",
      "Escalations are handled case-by-case instead of resolving root causes in planning.",
    ],
    firstMoves: [
      "Audit top public claims against current delivery reality and remove overstatements quickly.",
      "Require launch readiness checks that include support, trust, and rollback coverage.",
      "Track expectation debt as a first-class operating risk in weekly reviews.",
    ],
    linkedToolkits: [
      { label: "Claims Integrity Toolkit", href: "/toolkits/claims" },
      { label: "Launch Gates Toolkit", href: "/toolkits/launch-gates" },
    ],
    linkedConcepts: [{ label: "Trust and risk concepts", href: "/concepts" }],
  },
];
