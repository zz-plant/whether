import type { Route } from "next";

export type ResourceArticle = {
  slug:
    | "should-we-freeze-hiring-high-interest-rate-environment"
    | "how-much-runway-do-we-need-tightening-market"
    | "platform-rewrites-during-capital-tightening-risk-analysis"
    | "how-venture-capital-cycles-affect-startup-operating-strategy"
    | "vc-portfolio-governance-case-example-burn-multiple-normalization"
    | "operator-posture-standardization-case-example-product-finance";
  title: string;
  description: string;
  keyword: string;
  cluster: "pain" | "vc";
  intent: "cfo" | "board" | "vp-product" | "vc-partner";
  format: "guide" | "case-example";
  boardSummary: string[];
  sections: Array<{ heading: string; paragraphs: string[] }>;
  faqs: Array<{ question: string; answer: string }>;
  toolLink: { href: Route; label: string };
};

export const resourceArticles: ResourceArticle[] = [
  {
    slug: "should-we-freeze-hiring-high-interest-rate-environment",
    title: "Should we freeze hiring in a high-interest-rate environment?",
    description:
      "A problem-first operating guide for startup leaders deciding when hiring freezes protect runway and when they quietly damage execution.",
    keyword: "hiring freeze high rates",
    cluster: "pain",
    intent: "cfo",
    format: "guide",
    boardSummary: [
      "Base case: do not run a blanket freeze. Classify open and planned roles by reversibility and by direct cash impact within two quarters.",
      "Escalate to freeze mode when cash conversion worsens for 30 days, sales cycle friction rises, and confidence in near-term financing drops.",
      "Keep three protected role bands active: reliability, revenue continuity, and decision-system instrumentation.",
      "Reversal trigger: reopen hiring in tranches only after two consecutive monthly reads show stabilization in burn multiple and demand quality.",
    ],
    sections: [
      {
        heading: "The real problem is not headcount. It is commitment quality under expensive capital.",
        paragraphs: [
          "When leaders ask whether to freeze hiring, they are usually asking a deeper question: do we trust our assumptions enough to turn cash into fixed obligations? In a high-interest-rate environment, uncertainty is expensive because the cost of being wrong compounds through payroll commitments, onboarding drag, and slower correction cycles.",
          "A blanket hiring freeze feels decisive because it creates immediate control. But blanket decisions often collapse very different risks into one call. A reliability engineer replacing a known bottleneck is not the same risk as adding a speculative growth pod. Treating both as identical reduces optionality when optionality matters most.",
          "The board-level issue is governance consistency. If hiring stays open without threshold discipline, spend drifts. If hiring freezes without role segmentation, execution debt builds. The right question is: which roles reduce downside now, which roles can wait, and which roles become dangerous commitments if demand softens further.",
        ],
      },
      {
        heading: "SAFE / RISKY / DANGEROUS framework for hiring decisions",
        paragraphs: [
          "SAFE roles are those that preserve operating integrity or immediate revenue continuity. Examples include production reliability, customer renewals support, and finance controls tied to cash visibility. These roles should continue through a constrained approval path because they reduce downside and often improve learning velocity.",
          "RISKY roles have plausible value but delayed evidence. Typical examples are expansion hires for initiatives that have not yet shown repeatability. In a tightening market, these hires should move to tranche gates: approve one role, define a 30-day evidence target, and only then release the next tranche.",
          "DANGEROUS roles are justified mostly by optimistic scenarios, ambiguous ownership, or vanity throughput metrics. Hiring into unvalidated adjacent markets, adding management layers without bottleneck evidence, or staffing long-range programs with weak milestone logic all fit this class. Pause these immediately until trigger conditions improve.",
          "The value of this framework is not semantics. It allows finance, product, and functional leaders to use one decision language in weekly and monthly reviews so hiring pressure does not bypass posture discipline.",
        ],
      },
      {
        heading: "Reversal trigger logic: how to unfreeze without overcorrecting",
        paragraphs: [
          "A freeze should not end because confidence ‘feels better.’ It should end because specific risk signals stabilize. Define reversal as a staged release process tied to observable indicators: burn multiple direction, pipeline conversion quality, and cash coverage after committed spend.",
          "A practical trigger set uses three conditions. First, demand quality stops degrading for 30 days, measured by win rate stability and churn pressure in core segments. Second, execution confidence improves, visible in cycle-time compression and fewer emergency escalations. Third, financing optionality no longer requires immediate defensive cuts.",
          "When all three conditions hold, reopen hiring in one or two SAFE tranches first. Keep RISKY hires gated behind explicit milestones and retain DANGEROUS holds until two monthly confirmations pass. This prevents a whiplash cycle where teams freeze hard and then re-expand on noise.",
        ],
      },
      {
        heading: "Board-facing summary block (forwardable)",
        paragraphs: [
          "Decision posture: constrained hiring, not blanket freeze. Governance objective: protect runway while preserving critical execution capacity.",
          "Approval policy: SAFE roles proceed with CFO and functional sign-off; RISKY roles require tranche gates and milestone proofs; DANGEROUS roles are paused.",
          "Monitoring cadence: weekly signal check for demand and execution confidence; monthly 30-day confirmation to adjust posture.",
          "Escalation rule: any deterioration in renewal stability or burn multiple beyond threshold triggers immediate board addendum and hiring policy review.",
        ],
      },
      {
        heading: "What operators should do this week",
        paragraphs: [
          "Build a role inventory with four fields: role purpose, downside if unfilled, expected evidence window, and reversibility. Then classify every open req and planned backfill as SAFE, RISKY, or DANGEROUS.",
          "Run a one-hour cross-functional review with finance, product, and hiring managers. Remove narrative arguments and require one measurable indicator for each approval request.",
          "Publish the resulting list in your weekly operating memo with reversal triggers attached. This is where leadership alignment hardens. A shared artifact prevents silent exceptions and improves board trust in execution discipline.",
        ],
      },
    ],
    faqs: [
      {
        question: "Should startups freeze hiring when rates are high?",
        answer:
          "Not automatically. Most teams need a segmented approach: continue SAFE hires, gate RISKY hires with milestones, and pause DANGEROUS hires until confirmation improves.",
      },
      {
        question: "How long should a hiring freeze last in a tightening market?",
        answer:
          "Use 30-day confirmation intervals. Keep the freeze until demand quality, execution confidence, and financing optionality stabilize together for at least one full operating month.",
      },
      {
        question: "What should I send my board about hiring posture?",
        answer:
          "Send a one-page summary with classification policy, approved exceptions, trigger thresholds, and a staged reversal plan.",
      },
    ],
    toolLink: { href: "/resources/reversal-trigger-checklist", label: "Use the Reversal Trigger Checklist" },
  },
  {
    slug: "how-much-runway-do-we-need-tightening-market",
    title: "How much runway do we need in a tightening market?",
    description:
      "A problem-first framework for setting runway targets that reflect risk exposure, reversal speed, and financing uncertainty.",
    keyword: "runway target recession",
    cluster: "pain",
    intent: "board",
    format: "guide",
    boardSummary: [
      "Target runway should be tied to volatility and reversal latency, not a generic month count.",
      "Base recommendation: maintain 18–24 months in tightening regimes, with upper bound required if commitments are slow to reverse.",
      "Use a two-layer target: minimum survivability floor plus strategic optionality buffer.",
      "Reversal trigger: move from defense to selective offense only when demand persistence and financing access improve for 30 days.",
    ],
    sections: [
      {
        heading: "The dangerous shortcut: treating runway as a single number",
        paragraphs: [
          "Teams frequently ask for the ‘right’ runway target as though one number works across all operating postures. In practice, runway is a portfolio of timing risks: demand uncertainty, fixed-cost rigidity, and time-to-correct when assumptions break.",
          "In tightening markets, the cost of delayed correction rises. If your organization cannot reverse commitments quickly, a nominal 18-month runway can behave like 12 months because you spend multiple cycles discovering problems you cannot unwind fast enough.",
          "A board-ready runway policy should therefore separate survivability from strategic optionality. Survivability answers whether you can endure downside without emergency financing. Optionality answers whether you can still fund controlled bets while protecting that floor.",
        ],
      },
      {
        heading: "SAFE / RISKY / DANGEROUS runway bands",
        paragraphs: [
          "SAFE band: 20–24 months when financing visibility is uncertain and a meaningful share of costs are hard to reverse. This band gives teams enough time for two or three full correction cycles without crisis behavior.",
          "RISKY band: 15–19 months when demand is mixed and corrections require cross-functional coordination. Teams in this zone can operate, but governance must tighten: monthly burn multiple reviews, explicit kill criteria, and no irreversible expansions.",
          "DANGEROUS band: below 15 months with weak financing optionality or high fixed-cost commitments. This is where strategic freedom collapses and every decision becomes defensive. Boards should require immediate commitment inventory, cash-preservation sequence, and non-core spend freezes.",
          "These bands are directional defaults. Your actual target should shift based on revenue concentration, collection risk, and the organization’s proven ability to reverse decisions quickly.",
        ],
      },
      {
        heading: "Reversal trigger logic for runway posture",
        paragraphs: [
          "Runway posture should change only when signal persistence justifies it. Define three trigger groups: demand reliability, liquidity resilience, and execution confidence. Each group needs threshold values and breach duration rules.",
          "Example tightening trigger: if net retention softens below threshold for two consecutive monthly reads while gross margin compression persists, increase runway target and suspend non-core commitments.",
          "Example easing trigger: if renewal quality and conversion efficiency improve for 30 days, and cash forecast error narrows, release one selective investment tranche while maintaining floor protections.",
          "The mistake to avoid is binary thinking. You do not jump from austerity to expansion. You step through staged commitments and keep reversal plans active until confirmation durability is proven.",
        ],
      },
      {
        heading: "Board-facing summary block (forwardable)",
        paragraphs: [
          "Recommended runway policy: floor of 18 months plus optionality buffer to 24 months while rates remain elevated and financing speed is uncertain.",
          "Decision rights: management can rebalance within approved floor; any action reducing projected runway below floor requires board pre-clearance.",
          "Operating controls: monthly commitment inventory, trigger dashboard review, and tranche-based release for discretionary bets.",
          "Reversal policy: no expansion tranche is permanent until 30-day persistence confirms demand and execution stability.",
        ],
      },
      {
        heading: "Execution checklist for finance and product leaders",
        paragraphs: [
          "First, compute runway under three cases: base, stress, and correction-lag scenario. The correction-lag case should assume slower reversal of payroll and vendor obligations.",
          "Second, tag all major costs by reversibility class and time-to-exit. This becomes the operating map for deciding whether your current runway target is real or optimistic.",
          "Third, align roadmap sequencing with cash confidence. Prioritize initiatives that generate learning and defend core retention before committing to scale-oriented expansions.",
        ],
      },
    ],
    faqs: [
      {
        question: "What runway target should startups use in a recession risk environment?",
        answer:
          "Most venture-backed teams should plan for an 18–24 month window during tightening, then adjust by reversibility speed and financing access quality.",
      },
      {
        question: "Is 12 months of runway enough in a tightening market?",
        answer:
          "Only in low-volatility situations with highly reversible costs and strong financing alternatives. For most teams, 12 months leaves too little correction time.",
      },
      {
        question: "How do boards evaluate runway confidence?",
        answer:
          "Boards should review downside cases, forecast error trends, and reversibility maps rather than relying on headline runway only.",
      },
    ],
    toolLink: { href: "/resources/capital-posture-template", label: "Download the Capital Posture Template" },
  },
  {
    slug: "platform-rewrites-during-capital-tightening-risk-analysis",
    title: "Platform rewrites during capital tightening: risk analysis for leadership teams",
    description:
      "A practical risk analysis for deciding if a platform rewrite is prudent, premature, or dangerous when capital is constrained.",
    keyword: "platform rewrite risk recession",
    cluster: "pain",
    intent: "vp-product",
    format: "guide",
    boardSummary: [
      "Default posture in tightening markets is preserve-core, not rewrite-core, unless reliability or security risk forces change.",
      "Use a SAFE / RISKY / DANGEROUS filter that combines customer impact, reversibility, and cash exposure.",
      "If rewrite proceeds, force tranche gates with measurable migration outcomes and stop-loss criteria.",
      "Reversal trigger: halt expansion scope immediately when migration error rates or delivery latency breach thresholds.",
    ],
    sections: [
      {
        heading: "Why rewrites look attractive when pressure is highest",
        paragraphs: [
          "In constrained markets, teams feel the weight of accumulated technical debt and reach for a full rewrite as a reset button. The narrative is seductive: one major effort solves speed, reliability, and cost all at once.",
          "But rewrites concentrate risk. They shift value delivery into a long lead-time project with uncertain payback while increasing coordination overhead. Under expensive capital, long uncertainty windows are exactly what governance should avoid.",
          "This does not mean rewrites are always wrong. It means rewrite approval must pass a stronger evidence test than feature expansion because reversibility is lower and opportunity cost is higher.",
        ],
      },
      {
        heading: "SAFE / RISKY / DANGEROUS rewrite decisions",
        paragraphs: [
          "SAFE rewrite cases are defensive and bounded: security end-of-life events, compliance blockers, or reliability failures that threaten renewal revenue. These cases justify action when incremental remediation cannot reduce risk fast enough.",
          "RISKY rewrite cases include performance improvements or platform simplification with plausible but unproven payback. Proceed only if you can deliver value in staged migration slices with clear kill criteria.",
          "DANGEROUS rewrite cases are strategy rewrites driven mainly by frustration, aesthetics, or architecture idealism. If customer pain is limited and current system can be stabilized incrementally, a full rewrite usually converts scarce capital into delayed learning.",
          "Codify this framework in decision packets so engineering ambition is judged with the same rigor as go-to-market expansion requests.",
        ],
      },
      {
        heading: "Reversal trigger logic for rewrite governance",
        paragraphs: [
          "A rewrite without stop rules becomes sunk-cost theater. Define trigger thresholds before kickoff: migration defect rates, incident frequency, delivery cycle-time impact, and forecasted burn variance.",
          "Set explicit stop-loss conditions. Example: if defect escape or customer incident severity exceeds agreed thresholds for two consecutive sprints, pause scope expansion and run root-cause review before any additional funding tranche.",
          "Define reversal paths by component. Teams should be able to roll traffic back to legacy pathways within a bounded time window. If rollback is impossible, the project should be classified one risk level higher by default.",
        ],
      },
      {
        heading: "Board-facing summary block (forwardable)",
        paragraphs: [
          "Decision recommendation: approve only bounded, risk-reducing migration slices with pre-defined stop-loss metrics.",
          "Governance controls: quarterly tranche approvals, monthly migration quality reporting, and mandatory rollback readiness evidence.",
          "Capital posture link: rewrite spend is conditional on core retention health and runway floor compliance.",
          "Escalation trigger: threshold breaches in incident severity, burn variance, or migration throughput require immediate board update.",
        ],
      },
      {
        heading: "Alternative path: high-discipline modernization without full rewrite",
        paragraphs: [
          "Many teams can avoid rewrite risk by sequencing modernization around customer-critical bottlenecks. Start with reliability hotspots, dependency isolation, and observability improvements that shorten correction loops.",
          "Use a rolling modernization backlog with strict entry criteria: measurable pain, bounded scope, and reversible deployment plan. This preserves delivery continuity while reducing long-tail platform risk.",
          "If these steps fail to stabilize core outcomes, you have stronger evidence for a targeted rewrite and better governance credibility with your board.",
        ],
      },
    ],
    faqs: [
      {
        question: "Should we do a platform rewrite during a downturn?",
        answer:
          "Only when risks from staying put are higher than rewrite risks and you can prove staged, reversible delivery with stop-loss governance.",
      },
      {
        question: "How can leadership de-risk a platform rewrite?",
        answer:
          "Use tranche funding, component-level rollback plans, and hard escalation thresholds tied to reliability and burn variance.",
      },
      {
        question: "What is a safer alternative to a full rewrite?",
        answer:
          "A disciplined modernization program focused on reliability bottlenecks and reversible architectural decoupling often delivers better risk-adjusted outcomes.",
      },
    ],
    toolLink: { href: "/resources/reversal-trigger-checklist", label: "Run the Reversal Trigger Checklist" },
  },
  {
    slug: "how-venture-capital-cycles-affect-startup-operating-strategy",
    title: "How venture capital cycles affect startup operating strategy",
    description:
      "A leadership operating guide for translating venture cycle shifts into hiring, roadmap, and capital posture decisions.",
    keyword: "venture capital cycles startup strategy",
    cluster: "vc",
    intent: "vc-partner",
    format: "guide",
    boardSummary: [
      "Operating strategy should track financing conditions with a lag-aware posture model, not with narrative sentiment.",
      "Use SAFE / RISKY / DANGEROUS classes across hiring, roadmap, and market bets to keep decision rights consistent.",
      "Cycle tightening requires stronger thresholds, shorter feedback loops, and higher reversibility standards.",
      "Reversal trigger: re-open growth tranches only when demand durability and capital access confirm together over 30 days.",
    ],
    sections: [
      {
        heading: "Cycle shifts are governance events, not branding events",
        paragraphs: [
          "Venture cycles shape more than valuation multiples. They change the real cost of mistakes, the speed of financing options, and the tolerance for long-duration bets. Treating cycle shifts as external noise is a governance error.",
          "When capital is abundant, teams can survive more false positives because financing can absorb correction costs. In tightening cycles, those same false positives become existential because correction windows shrink and replacement capital arrives slower.",
          "Operating strategy must therefore translate market cycle signals into internal commitment policy: what gets funded, at what pace, and with what reversal guarantees.",
        ],
      },
      {
        heading: "SAFE / RISKY / DANGEROUS strategy map by cycle",
        paragraphs: [
          "SAFE in a tightening cycle means investments that protect retention, preserve reliability, and improve decision quality. These moves may look less exciting, but they preserve strategic freedom.",
          "RISKY means expansions with conditional upside where evidence is improving but not yet durable. These require milestone-gated capital release and executive-level monitoring.",
          "DANGEROUS means commitments that assume easy follow-on funding, rapid market recovery, or flawless execution across multiple uncertain dependencies. In a tight cycle, this class should be paused or redesigned.",
          "Publish this map in planning artifacts so each function can align operating choices to the same posture language.",
        ],
      },
      {
        heading: "Reversal trigger logic across planning layers",
        paragraphs: [
          "Cycle-aware strategy needs explicit trigger logic for hiring, roadmap, and go-to-market spend. Each layer should define what confirms expansion and what forces contraction.",
          "For example, roadmap expansion may require retention stability plus on-time delivery confidence. Hiring expansion may require runway floor compliance plus pipeline quality persistence. Marketing expansion may require payback improvements with forecast error constraints.",
          "Review these triggers weekly, but change posture only after 30-day persistence unless emergency thresholds are breached. This balances responsiveness with resistance to noise.",
        ],
      },
      {
        heading: "Board-facing summary block (forwardable)",
        paragraphs: [
          "Current cycle translation: maintain disciplined posture with selective offense in proven channels only.",
          "Control model: all non-core expansions move to tranche funding; irreversible commitments require board-level evidence packet.",
          "Monitoring cadence: weekly trigger dashboard and monthly confirmation review; quarterly board reset on cycle assumptions.",
          "Risk management: preserve runway floor and rollback capability before pursuing speed gains.",
        ],
      },
      {
        heading: "Practical operating moves for the next quarter",
        paragraphs: [
          "Run a commitment audit across teams and label each initiative by reversibility and dependency complexity. Remove low-evidence work first, not merely low-visibility work.",
          "Align compensation and planning incentives to correction quality, not just launch volume. Teams should be rewarded for disciplined stops as much as for wins.",
          "Use one canonical board memo format each month so cycle interpretation, posture changes, and trigger outcomes are easy to compare over time.",
        ],
      },
    ],
    faqs: [
      {
        question: "How do venture capital cycles change startup strategy?",
        answer:
          "They change commitment risk tolerance. Tight cycles require stronger thresholds, more reversible sequencing, and less dependence on future fundraising assumptions.",
      },
      {
        question: "What should founders prioritize when capital tightens?",
        answer:
          "Protect retention, protect reliability, and preserve runway while gating expansion bets behind measurable confirmation triggers.",
      },
      {
        question: "How often should we revisit operating posture during cycle shifts?",
        answer:
          "Review signals weekly, but make posture changes on monthly confirmation unless emergency thresholds require immediate action.",
      },
    ],
    toolLink: {
      href: "/resources/quarterly-capital-posture-memo-example",
      label: "Copy the Quarterly Capital Posture Memo Example",
    },
  },
  {
    slug: "vc-portfolio-governance-case-example-burn-multiple-normalization",
    title: "VC portfolio governance case example: burn-multiple normalization playbook",
    description:
      "Case example for VC and operating partners: standardize portfolio governance when burn multiple variance and board packet quality drift across companies.",
    keyword: "vc portfolio governance case example",
    cluster: "vc",
    intent: "vc-partner",
    format: "case-example",
    boardSummary: [
      "Case setup: five portfolio companies ran inconsistent threshold definitions, creating late board escalations and noisy capital asks.",
      "Intervention: introduce one portfolio operating rubric with shared SAFE / RISKY / DANGEROUS classes, monthly checkpoint language, and reversal triggers.",
      "Result pattern: board packets became comparable in six weeks, and unnecessary tranche requests dropped as teams corrected earlier.",
      "Forward action: keep shared rubric fixed for two quarters, then recalibrate thresholds only with cross-portfolio evidence.",
    ],
    sections: [
      {
        heading: "Case baseline: governance drift hides risk concentration",
        paragraphs: [
          "A growth-stage VC platform observed that company-level dashboards looked healthy while board confidence kept falling. The issue was governance drift: every company used different threshold words for similar risk patterns. Some flagged concern after one weak month; others waited until covenant pressure appeared.",
          "Without a common posture standard, partners could not compare commitment quality across the portfolio. Capital decisions became narrative-driven and escalation timing became inconsistent. The practical risk was delayed correction, not simply reporting noise.",
          "The portfolio team reframed the problem as taxonomy standardization: one definition set for reversibility classes, one escalation clock, and one board-forwardable summary block template per company.",
        ],
      },
      {
        heading: "Intervention model: 45-day portfolio standardization sprint",
        paragraphs: [
          "Week 1 established a portfolio governance charter with non-negotiable definitions for SAFE / RISKY / DANGEROUS commitments. Week 2 required each company to map active bets to that taxonomy, including rollback windows and owner authority.",
          "Weeks 3 and 4 introduced one board artifact format: posture state, breach indicators, actions taken, and reversibility readiness. Companies could keep local metrics, but summary language and escalation formatting stayed fixed.",
          "By week 6, portfolio reviews shifted from debating terms to comparing operating quality. This raised intervention speed without adding more meetings.",
        ],
      },
      {
        heading: "Board-forwardable artifact language",
        paragraphs: [
          "Portfolio posture update: commitment quality variance is narrowing as all companies now report under one threshold taxonomy and one reversal standard.",
          "Governance control: any metric breach persisting for two checkpoints requires a board addendum with action owner and rollback timeline.",
          "Capital discipline effect: tranche approvals now depend on comparable evidence packets rather than narrative confidence.",
          "Next review ask: maintain the standard for one additional quarter to verify persistence before any taxonomy changes.",
        ],
      },
    ],
    faqs: [
      {
        question: "Why do VC portfolios need a shared governance taxonomy?",
        answer:
          "It makes board packets comparable, speeds escalation timing, and reduces avoidable capital allocation errors caused by inconsistent language.",
      },
      {
        question: "How quickly can portfolio governance standardization show impact?",
        answer:
          "Most firms can see cleaner board packet comparability and faster intervention decisions within one to two operating cycles.",
      },
    ],
    toolLink: { href: "/resources/capital-posture-template", label: "Use the Capital Posture Template" },
  },
  {
    slug: "operator-posture-standardization-case-example-product-finance",
    title: "Operator case example: product-finance posture standardization under board pressure",
    description:
      "Case example for CFO and VP Product leaders aligning roadmap, hiring, and board messaging to one capital posture standard.",
    keyword: "operator posture standardization case example",
    cluster: "vc",
    intent: "vp-product",
    format: "case-example",
    boardSummary: [
      "Case setup: product and finance teams used conflicting confidence criteria, creating approval latency and exception creep.",
      "Intervention: one shared posture memo, one exception log, and explicit reversibility language attached to every roadmap commitment.",
      "Result pattern: approval cycle-time dropped and board discussions shifted from metric disputes to sequencing decisions.",
      "Forward action: monthly posture drills and a strict 30-day confirmation rule before expanding irreversible commitments.",
    ],
    sections: [
      {
        heading: "Case baseline: conflicting evidence standards slowed execution",
        paragraphs: [
          "A portfolio company entered a tightening cycle with solid demand but weak governance consistency. Product teams argued from delivery momentum while finance teams argued from cash exposure. Both were right locally, but they lacked one shared decision system.",
          "Board meetings consumed time reconciling definitions rather than selecting actions. Exception approvals increased because each function used different proof thresholds for the same type of commitment.",
          "Leadership diagnosed the issue as posture fragmentation and moved to a single governance artifact for every material decision.",
        ],
      },
      {
        heading: "Implementation model: shared memo + exception log + reversal language",
        paragraphs: [
          "The team adopted a monthly posture memo with fixed sections: regime read, commitment class, confidence score, reversal path, and escalation trigger. No decision entered planning review without all five fields completed.",
          "A shared exception log replaced ad hoc approvals. Each exception needed an expiry date, owner, and board-forwardable rationale. This reduced policy drift while preserving flexibility for true edge cases.",
          "Within two cycles, product and finance teams reported fewer rework loops because the approval grammar became predictable across functions.",
        ],
      },
      {
        heading: "Board-forwardable artifact language",
        paragraphs: [
          "Current posture: standardized governance language is now applied across roadmap, hiring, and vendor commitments.",
          "Control status: exceptions remain permitted but are time-bounded, owner-assigned, and auditable against reversal readiness.",
          "Operating impact: decision latency has declined while escalation quality improved due to common evidence definitions.",
          "Board ask: continue monthly confirmation cadence and require rollback drills for all new irreversible commitments.",
        ],
      },
    ],
    faqs: [
      {
        question: "What does posture standardization change for operators?",
        answer:
          "It aligns product, finance, and board decision language so approvals move faster and reversibility controls remain consistent.",
      },
      {
        question: "How do we avoid exception creep after standardization?",
        answer:
          "Require a central exception log with expiry dates, owners, and mandatory board-ready rationale for every exception.",
      },
    ],
    toolLink: {
      href: "/resources/quarterly-capital-posture-memo-example",
      label: "Copy the Quarterly Capital Posture Memo Example",
    },
  },
];

export const findResourceArticleBySlug = (slug: string) => resourceArticles.find((article) => article.slug === slug);

export const generateStaticParams = () => resourceArticles.map((article) => ({ slug: article.slug }));
