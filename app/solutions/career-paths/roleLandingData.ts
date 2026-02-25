export type RoleLanding = {
  slug: string;
  roleTitle: string;
  hero: string;
  summary: string;
  outcomes: readonly string[];
  proofPoints: readonly string[];
};

export const roleLandings: readonly RoleLanding[] = [
  {
    slug: "senior-product-manager",
    roleTitle: "Senior Product Manager",
    hero: "Lead sharper prioritization under changing market conditions.",
    summary:
      "Use Whether to connect macro signals to day-to-day roadmap sequencing so your trade-offs hold up in cross-functional planning.",
    outcomes: [
      "Prioritize customer-critical work with explicit risk posture.",
      "Explain roadmap trade-offs in language finance and engineering trust.",
      "Show weekly decision quality with evidence-backed updates.",
    ],
    proofPoints: [
      "Weekly climate read is reflected in sprint and release priorities.",
      "Decision rationale references signal confidence and downside conditions.",
      "Leadership receives concise briefing exports instead of ad-hoc status slides.",
    ],
  },
  {
    slug: "group-product-manager",
    roleTitle: "Group Product Manager / Lead PM",
    hero: "Balance multiple teams and bets with a coherent risk posture.",
    summary:
      "Coordinate portfolios across pods by translating market regime shifts into shared guardrails for sequencing, scope, and confidence thresholds.",
    outcomes: [
      "Create aligned portfolio pacing across teams, not isolated feature plans.",
      "Reduce strategic drift by tying initiatives to the same climate assumptions.",
      "Improve escalation quality when trade-offs need executive input.",
    ],
    proofPoints: [
      "Portfolio reviews include regime-aware keep, pause, and accelerate decisions.",
      "Assumption locks are visible across related initiatives.",
      "Scenario previews are used before major commitment points.",
    ],
  },
  {
    slug: "director-of-product",
    roleTitle: "Director of Product",
    hero: "Set market-aware planning cadence and investment pacing.",
    summary:
      "Operationalize macro context at the org level so roadmap shape, hiring posture, and operating rhythm move together with external reality.",
    outcomes: [
      "Set quarter-level planning constraints teams can execute against.",
      "Protect capital efficiency without losing strategic momentum.",
      "Improve executive confidence through transparent decision frameworks.",
    ],
    proofPoints: [
      "Quarterly planning starts with regime and confidence assumptions.",
      "Cross-functional investment decisions show clear trigger conditions.",
      "Operating updates map actions to market signals and timestamps.",
    ],
  },
  {
    slug: "vp-product",
    roleTitle: "Head of Product / VP Product",
    hero: "Align product narrative with CEO, board, and finance expectations.",
    summary:
      "Turn noisy macro context into clear strategic posture so leadership conversations focus on conviction, risk, and capital discipline.",
    outcomes: [
      "Present strategy updates with external-signal grounding.",
      "Improve board-level confidence in planning assumptions.",
      "Create consistent language between product, finance, and strategy.",
    ],
    proofPoints: [
      "Board and exec packets include climate posture and scenario framing.",
      "Resource shifts are tied to explicit trigger conditions.",
      "Portfolio narrative stays coherent through market volatility.",
    ],
  },
  {
    slug: "product-strategy-chief-of-staff",
    roleTitle: "Product Strategy / Chief of Staff",
    hero: "Translate external signals into company-level planning guidance.",
    summary:
      "Use Whether to synthesize evidence and convert macro shifts into decision-ready recommendations for leadership planning cycles.",
    outcomes: [
      "Strengthen strategic planning memos with source-backed context.",
      "Drive scenario preparation before high-stakes commitments.",
      "Increase leadership alignment on risk and timing assumptions.",
    ],
    proofPoints: [
      "Planning briefs include clear source metadata and freshness cues.",
      "Leadership reviews compare base, downside, and adjacent scenarios.",
      "Recommendations map directly to operating posture changes.",
    ],
  },
] as const;

export const roleLandingBySlug = new Map(roleLandings.map((item) => [item.slug, item] as const));
