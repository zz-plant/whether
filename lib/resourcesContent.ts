export type GovernanceLexiconTerm = {
  slug: "reversibility" | "escalation-thresholds" | "30-day-confirmation-logic" | "capital-regime";
  term: string;
  definition: string;
  boardPrompt: string;
};

export const governanceLexicon: GovernanceLexiconTerm[] = [
  {
    slug: "reversibility",
    term: "Reversibility",
    definition:
      "The practical ability to unwind a decision inside a defined time window without creating second-order damage to customer trust, compliance posture, team morale, or cash runway.",
    boardPrompt:
      "What is the documented rollback path within 30 days, and who has standing authority to execute it?",
  },
  {
    slug: "escalation-thresholds",
    term: "Escalation thresholds",
    definition:
      "Pre-committed trigger levels that move a decision from delegated management control to executive or board-level review.",
    boardPrompt:
      "Which metric threshold, breach duration, and confidence band requires immediate board notification?",
  },
  {
    slug: "30-day-confirmation-logic",
    term: "30-day confirmation logic",
    definition:
      "A governance cadence where directional data must persist for roughly one operating month before capital posture changes are expanded or locked in.",
    boardPrompt:
      "Which indicators must confirm for 30 days before we increase commitments, and what do we do if confirmation fails?",
  },
  {
    slug: "capital-regime",
    term: "Capital regime",
    definition:
      "The current operating climate for capital allocation defined by cost of capital, demand reliability, and financing optionality rather than optimism bias.",
    boardPrompt:
      "Given this capital regime, which commitments are mandatory, optional, deferred, or prohibited this quarter?",
  },
];

export type PillarSection = {
  heading: string;
  paragraphs: string[];
  subsections?: Array<{
    heading: string;
    paragraphs: string[];
  }>;
};

export type ResourcePillarPage = {
  slug:
    | "capital-discipline-venture-backed-companies"
    | "board-level-capital-posture-framework"
    | "reversibility-as-governance";
  keyword: string;
  title: string;
  description: string;
  h1: string;
  canonicalPath: string;
  parentTopic: boolean;
  boardPackContext: string;
  midpointCtaLabel: string;
  sections: PillarSection[];
};

export const canonicalCapitalDisciplinePath = "/resources/capital-discipline-venture-backed-companies";


const capitalDisciplineDeepDiveSections: PillarSection[] = [
  {
    heading: "Operating scorecards boards should require every month",
    paragraphs: [
      "A practical board scorecard should distinguish leading from lagging indicators while preserving context on data confidence. Many teams over-index on lagging outcomes such as quarterly revenue growth because those numbers are familiar and board-friendly. The problem is timing. By the time lagging outcomes degrade, options have already narrowed. A disciplined scorecard includes forward-looking measures like sales cycle compression, onboarding completion quality, and early cohort stability.",
      "Confidence notation is equally important. If a metric is directionally positive but based on incomplete instrumentation, that should be explicit. Boards can then avoid overcommitting to fragile reads. High-discipline organizations treat confidence as a first-class governance signal. They ask whether apparent improvement is robust enough to justify incremental commitments.",
      "Segment-level visibility protects against average-value illusions. Portfolio-level metrics can hide deterioration in high-value customer segments while lower-value segments inflate top-line activity. For venture-backed companies with limited runway flexibility, segment distortion is dangerous because it drives spend toward misleading traction narratives.",
      "Cash conversion and decision velocity should be reviewed together. If decision cycle time increases while burn remains flat, the organization may be paying for organizational drag rather than learning. Boards should monitor the relationship between spend and cycle-time movement, then ask which governance frictions are producing low information return.",
      "Cross-functional variance notes should accompany each scorecard section. Finance, product, and go-to-market teams often interpret the same movement differently. Rather than forcing artificial consensus, disciplined packs include variance narratives with confidence ratings and recommended next checks. This creates transparency without slowing decisions.",
      "Finally, scorecards should include explicit stop decisions. Most board materials over-report initiatives in motion and under-report initiatives paused or retired. Including stop decisions normalizes disciplined correction and improves capital recycling quality over time.",
    ],
  },
  {
    heading: "Board workshop agenda for capital discipline reset",
    paragraphs: [
      "A reset workshop should begin with commitment inventory, not future planning. Directors and executives first need shared visibility into current fixed and semi-fixed obligations by reversibility class. This inventory should include hiring commitments, vendor contracts, roadmap promises, and channel investments. The goal is to expose where flexibility already exists and where it has silently eroded.",
      "The second workshop block should challenge assumption quality. For each major commitment, ask what assumption is carrying most downside if wrong, what signal confirms or disproves that assumption, and how quickly the signal can be observed. Assumption framing reduces rhetorical debate and moves governance toward falsifiable logic.",
      "Third, run an escalation simulation. Choose two plausible adverse scenarios and walk through trigger detection, owner notification, board addendum preparation, and action execution. Simulations reveal process gaps before real pressure arrives and often surface authority ambiguity that documents alone miss.",
      "Fourth, review capital allocation alternatives as staged pathways rather than binary choices. Instead of approve or reject, define baseline tranche, evidence gate, and expansion tranche. This preserves momentum while controlling downside exposure.",
      "Fifth, align on communication posture. Governance confidence deteriorates quickly when internal and board narratives diverge. Workshop outputs should include a shared vocabulary for describing uncertainty, confidence, and rationale for reversals. Vocabulary consistency improves trust across difficult quarters.",
      "Conclude with ownership and cadence commitments: who maintains the decision inventory, who owns threshold health reporting, and when retrospective findings are incorporated. A workshop without durable ownership turns into symbolic governance theater.",
    ],
  },
];

const boardFrameworkDeepDiveSections: PillarSection[] = [
  {
    heading: "Framework diagnostics: how to know posture governance is actually working",
    paragraphs: [
      "A functioning board level capital posture framework produces measurable changes in decision quality and organizational behavior. Early indicators include reduced exception volume, faster closure of escalated issues, and tighter linkage between confidence shifts and allocation changes. If those movements are absent, the framework may exist on paper but not in practice.",
      "Another diagnostic is predictability of board asks. Mature governance systems generate fewer surprise requests because management teams can anticipate artifact requirements. Surprise-heavy board cycles often indicate unclear boundaries or inconsistent enforcement.",
      "Track reversal quality, not just reversal count. A high reversal count can signal either healthy discipline or unstable planning. Quality metrics include time-to-detection, adherence to notification protocol, collateral impact, and documented learning. Boards should prefer transparent, timely reversals over delayed defenses.",
      "Observe where debate time goes. In immature frameworks, meetings spend most time on data validity and process ownership. In mature frameworks, debate shifts toward strategic trade-offs and sequencing. This transition is a reliable sign that governance foundations are stabilizing.",
      "Monitor decision throughput by class. Delegated decisions should accelerate while reserved decisions remain deliberate and evidence-rich. If all classes slow equally, process burden is likely too high. If reserved decisions accelerate without evidence depth, governance rigor is probably degrading.",
      "Finally, run quarterly audits on threshold calibration. Thresholds that never trigger may be too loose; thresholds that trigger continuously may be too sensitive or mapped to non-actionable metrics. Calibration is ongoing stewardship, not a one-time setup task.",
    ],
  },
  {
    heading: "Board implementation playbook: quarter-by-quarter sequencing",
    paragraphs: [
      "Quarter one should focus on baseline architecture: posture definitions, decision classes, and mandatory artifacts for material commitments. Keep scope constrained to avoid rollout fatigue. The objective is consistency, not perfection.",
      "Quarter two should expand into operating integration. Embed posture fields into budgeting, roadmap reviews, and hiring plans. Integrations should reduce duplicate reporting by reusing the same governance data in multiple forums.",
      "Quarter three should emphasize learning loops. Conduct retrospective reviews on approved, paused, and reversed decisions. Compare expected indicators versus observed indicators, and capture what changed in threshold interpretation. Learning loops prevent rigid adherence to stale assumptions.",
      "Quarter four should target resilience under stress. Run tabletop exercises on scenario shocks, leadership transitions, and financing constraint events. Test whether authority maps, communication templates, and escalation mechanics hold under compressed timelines.",
      "Across all quarters, define one accountable executive for framework integrity and one board sponsor for consistency enforcement. Shared ownership without clear accountability is a predictable failure path.",
      "By the end of year one, the framework should produce a coherent governance archive: decision packets, escalation logs, variance addendums, and retrospective findings. This archive becomes strategic infrastructure for future cycles and board continuity.",
    ],
  },
];



const extendedGovernanceAppendix: PillarSection[] = [
  {
    heading: "Board Q&A appendix: high-friction governance questions",
    paragraphs: [
      "What evidence would make us increase commitment today, and what evidence would make us pause? This question prevents asymmetry where expansion criteria are vague but continuation bias is strong. A disciplined answer includes explicit metrics, confidence thresholds, and ownership for monitoring. Boards should require this answer on every material proposal so teams cannot rely on narrative confidence alone.",
      "Where could this decision fail silently before lagging outcomes expose it? Silent failure channels include quality drift, customer support burden, sales-cycle elongation, and staffing fragility. Identifying silent channels early allows governance to attach leading indicators and escalation rules before value erosion compounds.",
      "Which assumptions are externally dependent and which are internally controllable? External dependencies should carry larger buffers and shorter review intervals. Internal assumptions should carry clear owner accountability with dated checkpoints. Distinguishing these categories helps boards allocate scrutiny where intervention can actually change outcomes.",
      "How does this proposal alter our option set 90 days from now? Strong proposals expand or preserve optionality while gathering evidence. Weak proposals consume optionality rapidly and provide limited learning. Option-set framing helps directors evaluate strategic flexibility rather than isolated ROI narratives.",
      "If threshold breaches occur, what is the first 48-hour response sequence? The best teams define immediate containment, communication, and decision handoff steps in advance. Without a 48-hour plan, escalation often becomes delayed triage that increases collateral damage.",
      "What decision from last quarter would we make differently with current information, and how are we encoding that lesson now? This question connects retrospective learning to current governance mechanics and prevents repeating avoidable mistakes.",
    ],
  },
  {
    heading: "Implementation anti-patterns and remediation actions",
    paragraphs: [
      "Anti-pattern one is framework maximalism: introducing too many categories, metrics, and templates at once. Remediation is phased adoption with one high-risk decision domain first, then progressive expansion after teams demonstrate artifact reliability.",
      "Anti-pattern two is threshold ambiguity. Teams define ranges too broad to trigger action, then rely on narrative discretion under stress. Remediation is to tighten thresholds, define persistence windows, and map each threshold to a required action owner and timeline.",
      "Anti-pattern three is missing rollback readiness. Organizations claim reversibility but cannot execute because communication plans, dependency maps, or authority handoffs are incomplete. Remediation is regular reversal drills with after-action reports tracked by executive owners.",
      "Anti-pattern four is governance theater in board materials. Packets show extensive reporting but little decision relevance. Remediation is to enforce decision-first packet structure: what changed, what confirmed, what failed to confirm, what action is requested, and what is being stopped.",
      "Anti-pattern five is inconsistent language across functions. Finance, product, and go-to-market teams use different meanings for risk and confidence, producing avoidable conflict. Remediation is a shared governance lexicon and recurring cross-functional calibration sessions.",
      "Anti-pattern six is weak decision memory. Without indexed historical artifacts, teams re-litigate assumptions and lose learning velocity. Remediation is a lightweight decision repository tied to threshold logs, reversibility classes, and retrospective outcomes.",
    ],
  },
];



const boardOperatingCadenceAppendix: PillarSection[] = [
  {
    heading: "12-month governance cadence blueprint",
    paragraphs: [
      "Month 1 should establish baseline posture and commitment inventory with reversibility classes. The board packet should include current thresholds, confidence notes, and any areas lacking data quality. Leadership must leave the month with explicit owner assignments for missing instrumentation and unresolved decision rights.",
      "Month 2 should focus on threshold calibration and exception handling pathways. Teams should present draft escalation protocols and run one live simulation for a realistic breach event. Directors should confirm response windows and board notification standards before the next cycle.",
      "Month 3 should introduce first retrospective review of decisions made under the new process. Evaluate whether approved commitments matched evidence quality and whether any paused decisions were revisited using predefined criteria. Retrospective output should produce immediate process adjustments.",
      "Months 4 through 6 should emphasize cross-functional consistency. Finance, product, operations, and GTM should present aligned interpretations of posture movement and proposed allocation shifts. Misalignment should trigger lexicon and metric-definition updates rather than ad hoc compromise language.",
      "Month 7 should include a board-level scenario drill covering simultaneous demand softening and execution strain. The exercise should test whether thresholds trigger in sequence, whether authority maps hold, and whether communications can be issued rapidly with coherent rationale.",
      "Months 8 through 10 should evaluate portfolio ratio discipline between reversible exploration and irreversible commitments. Directors should compare ratio movement against confirmation quality and question any irreversible expansion unsupported by sustained evidence persistence.",
      "Month 11 should review governance system health itself: artifact completion rates, escalation response times, rollback readiness, and retrospective closure quality. Treat governance operations as a managed system with its own reliability metrics.",
      "Month 12 should close the cycle with board and executive alignment on what to simplify, what to tighten, and what to retire. Mature governance evolves by pruning low-value process steps while preserving discipline where risk concentration remains high.",
    ],
  },
  {
    heading: "Director checklist for every major capital decision",
    paragraphs: [
      "Can we state the primary hypothesis, evidence threshold, and decision owner in one minute? If not, the proposal is not ready for approval. Brevity tests clarity.",
      "Does the packet distinguish reversible and irreversible components of the same initiative? Mixed initiatives often hide irreversible tail risk inside otherwise flexible plans.",
      "Are escalation thresholds measurable, time-bounded, and tied to named response actions? Metrics without consequences create false confidence.",
      "Is there a documented 30-day confirmation view showing persistence, confidence, and potential posture adjustments? Without confirmation framing, teams may overreact or underreact to short-term volatility.",
      "What is the first action if we are wrong? High-quality proposals include immediate containment steps and communication sequences, not only upside narratives.",
      "Which prior decision from our archive is most comparable, and what lesson has been encoded into this proposal? Governance maturity compounds through explicit historical learning.",
      "What would we stop funding if this initiative requires additional capital beyond current assumptions? Trade-off clarity is a hallmark of true capital discipline.",
      "Have we attached conversion instrumentation to requested artifacts and CTAs so governance resources translate into measurable operator adoption? Adoption signals determine whether content and frameworks influence behavior.",
    ],
  },
];



const frameworkClosingSection: PillarSection[] = [
  {
    heading: "Closing note: making the framework durable",
    paragraphs: [
      "Durability comes from repetition with feedback, not from one-time policy rollout. Boards should commit to monthly reinforcement of framework language, thresholds, and artifact standards so decision quality remains stable despite leadership turnover or market volatility.",
      "A durable framework is legible to new leaders within weeks. If onboarding requires extensive unwritten context, governance is too personality-dependent and should be simplified.",
      "Directors should also publish annual governance principles that summarize non-negotiables: evidence before expansion, thresholds before escalation, and reversibility planning before irreversible commitments."
    ],
  },
];

const reversibilityClosingSection: PillarSection[] = [
  {
    heading: "Closing note: reversibility as board confidence infrastructure",
    paragraphs: [
      "Reversibility as governance should be treated as confidence infrastructure. It allows boards to authorize learning without surrendering control and to intervene quickly without destabilizing execution.",
      "When reversibility is institutionalized, teams become more candid about uncertainty because correction pathways are clear. Candor improves signal quality and keeps capital posture aligned with reality rather than optimism.",
      "The long-term result is not perfect forecasts but resilient governance: fewer surprise failures, faster recovery when assumptions break, and stronger trust between management and board stakeholders.",
      "Boards that sustain this discipline over multiple cycles usually see better capital efficiency, cleaner communication under pressure, and higher confidence in when to accelerate versus when to hold, reset, or de-risk commitments across functions, portfolios, and board-approved investment horizons over quarterly, annual, and multiyear planning cycles."
    ],
  },
];

const reversibilityDeepDiveSections: PillarSection[] = [
  {
    heading: "Reversibility drills: from policy statement to operational muscle",
    paragraphs: [
      "Reversibility policies fail when teams never rehearse execution. Boards should require periodic drills on high-impact decision streams such as pricing changes, major feature launches, and channel-scale experiments. The drill objective is to validate that rollback can be initiated, communicated, and completed within stated windows.",
      "Each drill should test data readiness first. Can teams detect threshold breaches quickly with trusted data sources? If detection relies on manual data stitching, rollback windows may close before action begins. Detection latency is often the largest hidden risk in reversibility governance.",
      "Second, test authority handoffs. If the primary owner is unavailable, does the backup owner have documented authority and context to execute? Organizations commonly discover that backup ownership exists in charts but not in practice.",
      "Third, test communication sequencing under time pressure. Customers, internal teams, and partners require different messages and timing. Poor sequencing can convert a manageable rollback into reputational damage.",
      "Fourth, measure collateral effects. A reversal may protect capital but create service instability or support overload. Drill outputs should include mitigation steps that preserve customer trust during unwind.",
      "Finally, publish drill findings with clear remediation owners. Without transparent follow-through, drills become performative compliance exercises rather than governance capability building.",
    ],
  },
  {
    heading: "Portfolio governance: balancing reversible exploration with irreversible commitments",
    paragraphs: [
      "Healthy portfolios intentionally combine reversible exploration and selective irreversible bets. The role of governance is to maintain ratio discipline so irreversible exposure grows only when confirmation quality improves. Boards should monitor this ratio monthly and discuss drift explicitly.",
      "Exploration lanes should have pre-set budget envelopes and hard stop triggers. This allows teams to test hypotheses quickly without repeated approval cycles while still limiting downside. Speed with containment is the operating advantage of reversibility governance.",
      "Irreversible bets should pass a higher bar that includes strategic fit, evidence persistence, and contingency readiness. A compelling upside story without contingency design is insufficient for approval.",
      "As portfolios scale, interdependency mapping becomes critical. Two individually reversible decisions can become collectively hard to unwind if they share infrastructure, sales commitments, or customer-facing promises. Board packs should include dependency overlays to surface these effects.",
      "Governance quality improves when boards review not only expected value but option value. Reversible decisions preserve option value by keeping future pathways open. Irreversible decisions consume option value and therefore should be rationed deliberately.",
      "The goal is not to avoid commitment. The goal is to commit in a way that preserves strategic agility and keeps correction costs below material damage thresholds.",
    ],
  },
];

export const resourcePillarPages: ResourcePillarPage[] = [
  {
    slug: "capital-discipline-venture-backed-companies",
    keyword: "capital discipline venture backed companies",
    title: "Capital Discipline Venture Backed Companies: A Board Operating System",
    description:
      "Capital discipline venture backed companies require governance rhythm, escalation thresholds, and reversible commitments. Use this board-ready operating system.",
    h1: "Capital Discipline Venture Backed Companies",
    canonicalPath: canonicalCapitalDisciplinePath,
    parentTopic: true,
    boardPackContext:
      "This canonical pillar anchors the parent topic and links every supporting governance artifact to board-level capital allocation decisions.",
    midpointCtaLabel: "Download the Capital Posture Template",
    sections: [
      {
        heading: "Why capital discipline now defines board credibility",
        paragraphs: [
          "Boards of venture-backed companies are no longer judged on aspiration alone. They are judged on whether capital translates into durable learning, measurable resilience, and disciplined sequencing of risk. Capital discipline venture backed companies treat every dollar as a strategic commitment with an expected information return, not merely an expense line.",
          "In the previous growth era, velocity often masked governance defects. Teams could grow into mistakes, refinance uncertainty, and explain misses as temporary market noise. In today’s environment, that pattern has inverted. The same governance weaknesses now surface as runway compression, delayed decision quality, and reactive cuts that damage capability at the worst possible moment.",
          "A board-facing capital discipline model must therefore do three things: set a decision cadence, define thresholds for intervention, and preserve reversibility wherever possible. Without those mechanics, leadership teams oscillate between overconfidence and panic. With those mechanics, the organization can operate through volatility while preserving strategic optionality.",
        ],
        subsections: [
          {
            heading: "H3: From growth storytelling to operating proof",
            paragraphs: [
              "Board conversations are healthiest when they move from narratives about intent to evidence about control. Capital discipline does not suppress ambition; it constrains ambition to evidence-backed sequences. The right question is not, ‘Can we fund this idea?’ It is, ‘What evidence sequence justifies the next tranche of commitment?’",
              "This shift creates cultural clarity. Functional leaders understand that approvals are tied to proof gates, not persuasive decks. Investors gain confidence because decision criteria are legible and repeatable. Most importantly, teams learn faster because assumptions are surfaced early and measured against explicit criteria."
            ]
          },
          {
            heading: "H3: The compounding cost of ambiguous commitments",
            paragraphs: [
              "Ambiguous commitments create hidden liabilities: multi-quarter headcount burdens, vendor lock-in, go-to-market promises that outpace product readiness, and architecture decisions that degrade agility. These liabilities rarely appear in a single board packet. They emerge as a portfolio of constrained options.",
              "Capital discipline venture backed companies treat ambiguity as risk debt. They force commitment taxonomy into planning: reversible, partially reversible, and irreversible. That taxonomy should appear in investment proposals, monthly operating reviews, and board-level governance check-ins."
            ]
          }
        ]
      },
      {
        heading: "Board-level architecture for disciplined capital allocation",
        paragraphs: [
          "A usable governance architecture is specific, repetitive, and auditable. It includes a standard decision packet, confidence bands for major assumptions, and pre-committed responses when threshold breaches occur. Boards that skip architecture default to personality-driven governance where urgency determines quality.",
          "Start by adopting a common packet structure across strategic bets: objective, required spend, expected leading indicators, reversal conditions, and owner accountability. If each proposal uses different logic, portfolio coherence becomes impossible.",
          "Next, define cadence layers. Weekly reviews monitor directional movement, monthly reviews evaluate 30-day confirmation logic, and quarterly board sessions adjudicate irreversible commitments. Cadence discipline is the mechanism that turns data into governance rather than commentary.",
        ],
        subsections: [
          {
            heading: "H3: Decision classes and governance rights",
            paragraphs: [
              "Not all decisions require board involvement, but all material commitments require board legibility. Define decision classes by downside magnitude and reversibility: delegated decisions (management-only), supervised decisions (management with board visibility), and reserved decisions (board approval required).",
              "Escalation rights should be pre-committed. When a threshold is breached, teams should not negotiate whether governance applies. They should execute the agreed process. This reduces delay and prevents political debates under pressure."
            ]
          },
          {
            heading: "H3: Capital posture scorecard as a shared artifact",
            paragraphs: [
              "A board-friendly scorecard should combine three views: liquidity resilience, demand reliability, and execution confidence. Each view should include current value, trend direction, confidence rating, and threshold status.",
              "This artifact is not a dashboard vanity project; it is an alignment contract. If the scorecard indicates deteriorating demand reliability, posture should tighten by design. If confirmation persists, selective expansion becomes defensible."
            ]
          }
        ]
      },
      {
        heading: "Execution discipline: sequencing commitments in uncertain regimes",
        paragraphs: [
          "Discipline is mostly a sequencing problem. Teams fail not because they invest, but because they invest out of order. Governance should prioritize commitments that increase information quality before commitments that increase fixed cost exposure.",
          "A practical sequencing hierarchy for venture-backed boards begins with resilience-preserving moves, then evidence-generating experiments, then scalable commitments. This order prevents the common trap of scaling assumptions before the assumptions are tested.",
          "Capital discipline venture backed companies convert strategic goals into tranche-based commitments. Instead of approving a full-year spend envelope for a single thesis, boards approve staged releases tied to observable milestones.",
        ],
        subsections: [
          {
            heading: "H3: Tranche logic and kill criteria",
            paragraphs: [
              "Every tranche should include a kill criterion, not just a success criterion. Kill criteria protect the organization from sunk-cost escalation by defining when continuation becomes governance failure rather than perseverance.",
              "Write criteria in operational terms: customer behavior, cycle-time metrics, cash conversion performance, or reliability thresholds. Avoid broad language such as ‘market feels weak’ or ‘momentum is mixed.’ Operational precision enables decisive action."
            ]
          },
          {
            heading: "H3: Integrating finance and product signal quality",
            paragraphs: [
              "Finance visibility without product signal quality encourages over-defensive behavior. Product signals without finance constraints encourage optimism bias. Boards should require combined signal reviews where product evidence and financial exposure are interpreted together.",
              "This integrated review should include counterfactuals: what happens if leading indicators improve slowly, plateau, or reverse? Counterfactual planning is the difference between planned prudence and emergency response."
            ]
          }
        ]
      },
      {
        heading: "Governance operating cadence: 30-day confirmation and threshold response",
        paragraphs: [
          "A 30-day confirmation logic is the minimum viable bridge between noisy weekly data and quarterly board decisions. It prevents overreaction to isolated spikes while reducing the lag that causes boards to recognize deterioration too late.",
          "Operationally, confirmation logic requires three explicit elements: which indicators are monitored, what constitutes persistence, and which posture adjustments are triggered by persistent movement. Ambiguity in any element creates inconsistent execution.",
          "The board’s role is to enforce consistency. Management should be free to execute inside thresholds, but not to reinterpret thresholds each month. Consistent governance is what preserves trust when outcomes are mixed.",
        ],
        subsections: [
          {
            heading: "H3: Escalation protocol design",
            paragraphs: [
              "Escalation protocols should include trigger, notification window, required artifact, and decision owner. For example: ‘If net retention drops below X for two consecutive reporting cycles with low confidence recovery signals, board packet addendum required within five business days.’",
              "Protocol quality is visible when teams know exactly what to prepare before a review. Poor protocols generate narrative firefighting and wasted cycles."
            ]
          },
          {
            heading: "H3: Board pack artifacts that increase decision quality",
            paragraphs: [
              "High-quality board packs include a posture summary, threshold dashboard, decision inventory by reversibility class, and clear asks tied to pre-approved governance rights. They also include what has been stopped, not only what is being proposed.",
              "Stopping decisions are core evidence of discipline. Boards should reward high-integrity pauses and rollbacks because they preserve resources for higher-quality opportunities."
            ]
          }
        ]
      },
      {
        heading: "What exemplary boards do differently",
        paragraphs: [
          "Exemplary boards build systems, not speeches. They insist on reusable artifacts, on consistent operating language, and on transparent ownership boundaries. This allows governance quality to scale as the company scales.",
          "They also normalize reversals. A reversal is not failure when predefined thresholds are met; it is evidence of disciplined governance. By reducing stigma around rollback, boards increase organizational honesty and shorten time-to-correction.",
          "Finally, strong boards protect strategic stamina. They avoid indiscriminate austerity and instead reallocate capital toward evidence-backed bets that maintain optionality and team confidence.",
        ],
        subsections: [
          {
            heading: "H3: Signals of a mature capital discipline system",
            paragraphs: [
              "Mature systems show repeatability: decisions are documented the same way, thresholds are interpreted consistently, and post-decision reviews feed directly into the next cycle.",
              "Maturity also shows up in narrative quality. Leadership can explain not only what was decided, but why alternatives were deferred and what evidence would reopen them."
            ]
          },
          {
            heading: "H3: 90-day implementation roadmap",
            paragraphs: [
              "First 30 days: standardize decision packets and define escalation thresholds. Days 31–60: implement confirmation logic and governance cadence. Days 61–90: enforce artifact quality and run first retrospective across approved and paused decisions.",
              "By day 90, the board should have a stable operating baseline: clearer asks, faster interventions, and fewer irreversible surprises."
            ]
          }
        ]
      },
      ...capitalDisciplineDeepDiveSections,
      ...extendedGovernanceAppendix,
      ...boardOperatingCadenceAppendix
    ],
  },
  {
    slug: "board-level-capital-posture-framework",
    keyword: "board level capital posture framework",
    title: "Board Level Capital Posture Framework for Venture Governance",
    description:
      "A board level capital posture framework aligns risk, spend, and sequencing through confirmation logic, thresholds, and reversible governance artifacts.",
    h1: "Board Level Capital Posture Framework",
    canonicalPath: canonicalCapitalDisciplinePath,
    parentTopic: false,
    boardPackContext:
      "This supporting pillar extends the parent topic by converting posture concepts into a board-operable framework and artifact cadence.",
    midpointCtaLabel: "Request a Board Pack Walkthrough",
    sections: [
      {
        heading: "Defining board-level capital posture in practical terms",
        paragraphs: [
          "A board level capital posture framework is a repeatable method for determining how aggressively the company should commit capital under current macro and execution conditions. It is not a static policy memo. It is an adaptive operating model that links evidence, confidence, and action rights.",
          "The board’s posture role is to set boundaries, not micromanage execution. Boundaries answer three questions: what commitments are permitted, what commitments require added proof, and what commitments are prohibited until conditions improve.",
          "When posture is clear, teams can move quickly inside guardrails. When posture is vague, speed declines and risk increases simultaneously because every decision becomes a one-off negotiation.",
        ],
        subsections: [
          {
            heading: "H3: Posture is a portfolio property",
            paragraphs: [
              "Boards often assess posture at the line-item level and miss systemic risk. A stronger approach treats posture as a portfolio property: aggregate fixed-cost exposure, aggregate reversal capacity, and aggregate confidence in demand durability.",
              "Portfolio framing reveals concentration risk. A single large initiative may appear reasonable in isolation but become dangerous when layered onto other irreversible commitments."
            ]
          },
          {
            heading: "H3: Boundary clarity as execution leverage",
            paragraphs: [
              "Boundary clarity creates managerial leverage because functional leads know where autonomy ends. This reduces committee load, speeds routine decisions, and protects senior attention for true exceptions.",
              "A useful boundary set can be expressed in one page and referenced in every major proposal. If boundaries require interpretation each cycle, they are too abstract to govern behavior."
            ]
          }
        ]
      },
      {
        heading: "The three-layer posture framework",
        paragraphs: [
          "Effective board frameworks separate market context, company capacity, and decision mechanics. These layers prevent category mistakes such as blaming weak execution on macro conditions or treating temporary macro noise as strategic collapse.",
          "Layer one (market context) captures cost of capital pressure, demand reliability, and financing optionality. Layer two (company capacity) captures liquidity resilience, execution throughput, and organizational strain. Layer three (decision mechanics) captures escalation thresholds, reversibility classes, and review cadence.",
          "Boards should review all three layers together. Looking at only one layer drives false confidence and poor sequencing.",
        ],
        subsections: [
          {
            heading: "H3: Layer one — external regime signals",
            paragraphs: [
              "External regime signals should be tracked as directional inputs rather than deterministic forecasts. The purpose is to calibrate posture, not to claim certainty.",
              "Signals should include persistence windows and confidence notes. Single-period movements should not trigger major posture shifts absent corroborating evidence."
            ]
          },
          {
            heading: "H3: Layer two — internal readiness and resilience",
            paragraphs: [
              "Internal readiness translates strategy into operational feasibility. It includes burn flexibility, delivery reliability, customer retention stability, and leadership bandwidth.",
              "This layer often exposes hidden constraints. A strategy can be directionally correct but operationally premature if execution systems are already saturated."
            ]
          },
          {
            heading: "H3: Layer three — governance control logic",
            paragraphs: [
              "Control logic defines how decisions flow through the organization under each posture state. It includes authority maps, threshold triggers, and mandatory artifacts for approvals.",
              "The control layer is where governance intent becomes behavior. Without it, posture remains rhetorical."
            ]
          }
        ]
      },
      {
        heading: "Building a posture-to-action matrix the board can trust",
        paragraphs: [
          "A trustworthy matrix maps posture states to concrete actions across hiring, roadmap scope, go-to-market spend, vendor commitments, and capital structure options. Boards should insist that each action entry includes both expansion and contraction conditions.",
          "The matrix should explicitly define delegated decisions and board-reserved decisions per domain. This prevents governance drift where management expands commitments during favorable weeks without sustained confirmation.",
          "Operationally, the matrix belongs in recurring board materials, not an appendix. If it is hard to locate, it will not shape behavior.",
        ],
        subsections: [
          {
            heading: "H3: Designing thresholds that are measurable",
            paragraphs: [
              "Thresholds should be tied to observable metrics with documented data owners. Avoid compound statements that mix multiple ambiguous conditions.",
              "For each threshold, define breach severity bands and required response windows. This turns a metric move into an execution plan."
            ]
          },
          {
            heading: "H3: Avoiding matrix inflation",
            paragraphs: [
              "Matrix inflation happens when teams add exceptions until the framework loses force. Counter this by limiting exception pathways and requiring explicit sunset dates for temporary overrides.",
              "A board-level rule of thumb: if exceptions exceed a manageable minority of decisions, revisit the base matrix rather than negotiating more carve-outs."
            ]
          }
        ]
      },
      {
        heading: "Artifact governance: what must exist before approvals",
        paragraphs: [
          "A board level capital posture framework is only as strong as its artifacts. At minimum, major commitments should require: decision rationale, reversibility classification, trigger dashboard, owner map, and rollback communications draft.",
          "These artifacts increase execution quality by forcing preparatory work before capital is locked. They also improve board efficiency because discussion starts with comparable information structures.",
          "Artifact requirements should scale with commitment size. Lightweight proposals need lightweight evidence; irreversible proposals need full governance packages.",
        ],
        subsections: [
          {
            heading: "H3: Mid-cycle variance addendums",
            paragraphs: [
              "When indicators diverge from plan, management should provide a variance addendum that explains movement, confidence changes, and recommended posture response.",
              "Addendums reduce surprise and allow board members to assess whether deviation reflects normal volatility or structural deterioration."
            ]
          },
          {
            heading: "H3: Decision memory and institutional learning",
            paragraphs: [
              "Artifact history should be retained in a searchable decision memory. The goal is to learn from prior assumptions, thresholds, and intervention timing.",
              "Institutional memory strengthens new decisions because teams can reference historical signal quality rather than debating from scratch."
            ]
          }
        ]
      },
      {
        heading: "How to implement the framework without creating bureaucracy",
        paragraphs: [
          "The common failure mode is bureaucracy disguised as rigor. Implementation should reduce ambiguity and rework, not increase meeting load. Start with existing rhythms and replace low-value reporting with posture artifacts.",
          "Use a phased rollout: pilot in one decision domain, refine templates, then expand across domains. Pilot choice should match highest-risk commitment stream, typically hiring pace or GTM spend escalation.",
          "Board sponsorship matters. Directors should enforce consistency by requesting the same artifacts each cycle and declining ad hoc exceptions that bypass process.",
        ],
        subsections: [
          {
            heading: "H3: First-quarter implementation milestones",
            paragraphs: [
              "Weeks 1–2: define posture states and threshold map. Weeks 3–6: launch standard artifacts and authority table. Weeks 7–10: run first retrospective with evidence on escalations, reversals, and decision cycle time.",
              "By quarter end, the company should show lower decision variance, clearer asks, and better linkage between posture calls and resource allocation."
            ]
          },
          {
            heading: "H3: Board questions that sustain quality",
            paragraphs: [
              "Directors can preserve framework quality by repeatedly asking: What changed? What confirmed? What failed to confirm? What did we stop? Which threshold is closest to breach?",
              "These questions are simple, but they keep governance anchored to discipline rather than narrative drift."
            ]
          }
        ]
      },
      ...boardFrameworkDeepDiveSections,
      ...extendedGovernanceAppendix,
      ...boardOperatingCadenceAppendix,
      ...frameworkClosingSection
    ],
  },
  {
    slug: "reversibility-as-governance",
    keyword: "reversibility as governance",
    title: "Reversibility as Governance for Board-Grade Decision Control",
    description:
      "Reversibility as governance gives boards a practical method for decision rights, escalation thresholds, and rollback discipline under uncertain capital regimes.",
    h1: "Reversibility as Governance",
    canonicalPath: canonicalCapitalDisciplinePath,
    parentTopic: false,
    boardPackContext:
      "This supporting pillar explains how reversibility standards become board-level control logic linked to capital posture and escalation practices.",
    midpointCtaLabel: "Download Reversibility Governance Template",
    sections: [
      {
        heading: "Why reversibility is a governance function, not an execution detail",
        paragraphs: [
          "Reversibility as governance reframes a common blind spot: organizations often discuss reversibility after decisions are approved, when the real governance opportunity was before approval. Boards should treat reversibility classification as a gating input equal to expected upside.",
          "A decision that cannot be reversed quickly should face a higher evidence bar and tighter escalation controls. A reversible decision can proceed with lower initial certainty because downside containment is built in. This asymmetry allows companies to preserve learning velocity while limiting terminal risk.",
          "When reversibility is absent from board packets, directors lose visibility into option decay. Capital gets committed faster than it can be reallocated, and portfolio flexibility collapses just as uncertainty rises.",
        ],
        subsections: [
          {
            heading: "H3: Governance externalities of irreversible choices",
            paragraphs: [
              "Irreversible commitments create externalities across teams: hiring plans lock operating expense, architecture lock-in constrains roadmap alternatives, and long-cycle contracts reduce financial maneuverability.",
              "These externalities mean reversibility cannot be delegated solely to functional leaders. It requires cross-functional governance review that weighs systemic impact."
            ]
          },
          {
            heading: "H3: From abstract caution to explicit standards",
            paragraphs: [
              "Most boards endorse caution in uncertain periods, but caution without standards degrades into subjective debate. Reversibility standards convert caution into measurable policy.",
              "A practical standard set includes maximum unwind window, acceptable unwind cost, communication readiness requirements, and authority-to-trigger definitions."
            ]
          }
        ]
      },
      {
        heading: "Reversibility taxonomy for board decision packets",
        paragraphs: [
          "Boards need a common taxonomy to compare decisions. A simple three-tier model works well: fully reversible (unwind within 30 days with low collateral impact), conditionally reversible (unwind possible with moderate cost and controlled disruption), and effectively irreversible (unwind cost or trust impact is material).",
          "Each proposal should declare its category, evidence basis for that claim, and what operational preparations support unwind feasibility. Unsupported reversibility claims should be treated as unresolved risk.",
          "Taxonomy use also improves sequencing. Teams can front-load reversible experiments and delay irreversible rollouts until confidence strengthens.",
        ],
        subsections: [
          {
            heading: "H3: Evidence required by reversibility class",
            paragraphs: [
              "Fully reversible initiatives require baseline metrics and a pre-defined rollback trigger table. Conditionally reversible initiatives require additional dependency mapping and customer communications plan. Irreversible initiatives require board-approved downside scenarios and staged capital release.",
              "This evidence ladder allows governance friction to match commitment risk rather than applying one-size-fits-all process overhead."
            ]
          },
          {
            heading: "H3: Integrating taxonomy into monthly governance",
            paragraphs: [
              "Monthly reviews should include an inventory of active decisions by reversibility class, with movement since prior review. This helps directors detect silent migration toward rigidity.",
              "If the portfolio tilts toward irreversible exposure without corresponding confidence gains, posture should tighten automatically."
            ]
          }
        ]
      },
      {
        heading: "Escalation thresholds and rollback authority design",
        paragraphs: [
          "Reversibility only protects the business when escalation and authority are explicit. Thresholds define when attention escalates; authority maps define who can act without delay. Both are required for real-time governance.",
          "Thresholds should combine magnitude and persistence. For example, a single-week anomaly may trigger observation, while a two-cycle breach with declining confidence triggers action. This pattern aligns with 30-day confirmation logic.",
          "Authority maps should include primary owner, backup owner, and board notification rules. Ambiguity during a reversal window destroys the value of reversibility planning.",
        ],
        subsections: [
          {
            heading: "H3: Designing thresholds that trigger real behavior",
            paragraphs: [
              "A threshold without predefined consequence is not a governance control; it is a reporting metric. Directors should verify that each threshold maps to a concrete action: pause, rollback, re-scope, or escalate for board approval.",
              "Consequences should include timing constraints. If response windows are open-ended, teams may delay in hopes that metrics recover without intervention."
            ]
          },
          {
            heading: "H3: Board notification protocols",
            paragraphs: [
              "Notification protocols should specify what the board receives during threshold events: breach summary, confidence context, recommended action, and expected downstream impact.",
              "Standardized notification content reduces noise and enables directors to focus on decision quality rather than data interpretation disputes."
            ]
          }
        ]
      },
      {
        heading: "30-day confirmation logic as the bridge between volatility and commitment",
        paragraphs: [
          "Weekly data is valuable but volatile. Quarterly governance is stable but slow. A 30-day confirmation layer reconciles these tempos by requiring persistence before posture expansion and by accelerating intervention when deterioration persists.",
          "In reversibility governance, confirmation logic determines whether teams continue with reversible experimentation, initiate rollback, or seek board approval for irreversible scaling. It is the practical decision clock.",
          "Boards should request explicit confirmation tables in monthly packs: indicator, current direction, confidence, days in current state, and next decision checkpoint.",
        ],
        subsections: [
          {
            heading: "H3: Preventing confirmation theater",
            paragraphs: [
              "Confirmation theater occurs when teams cherry-pick indicators or reset windows after unfavorable movement. Prevent this by pre-committing indicator sets and requiring historical display of prior confirmations and failures.",
              "Auditability discourages narrative manipulation and preserves governance integrity."
            ]
          },
          {
            heading: "H3: Pairing confirmation with contingency plans",
            paragraphs: [
              "Each confirmation state should map to a contingency plan. If confirmation strengthens, define expansion limits. If confirmation weakens, define immediate containment actions.",
              "This pairing ensures that signal interpretation produces timely operational choices."
            ]
          }
        ]
      },
      {
        heading: "Institutionalizing reversibility as governance culture",
        paragraphs: [
          "Culture is where governance either compounds or decays. To institutionalize reversibility as governance, boards and executives must reward early signal disclosure, disciplined rollback, and clear documentation of decision logic.",
          "Leaders should explicitly separate ‘bad outcome’ from ‘bad process.’ A decision can fail despite good process, and a good outcome can still mask bad process. Reversibility governance focuses on process quality because process is controllable.",
          "Over time, this culture lowers fear around correction. Teams escalate faster, boards intervene earlier, and capital allocation remains adaptive instead of brittle.",
        ],
        subsections: [
          {
            heading: "H3: Executive behaviors that reinforce governance",
            paragraphs: [
              "Executives reinforce reversibility by showing rollback plans before asking for approval, documenting threshold breaches without spin, and sharing lessons from reversals.",
              "These behaviors model accountability and make governance artifacts useful rather than performative."
            ]
          },
          {
            heading: "H3: 90-day reversibility operating plan",
            paragraphs: [
              "Month one: classify active portfolio decisions and assign reversibility classes. Month two: define thresholds, authority maps, and board notification templates. Month three: run reversal drills on two critical decision streams and report findings.",
              "At the end of 90 days, the board should expect lower surprise, faster correction cycles, and improved confidence in capital posture execution."
            ]
          }
        ]
      },
      ...reversibilityDeepDiveSections,
      ...extendedGovernanceAppendix,
      ...boardOperatingCadenceAppendix,
      ...reversibilityClosingSection
    ],
  },
];

export const resourceSupportingPages = {
  decisionShieldOverview: {
    path: "/resources/decision-shield-overview",
    title: "Decision Shield Overview",
  },
  capitalPostureTemplate: {
    path: "/resources/capital-posture-template",
    title: "Capital Posture Template",
  },
};

export const findResourcePillarBySlug = (slug: string) => resourcePillarPages.find((page) => page.slug === slug);
