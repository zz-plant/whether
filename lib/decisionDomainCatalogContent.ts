export const postureKeys = ["risk-on", "safety-mode", "transition"] as const;

export const startSituations = ["Hiring", "Pricing", "Roadmap", "PMF", "Launch", "Governance"] as const;

export const toolkitSlugs = [
  "pmf",
  "focus",
  "rollback",
  "decision-rights",
  "claims",
  "launch-gates",
  "ops-capacity",
] as const;

export const situationUseCaseSlugs = [
  "measure-pmf",
  "avoid-premature-scaling",
  "roadmap-focus",
  "pricing-change",
  "launch-gates",
  "decision-rights",
  "ops-capacity",
  "ai-claims",
] as const;

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

export const rawDecisionDomainCatalog = {
  postureDefinitions: [
    {
      slug: "risk-on",
      title: "Speed up",
      summary: "For when demand is rising and you can undo a decision quickly.",
      trigger: "The readings are strong enough to run more experiments and expand where the evidence is.",
      defaults: [
        "Run more experiments on the bets with the biggest upside.",
        "Fund roadmap options, each with a written stop rule.",
        "Put work with a short payback and proven demand first.",
      ],
    },
    {
      slug: "safety-mode",
      title: "Slow down",
      summary: "For when the downside is large and a mistake is expensive.",
      trigger: "The readings show tighter funding, or demand that may not hold.",
      defaults: [
        "Protect retention, reliability, and cash runway.",
        "Hold hiring and any other commitment that takes more than a quarter to unwind.",
        "Prefer work you can undo and that shows results within weeks.",
      ],
    },
    {
      slug: "transition",
      title: "Hold",
      summary: "For when the direction is changing but the readings disagree.",
      trigger: "The readings are moving, but have not held for a second week.",
      defaults: [
        "Line up options behind written trigger conditions.",
        "Run upside and downside plans in parallel.",
        "Delay any scaling you can't undo until the reading holds.",
      ],
    },
  ],
  startSituations,
  useCaseRoles: [
    {
      slug: "ceo",
      title: "CEO",
      decisions: ["Where to place the next dollar", "How fast to hire", "What to sequence first"],
      failureModes: ["Premature scaling", "Portfolio thrash"],
      postureShifts: ["Slow down when paybacks stretch past 12 months", "Speed up again when demand has held for two quarters"],
      recommendedToolkitSlugs: ["pmf", "focus", "rollback"],
    },
    {
      slug: "board",
      title: "Board",
      decisions: ["How much risk to take", "How often to review", "When to release the next investment"],
      failureModes: ["Governance theater", "Risk externalization"],
      postureShifts: ["When conditions say slow down, review more often", "When they say speed up, delegate more"],
      recommendedToolkitSlugs: ["decision-rights", "launch-gates"],
    },
    {
      slug: "product",
      title: "Product",
      decisions: ["What gets on the roadmap", "How much discovery to fund", "When to adjust pricing"],
      failureModes: ["Proxy lock-in", "Feedback latency"],
      postureShifts: ["When conditions say slow down, demand proof before funding discovery", "When they say speed up, fund more options at once"],
      recommendedToolkitSlugs: ["focus", "pmf", "claims"],
    },
    {
      slug: "engineering",
      title: "Engineering",
      decisions: ["Where capacity goes", "How much to spend on reliability", "Which architecture commitments to make"],
      failureModes: ["Complexity debt", "Fragility under stress"],
      postureShifts: ["When conditions say slow down, protect the reliability budget", "When they say speed up, fund platform bets"],
      recommendedToolkitSlugs: ["ops-capacity", "rollback", "launch-gates"],
    },
    {
      slug: "growth-gtm",
      title: "Growth and sales",
      decisions: ["Which channels to fund", "How fast to run campaigns", "Which claims to make in public"],
      failureModes: ["AI claims overreach", "Premature scaling"],
      postureShifts: ["When conditions say slow down, spend only where the cost per customer is proven", "When they say speed up, add acquisition spend"],
      recommendedToolkitSlugs: ["claims", "pmf", "launch-gates"],
    },
    {
      slug: "ops-risk",
      title: "Ops & Risk",
      decisions: ["Who decides what", "How much compliance to take on", "Whether the team can take a shock"],
      failureModes: ["Governance theater", "Risk externalization"],
      postureShifts: ["When conditions say hold, add checkpoints", "Remove the extra controls once the readings have held for a month"],
      recommendedToolkitSlugs: ["decision-rights", "ops-capacity"],
    },
  ],
  situationUseCaseDefinitions: [
    { slug: "measure-pmf", title: "Measure PMF", recommendedToolkitSlugs: ["pmf", "focus"] },
    {
      slug: "avoid-premature-scaling",
      title: "Avoid Premature Scaling",
      recommendedToolkitSlugs: ["rollback", "launch-gates"],
    },
    { slug: "roadmap-focus", title: "Roadmap Focus", recommendedToolkitSlugs: ["focus", "ops-capacity"] },
    { slug: "pricing-change", title: "Pricing Change", recommendedToolkitSlugs: ["claims", "rollback"] },
    { slug: "launch-gates", title: "Launch Gates", recommendedToolkitSlugs: ["launch-gates", "rollback"] },
    {
      slug: "decision-rights",
      title: "Decision Rights",
      recommendedToolkitSlugs: ["decision-rights", "ops-capacity"],
    },
    { slug: "ops-capacity", title: "Ops Capacity", recommendedToolkitSlugs: ["ops-capacity", "decision-rights"] },
    { slug: "ai-claims", title: "AI Claims", recommendedToolkitSlugs: ["claims", "launch-gates"] },
  ],
  situationRouting: {
    Hiring: "avoid-premature-scaling",
    Pricing: "pricing-change",
    Roadmap: "roadmap-focus",
    PMF: "measure-pmf",
    Launch: "launch-gates",
    Governance: "decision-rights",
  },
  toolkitDefinitions: [
    {
      slug: "pmf",
      title: "PMF Toolkit",
      whenToUse: "For when you need proof of demand before adding cost.",
      byPosture: "When conditions say slow down, prove retention first; when they say speed up, push for repeatable growth.",
      operatingOutcome: "A go or hold decision backed by retention, not by top-line growth.",
      decisionThisSession: "Choose one gate now: invest, hold, or narrow to one segment.",
      tightenNow: "Cut acquisition spend until retention is proven in each segment.",
      loosenNow: "Add channel spend only for segments with repeat usage.",
      proceedThreshold: "Proceed when retention on the core action clears your agreed bar for two cohorts in a row.",
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
        "The room leaves with one PMF gate (invest, hold, or narrow) and a date to re-evaluate.",
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
          phase: "Translate",
          objective: "Convert evidence into a specific investment gate.",
          prompts: [
            "What threshold upgrades this from hold to scale?",
            "What do we stop funding until that threshold is met?",
          ],
          deliverable: "30-day PMF action memo: invest, hold, or narrow segment.",
        },
      ],
      misuseCases: ["Treating top-line growth as PMF", "Scaling channels before cohort quality is stable"],
      canonLinks: [{ label: "PMF routing", href: "/resolve" }],
    },
    {
      slug: "focus",
      title: "Roadmap Focus Toolkit",
      whenToUse: "For when priorities are unclear.",
      byPosture: "When conditions say slow down, narrow the scope; when they say speed up, reopen adjacent options with a stop rule on each.",
      operatingOutcome: "A roadmap that fits the team you have, with the trade-offs and the paused work written down.",
      decisionThisSession: "Decide what to keep, pause, and speed up this cycle.",
      tightenNow:
        "Ship only the roadmap items that show customer value within six weeks; pause the rest.",
      loosenNow:
        "Relax constraints only on bets with impact inside 90 days and a named owner checking in.",
      proceedThreshold: "Proceed when team load, critical dependencies, and review checkpoints are within plan.",
      stopTrigger:
        "Stop adding scope when any team passes its agreed work-in-progress limit or funding pressure crosses the pause line.",
      reversalTrigger:
        "Reopen paused work after two improving weekly briefs or one month with funding pressure below the pause line.",
      decisionArtifact: "Published focus memo with not-doing list and escalation owners.",
      timeToRun: "45-75 minutes with Product + Engineering + Design.",
      recommendedParticipants: "Product manager, engineering manager, design lead, and one operations/program partner.",
      prepChecklist: [
        "List all in-flight initiatives with owner, stage, and expected customer impact.",
        "Bring current team capacity assumptions (headcount, PTO, support/on-call load).",
        "Identify any date commitments that cannot move without external impact.",
      ],
      successSignals: [
        'The quarter has a published "not doing" list that teams can reference.',
        "Critical path dependencies are reduced or given explicit escalation owners.",
        "Each team has a work-in-progress limit, reviewed weekly.",
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
          objective: "Choose what to keep, pause, or speed up under this week's guidance.",
          prompts: [
            "Which item matters most in the next 90 days?",
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
      canonLinks: [{ label: "Roadmap routing", href: "/resolve" }],
    },
    {
      slug: "rollback",
      title: "Commitment & Rollback Toolkit",
      whenToUse: "For hiring, pricing, or architecture moves that are hard to undo.",
      byPosture: "When conditions say slow down, set the rollback triggers earlier; when they say speed up, widen what an experiment may try.",
      operatingOutcome: "A decision note that names the rollback trigger before any money that cannot be recovered is spent.",
      decisionThisSession: "Approve or reject the commitment, and name who can roll it back, now.",
      tightenNow: "Shorten the rollback window and set the trigger thresholds earlier.",
      loosenNow: "Widen the experiment's scope; keep one named person able to roll it back.",
      proceedThreshold: "Proceed only when the unwind cost, the owner, and the trigger thresholds are written down.",
      stopTrigger: "Stop expanding the commitment when a leading indicator crosses a trigger in the register.",
      reversalTrigger: "Roll back immediately when the trigger owner calls it.",
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
        "A review date is set before resources are committed.",
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
          objective: "Check that the team can roll back without confusion.",
          prompts: [
            "What sequence would we run in the first 24 hours of rollback?",
            "Which customers, teams, or vendors must be informed first?",
          ],
          deliverable: "Pre-mortem and rollback communication plan.",
        },
      ],
      misuseCases: ["Making irreversible bets without contingency paths"],
      canonLinks: [{ label: "Irreversibility trust check", href: "/trust" }],
    },
    {
      slug: "decision-rights",
      title: "Decision Rights Toolkit",
      whenToUse: "For when unclear ownership is slowing decisions.",
      byPosture: "When conditions say slow down, escalate more; when they say speed up, delegate more.",
      operatingOutcome: "Named decision owners, escalation paths, and a review slot each week for the critical calls.",
      decisionThisSession: "Assign one owner and one escalation point for each critical call.",
      tightenNow:
        "Add an approval check and an earlier escalation trigger to every risk-heavy call.",
      loosenNow: "Delegate more authority so calls close faster.",
      proceedThreshold: "Proceed when every critical decision has one owner, a named reviewer, and a response time.",
      stopTrigger:
        "Stop deciding by consensus in meetings when no owner is named or the decision could change next week.",
      reversalTrigger:
        "Return to tighter approvals if delegated calls exceed their risk limits or a score nears the line where conditions change.",
      decisionArtifact: "Decision rights matrix with an escalation ladder and a weekly review slot.",
      timeToRun: "60 minutes to map rights, plus 15-minute weekly operating review.",
      recommendedParticipants:
        "Exec sponsor, function leads, and program/planning owner who tracks decision cycle time.",
      prepChecklist: [
        "Gather 5-10 recent decisions that slipped, escalated late, or bounced between teams.",
        "Document current (implicit) approvers so hidden bottlenecks are visible.",
        "Agree a single source of truth where decision rights will live after the session.",
      ],
      successSignals: [
        "Every critical decision has one owner and a known escalation path.",
        "Decision cycle time reduces within the next two operating reviews.",
        "Escalations happen against predefined triggers instead of ad hoc urgency.",
      ],
      instruments: ["Decision rights matrix", "Escalation ladder", "Weekly review checklist"],
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
            "Who owns this call, and whose input is required versus optional?",
            "At what level of risk does this escalate, and to whom?",
          ],
          deliverable: "Decision rights matrix and escalation ladder.",
        },
        {
          phase: "Operate",
          objective: "Keep the weekly review so rights do not drift back to ad hoc decisions.",
          prompts: [
            "What weekly checkpoint confirms decisions are executed and reviewed?",
            "What would show that decisions are drifting back into meetings without owners?",
          ],
          deliverable: "Weekly review checklist added to the leadership routine.",
        },
      ],
      misuseCases: ["Confusing consensus with accountability"],
      canonLinks: [{ label: "Governance routing", href: "/resolve" }],
    },
    {
      slug: "launch-gates",
      title: "Launch Gates Toolkit",
      whenToUse: "For a launch that needs a go or no-go bar set in advance.",
      byPosture: "When conditions say slow down, raise the quality bar; when they say speed up, launch sooner to learn faster.",
      operatingOutcome: "A launch decision made against numbers set in advance, with one person named to roll it back.",
      decisionThisSession: "Make the go or no-go call, and name who owns each deferred risk and the rollback.",
      tightenNow: "Make reliability and support readiness hard blockers.",
      loosenNow: "Relax a non-critical gate only when the launch teaches you something you cannot learn another way.",
      proceedThreshold: "Proceed only when every scorecard gate passes and each remaining risk has a named mitigation.",
      stopTrigger: "Stop the launch when any hard blocker falls below its pass mark.",
      reversalTrigger: "Send the rollback messages when early launch signals cross their limits.",
      decisionArtifact: "Signed go/no-go note linked to gate scorecard and rollback owner.",
      timeToRun: "30-45 minutes per launch gate review.",
      recommendedParticipants:
        "Release owner, engineering lead, product lead, support lead, and incident commander/backstop.",
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
      canonLinks: [{ label: "Launch trust checks", href: "/trust" }],
    },
    {
      slug: "ops-capacity",
      title: "Ops Capacity Toolkit",
      whenToUse: "For when the team is carrying more than it can sustain.",
      byPosture: "When conditions say slow down, protect reliability capacity; when they say speed up, move spare capacity into growth work.",
      operatingOutcome: "A capacity plan that protects reliability and catches overload before it becomes an incident.",
      decisionThisSession: "Cut, re-order, or re-staff work so the reliability floors hold.",
      tightenNow:
        "Hold new hires unless the role unblocks committed delivery, and move 10-20% of sprint capacity to reliability and churn defense.",
      loosenNow:
        "Loosen buffers only where the stress indicators have stayed green for two cycles and reliability coverage is unchanged.",
      proceedThreshold:
        "Add scope only when load stays inside the agreed band and someone is named each week to own delivery risk.",
      stopTrigger:
        "Stop adding roadmap scope when overload lasts two cycles or on-call load or service levels degrade.",
      reversalTrigger:
        "Go back to protecting capacity when service levels or on-call load cross their limits; resume planned hiring after two improving weekly briefs.",
      decisionArtifact: "Capacity plan with a reliability-floor checklist and an escalation dashboard.",
      timeToRun: "60 minutes monthly plus weekly stress signal review.",
      recommendedParticipants:
        "Engineering manager, support/on-call owner, product counterpart, and operations/finance partner.",
      prepChecklist: [
        "Compile on-call load, incident trend, and delivery throughput for the last 4-6 weeks.",
        "List planned work that assumes additional capacity not yet staffed.",
        "Define the reliability floors that cannot be traded away in the next planning window.",
      ],
      successSignals: [
        "At least one overload source is removed or re-sequenced each cycle.",
        "A breached reliability floor triggers roadmap triage the same week.",
        "Leadership can see forward-looking capacity risk two sprints out.",
      ],
      instruments: ["Capacity stress test", "Service-level floor checklist", "Escalation dashboard"],
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
          phase: "Protect the floors",
          objective: "Lock service and reliability floors before adding new scope.",
          prompts: [
            "Which service levels cannot be traded away this quarter?",
            "What planned work should pause when a floor is breached?",
          ],
          deliverable: "Service-level floor checklist tied to roadmap rules.",
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
      canonLinks: [{ label: "Capacity trust checks", href: "/trust" }],
    },
    {
      slug: "claims",
      title: "Claims & Positioning Toolkit",
      whenToUse: "For when the marketing may promise more than the product delivers.",
      byPosture: "When conditions say slow down, claim only what you can prove; when they say speed up, make the bolder claims you can monitor.",
      operatingOutcome: "Public claims that are backed by evidence, watched after publishing, and cheap to withdraw.",
      decisionThisSession: "Approve, revise, or pull each claim against what the product does today.",
      tightenNow: "Cut claim language back to what is demonstrably reliable now.",
      loosenNow: "Extend positioning only for claims with monitoring already in place.",
      proceedThreshold: "Proceed when each claim has an evidence source, an owner, and a monitoring trigger.",
      stopTrigger: "Stop publishing or promoting any claim without verifiable product evidence.",
      reversalTrigger: "Pull published copy when support tickets about unmet expectations cross the agreed level.",
      decisionArtifact: "Claims evidence table with approved language and a takedown response time.",
      timeToRun: "45 minutes for campaign reviews; 20 minutes for incremental claim changes.",
      recommendedParticipants:
        "Marketing lead, product lead, legal/risk reviewer, and support/reliability representative.",
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
            "Which signals show this claim is promising more than we deliver?",
            "Who owns takedown/update decisions if reliability drifts?",
          ],
          deliverable: "Final review checklist naming the rollback owner and response time.",
        },
      ],
      misuseCases: ["Publishing AI claims without operational proof"],
      canonLinks: [{ label: "Claims and trust", href: "/trust" }],
    },
  ],
  failureModes,
  failureModeDefinitions: [
    {
      slug: "regime-mismatch",
      title: "Regime mismatch",
      summary: "Operating as if conditions are stable while demand, capital, or investor risk appetite has already shifted.",
      trigger: "Metrics conflict because teams are following stale assumptions from the prior quarter.",
      symptoms: [
        "Roadmap and spend plans still optimize for growth while confidence signals are deteriorating.",
        "Leadership narratives sound optimistic, but execution teams quietly de-scope to protect reliability.",
        "Teams debate goals weekly because no one call anchors the trade-offs.",
      ],
      firstMoves: [
        "Publish one call, with a confidence level and a review date.",
        "Align hiring, roadmap scope, and spend approvals to that call before launching new initiatives.",
        "Write down what would change the decision, so teams know what evidence matters next.",
      ],
      linkedToolkits: [
        { label: "Decision Rights Toolkit", href: "/toolkits/decision-rights" },
        { label: "Roadmap Focus Toolkit", href: "/toolkits/focus" },
      ],
      linkedConcepts: [{ label: "Decision routing", href: "/resolve" }],
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
      linkedConcepts: [{ label: "PMF decision routing", href: "/resolve" }],
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
      linkedConcepts: [{ label: "Decision quality routing", href: "/resolve" }],
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
      linkedConcepts: [{ label: "Measurement routing", href: "/resolve" }],
    },
    {
      slug: "feedback-latency",
      title: "Feedback latency",
      summary: "Learning loops are too slow, so teams repeat mistakes before evidence reaches decision makers.",
      trigger: "Critical product and market signals arrive after planning and budget decisions are locked.",
      symptoms: [
        "Incident, churn, or adoption insights surface weeks after release decisions.",
        "Different teams keep their own dashboards and review schedules with no shared cycle.",
        "Executives review lagging snapshots instead of current trend movement.",
      ],
      firstMoves: [
        "Review the leading indicators for adoption, retention, and reliability more often.",
        "Create one cross-functional decision brief with timestamped evidence each week.",
        "Assign owners for stale data and set freshness expectations for every critical signal.",
      ],
      linkedToolkits: [
        { label: "Ops Capacity Toolkit", href: "/toolkits/ops-capacity" },
        { label: "Roadmap Focus Toolkit", href: "/toolkits/focus" },
      ],
      linkedConcepts: [{ label: "Signal interpretation routing", href: "/resolve" }],
    },
    {
      slug: "portfolio-thrash",
      title: "Portfolio thrash",
      summary: "Constantly reshuffling priorities creates motion without accumulating meaningful progress.",
      trigger: "Leadership changes priorities every cycle without explicit stop/start criteria.",
      symptoms: [
        "Initiatives frequently restart with new framing but identical unresolved dependencies.",
        "Teams carry too many in-flight bets and finish very few.",
        "Roadmaps are rewritten as reactions rather than as choices made under the current call.",
      ],
      firstMoves: [
        "Set a work-in-progress limit for strategic initiatives, and finish one before starting the next.",
        "Publish a keep/pause/accelerate decision with ownership and next review date.",
        "Require clear trigger evidence for introducing net-new priority streams.",
      ],
      linkedToolkits: [
        { label: "Roadmap Focus Toolkit", href: "/toolkits/focus" },
        { label: "Decision Rights Toolkit", href: "/toolkits/decision-rights" },
      ],
      linkedConcepts: [{ label: "Execution routing", href: "/resolve" }],
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
      linkedConcepts: [{ label: "Governance routing", href: "/resolve" }],
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
      linkedConcepts: [{ label: "Reliability routing", href: "/resolve" }],
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
        "Set architecture rules that block new complexity without a plan to retire it.",
      ],
      linkedToolkits: [
        { label: "Roadmap Focus Toolkit", href: "/toolkits/focus" },
        { label: "Ops Capacity Toolkit", href: "/toolkits/ops-capacity" },
      ],
      linkedConcepts: [{ label: "Architecture and execution routing", href: "/resolve" }],
    },
    {
      slug: "risk-externalization",
      title: "Risk externalization",
      summary: "Short-term internal gains are created by shifting risk onto customers, partners, or frontline teams.",
      trigger: "Messaging or launch pace outstrips what the product delivers, and customers are promised more than they get.",
      symptoms: [
        "Claims are marketed before delivery confidence is validated.",
        "Support and legal teams absorb recurring fallout from avoidable promise gaps.",
        "Escalations are handled case-by-case instead of resolving root causes in planning.",
      ],
      firstMoves: [
        "Audit top public claims against current delivery reality and remove overstatements quickly.",
        "Require launch readiness checks that include support, trust, and rollback coverage.",
        "Track the gap between what is promised and what is delivered as an operating risk in weekly reviews.",
      ],
      linkedToolkits: [
        { label: "Claims Integrity Toolkit", href: "/toolkits/claims" },
        { label: "Launch Gates Toolkit", href: "/toolkits/launch-gates" },
      ],
      linkedConcepts: [{ label: "Trust and risk routing", href: "/resolve" }],
    },
  ],
} as const;
