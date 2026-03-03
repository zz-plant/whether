import type { Route } from "next";

export type ResourceArticle = {
  slug:
    | "should-we-freeze-hiring-high-interest-rate-environment"
    | "how-much-runway-do-we-need-tightening-market"
    | "platform-rewrites-during-capital-tightening-risk-analysis"
    | "how-venture-capital-cycles-affect-startup-operating-strategy";
  title: string;
  description: string;
  keyword: string;
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
          "Teams frequently ask for the ‘right’ runway target as though one number works across all operating climates. In practice, runway is a portfolio of timing risks: demand uncertainty, fixed-cost rigidity, and time-to-correct when assumptions break.",
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
];

export const findResourceArticleBySlug = (slug: string) => resourceArticles.find((article) => article.slug === slug);
