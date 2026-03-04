export type SeniorityBand = "Senior" | "Lead" | "Director+" | "Strategy";
export type ScopeType = "Single-team" | "Multi-team" | "Org-wide" | "Company-wide";

export type RoleLanding = {
  slug: string;
  roleTitle: string;
  hero: string;
  summary: string;
  outcomes: readonly string[];
  proofPoints: readonly string[];
  seniorityBand: SeniorityBand;
  scopeType: ScopeType;
  plan30_60_90: {
    days30: readonly string[];
    days60: readonly string[];
    days90: readonly string[];
  };
  promotionPacketTemplate: readonly string[];
};

export const roleLandings: readonly RoleLanding[] = [
  {
    slug: "senior-product-manager",
    roleTitle: "Senior Product Manager",
    hero: "Lead sharper prioritization under changing market conditions.",
    summary:
      "Use Whether to connect macro signals to day-to-day roadmap sequencing so your trade-offs hold up in cross-functional planning.",
    seniorityBand: "Senior",
    scopeType: "Single-team",
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
    plan30_60_90: {
      days30: [
        "Audit current roadmap commitments against climate posture.",
        "Document 2-3 keep/pause candidate calls with rationale.",
      ],
      days60: [
        "Run one full planning cycle using confidence-based assumptions.",
        "Align engineering/design leads on trigger conditions.",
      ],
      days90: [
        "Publish a repeatable monthly trade-off memo.",
        "Show measurable reduction in roadmap churn from unclear bets.",
      ],
    },
    promotionPacketTemplate: [
      "Decision quality: high-stakes call, confidence level, and trade-off chosen.",
      "Risk framing: downside scenario, mitigation, and trigger thresholds.",
      "Impact narrative: customer and business outcome linked to decision path.",
    ],
  },
  {
    slug: "group-product-manager",
    roleTitle: "Group Product Manager / Lead PM",
    hero: "Balance multiple teams and bets with a coherent risk posture.",
    summary:
      "Coordinate portfolios across pods by translating market regime shifts into shared guardrails for sequencing, scope, and confidence thresholds.",
    seniorityBand: "Lead",
    scopeType: "Multi-team",
    outcomes: [
      "Create aligned portfolio pacing across teams, not isolated feature plans.",
      "Reduce strategic drift by tying initiatives to the same posture assumptions.",
      "Improve escalation quality when trade-offs need executive input.",
    ],
    proofPoints: [
      "Portfolio reviews include regime-aware keep, pause, and accelerate decisions.",
      "Assumption locks are visible across related initiatives.",
      "Scenario previews are used before major commitment points.",
    ],
    plan30_60_90: {
      days30: [
        "Baseline all team plans against one shared macro posture.",
        "Identify conflicting assumptions across squads.",
      ],
      days60: [
        "Introduce portfolio-level trigger reviews in planning cadence.",
        "Standardize trade-off narratives for leadership escalations.",
      ],
      days90: [
        "Publish a consolidated portfolio operating memo each cycle.",
        "Demonstrate fewer cross-team priority conflicts.",
      ],
    },
    promotionPacketTemplate: [
      "Decision quality: portfolio-level keep/pause/accelerate calls.",
      "Risk framing: interdependency map and downside containment strategy.",
      "Impact narrative: improved cross-team coherence and delivery reliability.",
    ],
  },
  {
    slug: "director-of-product",
    roleTitle: "Director of Product",
    hero: "Set market-aware planning cadence and investment pacing.",
    summary:
      "Operationalize macro context at the org level so roadmap shape, hiring posture, and operating rhythm move together with external reality.",
    seniorityBand: "Director+",
    scopeType: "Org-wide",
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
    plan30_60_90: {
      days30: [
        "Define explicit investment guardrails for each regime posture.",
        "Audit current quarter plan for assumption drift.",
      ],
      days60: [
        "Run a leadership review with base/downside scenario coverage.",
        "Align finance and engineering leaders on decision triggers.",
      ],
      days90: [
        "Institutionalize a regime-first planning ritual for QBRs.",
        "Track decision durability metrics across planning cycles.",
      ],
    },
    promotionPacketTemplate: [
      "Decision quality: org-level investment and sequencing calls.",
      "Risk framing: scenario spread and reallocation triggers.",
      "Impact narrative: stronger planning discipline and executive trust.",
    ],
  },
  {
    slug: "vp-product",
    roleTitle: "Head of Product / VP Product",
    hero: "Align product narrative with CEO, board, and finance expectations.",
    summary:
      "Turn noisy macro context into clear strategic posture so leadership conversations focus on conviction, risk, and capital discipline.",
    seniorityBand: "Director+",
    scopeType: "Company-wide",
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
    plan30_60_90: {
      days30: [
        "Align leadership team on one market narrative and posture.",
        "Identify top strategic bets requiring explicit confidence framing.",
      ],
      days60: [
        "Shift board materials to scenario-based decision framing.",
        "Establish trigger-led governance for resource moves.",
      ],
      days90: [
        "Demonstrate tighter strategy-to-execution coherence.",
        "Show improved board confidence on decision rationale quality.",
      ],
    },
    promotionPacketTemplate: [
      "Decision quality: strategic posture and portfolio reallocation calls.",
      "Risk framing: board-ready downside cases and contingency plans.",
      "Impact narrative: clearer narrative coherence across leadership forums.",
    ],
  },
  {
    slug: "product-strategy-chief-of-staff",
    roleTitle: "Product Strategy / Chief of Staff",
    hero: "Translate external signals into company-level planning guidance.",
    summary:
      "Use Whether to synthesize evidence and convert macro shifts into decision-ready recommendations for leadership planning cycles.",
    seniorityBand: "Strategy",
    scopeType: "Company-wide",
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
    plan30_60_90: {
      days30: [
        "Build a standard executive brief format with confidence and source fields.",
        "Map current strategic decisions to required evidence inputs.",
      ],
      days60: [
        "Pilot recurring scenario review sessions with leadership.",
        "Integrate weekly signal deltas into planning memo updates.",
      ],
      days90: [
        "Establish a durable planning brief cadence with clear ownership.",
        "Track decision lead-time improvements tied to briefing quality.",
      ],
    },
    promotionPacketTemplate: [
      "Decision quality: strategic recommendation and alternatives considered.",
      "Risk framing: signal quality, assumptions, and scenario consequences.",
      "Impact narrative: leadership alignment and planning speed improvements.",
    ],
  },
] as const;

export const roleLandingBySlug = new Map(roleLandings.map((item) => [item.slug, item] as const));
