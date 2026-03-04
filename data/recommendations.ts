/**
 * Insight Database for Regime Station.
 * Translates macro signals into plain-English product and engineering constraints.
 */
export const insightDatabase = {
  fossilRecord: {
    title: "The Fossil Record",
    subtitle: "Architecture & UX as economic indicators",
    description:
      "Signals embedded in your product and org structure that reveal which capital climate you were built for.",
    columns: {
      domain: "Domain",
      lowRateArtifact: "Low-Rate Artifact (ZIRP Era)",
      highRateArtifact: "High-Rate Artifact (Tight Era)",
      insight: "Economic insight",
    },
    rows: [
      {
        domain: "Infrastructure",
        lowRateArtifact: "Microservices sprawl and heavy coordination",
        highRateArtifact: "Consolidated monoliths and fewer moving parts",
        insight:
          "Coordination tax is a headcount tax. Cheap money pays for it; expensive money forces simplification.",
      },
      {
        domain: "Support",
        lowRateArtifact: "Live chat, phone support, and concierge workflows",
        highRateArtifact: "Self-serve help centers and AI deflection",
        insight:
          "In growth climates, users are assets to retain. In tight climates, support is a cost to control.",
      },
      {
        domain: "Data",
        lowRateArtifact: "Store everything, keep logs forever",
        highRateArtifact: "Retention policies with hard delete windows",
        insight:
          "Data is only an asset when you can afford to mine it. Otherwise it is a storage bill.",
      },
      {
        domain: "Pricing",
        lowRateArtifact: "Free tiers optimized for reach",
        highRateArtifact: "Reverse trials that convert to paid quickly",
        insight:
          "Free users are marketing spend. Tight capital means you cut marketing and protect cash flow.",
      },
      {
        domain: "Org chart",
        lowRateArtifact: "Thick middle management layers",
        highRateArtifact: "Player-coaches with wider spans",
        insight:
          "Management layers help retain talent in a tight labor market. In slack markets, output beats retention.",
      },
      {
        domain: "Roadmap",
        lowRateArtifact: "Moonshots and optionality bets",
        highRateArtifact: "Table-stakes parity investments",
        insight:
          "Optionality is a luxury good. You buy lottery tickets only when cash is plentiful.",
      },
    ],
  },
  regimePlaybooks: {
    title: "Market Climate Playbooks",
    subtitle: "Operational heuristics by climate",
    regimes: [
      {
        key: "SCARCITY",
        title: "Scarcity",
        tone: "High rates + risk off",
        mandate: "Don't die.",
        insight:
          "Time is your binding constraint. Survival is about shortening every payback window.",
        leadershipPhrases: {
          more: [
            "We need payback in 90 days or less.",
            "Runway is the priority; cash beats optionality.",
            "Fund what earns, pause what doesn't.",
          ],
          less: [
            "We'll figure out monetization later.",
            "Scale now, optimize later.",
            "Let's add headcount to get ahead.",
          ],
        },
        stop: [
          "Hiring ahead of revenue",
          "Brand-only marketing",
          "Platform rewrites or migrations",
        ],
        start: [
          "Founder-led sales and customer recovery",
          "Annual prepay discounts for immediate cash",
          "Manual onboarding that avoids new build costs",
        ],
        metric: "Cash conversion cycle (how fast $1 spent becomes $1 earned)",
      },
      {
        key: "DEFENSIVE",
        title: "Defensive",
        tone: "High rates + moderate risk",
        mandate: "Efficiency first.",
        insight:
          "Growth is expensive, so extract more value from the customers you already have.",
        leadershipPhrases: {
          more: [
            "Protect margin and retention before chasing new logos.",
            "Every hire must be accretive to unit economics.",
            "Win rate and expansion matter more than top-line noise.",
          ],
          less: [
            "Let's open three new markets at once.",
            "Big R&D bets without a near-term customer.",
            "Growth at any price.",
          ],
        },
        stop: [
          "New market expansion",
          "Low-margin tiers",
          "Speculative R&D",
        ],
        start: [
          "Pricing optimization and packaging cleanup",
          "Churn reduction programs",
          "Vendor consolidation",
        ],
        metric: "Gross margin and net dollar retention",
      },
      {
        key: "VOLATILE",
        title: "Volatile",
        tone: "Low rates + risk off",
        mandate: "Safety first.",
        insight:
          "Capital is cheap, but customers are anxious. They buy insurance, not experimentation.",
        leadershipPhrases: {
          more: [
            "Trust and reliability beat novelty.",
            "De-risk the roadmap; protect the core.",
            "Make the safe choice easy for buyers.",
          ],
          less: [
            "Let's rebrand right now.",
            "Ship the bold new UI overhaul.",
            "Complex pricing experiments in the funnel.",
          ],
        },
        stop: [
          "Rebrands or identity pivots",
          "Complex pricing experiments",
          "Radical UI changes",
        ],
        start: [
          "Security features and compliance (SOC 2)",
          "Reliability SLAs",
          "Trust signals in every funnel step",
        ],
        metric: "Win rate (how often deals die as 'no decision')",
      },
      {
        key: "EXPANSION",
        title: "Expansion",
        tone: "Low rates + risk on",
        mandate: "Land grab.",
        insight:
          "The market rewards speed over accuracy. Some waste is the price of momentum.",
        leadershipPhrases: {
          more: [
            "Move fast and capture share.",
            "Invest ahead of demand; speed beats perfection.",
            "Momentum is the strategy.",
          ],
          less: [
            "Wait for certainty before we hire.",
            "Optimize every cost before we grow.",
            "Hold the roadmap until the data is perfect.",
          ],
        },
        stop: [
          "Over-engineering before demand proves out",
          "Cost cuts that choke product velocity",
          "Cautious hiring cycles that miss timing windows",
        ],
        start: [
          "Compounding referral loops and share mechanics",
          "Friction-light freemium paths or extended trials",
          "Fast, bounded product bets in adjacent wedges",
          "Measured geo expansion where demand signal is clear",
        ],
        metric: "Week-over-week growth and market share",
      },
    ],
  },
  regimeEvidence: {
    title: "Market Climate Evidence",
    subtitle: "Signal-backed rationale with traceable sources",
    regimes: [
      {
        key: "SCARCITY",
        summary:
          "High base rates plus an inverted curve compress access to capital and raise hurdle rates.",
        citations: [
          {
            title: "Daily Treasury Yield Curve Rates",
            source: "US Treasury Fiscal Data",
            url: "https://fiscaldata.treasury.gov/api-documentation/",
            date: "2024-09-30",
            climate: "SCARCITY",
            signal: "Base rate",
            tags: ["treasury", "yield curve", "base rate", "cash tightness"],
            recommendation: {
              label: "Decision shield: hiring approvals",
              href: "/operations#decision-shield",
            },
          },
          {
            title: "10-Year vs. 2-Year Treasury Spread",
            source: "FRED",
            url: "https://fred.stlouisfed.org/series/T10Y2Y",
            date: "2024-09-30",
            climate: "SCARCITY",
            signal: "Curve slope",
            tags: ["curve inversion", "risk appetite", "recession risk"],
            recommendation: {
              label: "Leadership summary: tighten roadmap bets",
              href: "/#executive-snapshot",
            },
          },
        ],
      },
      {
        key: "DEFENSIVE",
        summary:
          "Rates remain elevated, but the curve stabilizes—capital exists, yet demands efficiency.",
        citations: [
          {
            title: "Daily Treasury Yield Curve Rates",
            source: "US Treasury Fiscal Data",
            url: "https://fiscaldata.treasury.gov/api-documentation/",
            date: "2024-09-23",
            climate: "DEFENSIVE",
            signal: "Base rate",
            tags: ["treasury", "base rate", "cost of capital"],
            recommendation: {
              label: "Decision shield: pricing posture",
              href: "/operations#decision-shield",
            },
          },
          {
            title: "Treasury Yield Curve Methodology",
            source: "US Treasury",
            url: "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView",
            date: "2024-09-23",
            climate: "DEFENSIVE",
            signal: "Curve slope",
            tags: ["yield curve", "methodology", "risk appetite"],
            recommendation: {
              label: "Playbook: efficiency guardrails",
              href: "/operations#playbook",
            },
          },
        ],
      },
      {
        key: "VOLATILE",
        summary:
          "Rates ease, but the curve stays flat or inverted, signaling risk-off behavior despite liquidity.",
        citations: [
          {
            title: "10-Year vs. 2-Year Treasury Spread",
            source: "FRED",
            url: "https://fred.stlouisfed.org/series/T10Y2Y",
            date: "2024-09-16",
            climate: "VOLATILE",
            signal: "Curve slope",
            tags: ["curve slope", "risk appetite", "buyer caution"],
            recommendation: {
              label: "Decision shield: roadmap bets",
              href: "/operations#decision-shield",
            },
          },
          {
            title: "Daily Treasury Yield Curve Rates",
            source: "US Treasury Fiscal Data",
            url: "https://fiscaldata.treasury.gov/api-documentation/",
            date: "2024-09-16",
            climate: "VOLATILE",
            signal: "Base rate",
            tags: ["treasury", "base rate", "liquidity"],
            recommendation: {
              label: "Weekly action summary",
              href: "/#weekly-action-summary",
            },
          },
        ],
      },
      {
        key: "EXPANSION",
        summary:
          "Lower base rates with a positive curve signal risk-on funding conditions and faster cycles.",
        citations: [
          {
            title: "Daily Treasury Yield Curve Rates",
            source: "US Treasury Fiscal Data",
            url: "https://fiscaldata.treasury.gov/api-documentation/",
            date: "2024-09-09",
            climate: "EXPANSION",
            signal: "Base rate",
            tags: ["treasury", "base rate", "expansion"],
            recommendation: {
              label: "Playbook: growth stance",
              href: "/operations#playbook",
            },
          },
          {
            title: "10-Year vs. 2-Year Treasury Spread",
            source: "FRED",
            url: "https://fred.stlouisfed.org/series/T10Y2Y",
            date: "2024-09-09",
            climate: "EXPANSION",
            signal: "Curve slope",
            tags: ["curve slope", "risk on", "funding"],
            recommendation: {
              label: "Decision shield: growth bets",
              href: "/operations#decision-shield",
            },
          },
        ],
      },
    ],
  },
  decisionShield: {
    title: "Decision Shield",
    subtitle: "Operational constraints by weather",
    columns: {
      requestType: "Request type",
      tight: "If weather is tight",
      loose: "If weather is loose",
    },
    rows: [
      {
        requestType: "Can we hire?",
        tight:
          "No, unless the role pays for itself within 90 days through direct revenue.",
        loose: "Yes. Hire ahead of the curve to capture capacity.",
      },
      {
        requestType: "Can we rewrite?",
        tight: "No. Maintenance only. Do not stop the factory.",
        loose:
          "Yes, if it buys at least two years of increased shipping velocity.",
      },
      {
        requestType: "Can we launch X?",
        tight:
          "Maybe, only if it reduces churn or meaningfully upsells current users.",
        loose: "Yes. Try it—failure is cheap learning.",
      },
      {
        requestType: "Can we discount?",
        tight: "Yes, but only in exchange for annual upfront cash.",
        loose: "No. Optimize for user count and adoption, not cash collection.",
      },
    ],
  },
  financeStrategyMode: {
    title: "Finance Strategy Mode",
    subtitle: "Runway posture guidance without internal financial inputs",
    description:
      "Public macro data sets the default capital posture. These guardrails define how conservative to be without needing internal finance models.",
    regimes: [
      {
        key: "SCARCITY",
        runwayPosture: "Target 24+ months of runway; freeze non-essential spend.",
        hiringThrottle: "Only roles with <90-day payback or critical retention impact.",
        budgetFocus: ["Cash conversion wins", "Vendor consolidation", "Runway extensions"],
        watchSignals: [
          "Curve inversion deepening",
          "Base rates holding above neutral range",
          "Credit spreads widening",
        ],
      },
      {
        key: "DEFENSIVE",
        runwayPosture: "Hold 18–24 months of runway; keep optionality limited.",
        hiringThrottle: "Add capacity only for high-ROI customer expansion.",
        budgetFocus: ["Gross margin lift", "Retention defenses", "Pricing cleanup"],
        watchSignals: ["Curve stabilizing", "Base rate plateau", "Inflation cooling"],
      },
      {
        key: "VOLATILE",
        runwayPosture: "Maintain 18 months runway with liquidity buffers.",
        hiringThrottle: "Favor customer trust and reliability roles over growth bets.",
        budgetFocus: ["Risk controls", "Security/compliance", "Resilience spending"],
        watchSignals: ["Risk appetite suppressed", "Flat curve", "Demand hesitancy"],
      },
      {
        key: "EXPANSION",
        runwayPosture: "12–18 months runway acceptable with growth safeguards.",
        hiringThrottle: "Hire ahead of demand in revenue and product acceleration roles.",
        budgetFocus: ["Market capture", "Sales capacity", "Product expansion bets"],
        watchSignals: ["Curve steepening", "Base rates easing", "Risk-on funding"],
      },
    ],
  },
  strategyBriefing: {
    title: "Strategy Brief Generator",
    subtitle: "Macro-only executive narrative ready for leadership updates",
    regimes: [
      {
        key: "SCARCITY",
        headline: "Survival posture: protect cash and shorten payback windows.",
        narrative:
          "Capital is expensive and risk appetite is muted. Default to reversible moves and immediate cash conversion.",
        priorities: ["Protect runway", "Monetize existing demand", "Cut optionality bets"],
        watchlist: ["Cash conversion cycle", "Down-round signals", "Churn spike risk"],
        reversalTriggers: ["Curve re-steepens", "Base rates fall below tightness band"],
      },
      {
        key: "DEFENSIVE",
        headline: "Efficiency posture: defend margins and deepen customer value.",
        narrative:
          "Funding is available but selective. This is a margin-defense environment where efficiency wins.",
        priorities: ["Retention programs", "Packaging improvements", "Operational leverage"],
        watchlist: ["Net dollar retention", "Gross margin drift", "Cycle time creep"],
        reversalTriggers: ["Sustained curve steepening", "Risk appetite climbs"],
      },
      {
        key: "VOLATILE",
        headline: "Safety posture: prioritize trust, reliability, and proof.",
        narrative:
          "Liquidity exists but confidence is shaky. Buyers demand safety signals and reliable delivery.",
        priorities: ["Trust & compliance", "Reliability SLAs", "Customer risk reduction"],
        watchlist: ["Pipeline stalls", "Security incidents", "Procurement delays"],
        reversalTriggers: ["Risk appetite rebound", "Bravery signal crosses threshold"],
      },
      {
        key: "EXPANSION",
        headline: "Growth posture: move fast, capture share, and accept controlled waste.",
        narrative:
          "Risk appetite is elevated. The opportunity cost of moving slowly is higher than modest inefficiency.",
        priorities: ["Speed to market", "Distribution loops", "New product wedges"],
        watchlist: ["Demand spike", "Capacity strain", "Competitive blitz moves"],
        reversalTriggers: ["Curve flattens", "Base rates trend upward"],
      },
    ],
  },
  executiveBriefingSuite: {
    title: "Executive Briefing Suite",
    subtitle: "Board-ready posture summary and guardrails from public signals",
    regimes: [
      {
        key: "SCARCITY",
        executiveSummary: "Runway preservation and payback discipline are non-negotiable.",
        decisionGuardrails: [
          "Pause non-core initiatives without near-term revenue impact.",
          "Demand <90-day payback on discretionary spend.",
          "Concentrate on retention and cash recovery.",
        ],
        decisionTemplates: [
          "Hiring: approve only revenue-protecting roles.",
          "Pricing: exchange discounts for upfront cash.",
          "Roadmap: ship stability and monetization only.",
        ],
        reversalTriggers: ["Curve exits inversion", "Policy easing signals stabilize"],
      },
      {
        key: "DEFENSIVE",
        executiveSummary: "Efficiency and margin protection lead; growth must prove ROI.",
        decisionGuardrails: [
          "Tie new spend to margin lift or churn reduction.",
          "Limit expansion to proven channels.",
          "Keep cadence stable; avoid whiplash pivots.",
        ],
        decisionTemplates: [
          "Hiring: accretive revenue roles only.",
          "Pricing: optimize packaging before adding discounts.",
          "Roadmap: prioritize retention and upsell.",
        ],
        reversalTriggers: ["Risk appetite rises", "Base rates begin sustained decline"],
      },
      {
        key: "VOLATILE",
        executiveSummary: "Buyer anxiety is high—lead with trust and stability.",
        decisionGuardrails: [
          "Bias toward reliability and compliance improvements.",
          "Delay disruptive changes that increase perceived risk.",
          "Invest in proof points and customer reassurance.",
        ],
        decisionTemplates: [
          "Hiring: prioritize trust and reliability roles.",
          "Pricing: keep models simple and predictable.",
          "Roadmap: emphasize safety features.",
        ],
        reversalTriggers: ["Risk appetite improves", "Curve steepens positively"],
      },
      {
        key: "EXPANSION",
        executiveSummary: "Speed and share capture outperform over-optimization.",
        decisionGuardrails: [
          "Fund growth bets with clear distribution upside.",
          "Accept measured inefficiency to gain momentum.",
          "Invest in scaling teams before bottlenecks hit.",
        ],
        decisionTemplates: [
          "Hiring: add growth capacity ahead of demand.",
          "Pricing: prioritize adoption and market penetration.",
          "Roadmap: accelerate new product lines.",
        ],
        reversalTriggers: ["Risk appetite drops", "Rates move into tight band"],
      },
    ],
  },
  decisionShieldTemplates: {
    title: "Decision Shield Templates",
    subtitle: "Default public-data stances by regime",
    decisions: [
      {
        title: "Hiring",
        stances: {
          SCARCITY: "Freeze unless role pays for itself in <90 days.",
          DEFENSIVE: "Approve only high-ROI, margin-supporting roles.",
          VOLATILE: "Bias toward trust, reliability, and customer safety roles.",
          EXPANSION: "Hire ahead of demand in growth and revenue capacity.",
        },
      },
      {
        title: "Pricing",
        stances: {
          SCARCITY: "Trade discounts for upfront cash and shorter payback.",
          DEFENSIVE: "Optimize packaging before discounting.",
          VOLATILE: "Keep pricing simple; avoid complex experiments.",
          EXPANSION: "Prioritize adoption; use generous trials.",
        },
      },
      {
        title: "Roadmap",
        stances: {
          SCARCITY: "Ship monetization and retention only.",
          DEFENSIVE: "Prioritize margin and churn reduction.",
          VOLATILE: "Lead with reliability and trust signals.",
          EXPANSION: "Accelerate distribution and new product bets.",
        },
      },
    ],
  },
  metaInsight: {
    title: "Meta-Insight",
    statement: "Strategy is not a personality trait. It is an adaptation.",
    description:
      "Leaders fail when they cling to a fixed identity (\"visionary\" or \"operator\") instead of changing posture as the external physics change.",
    bullets: [
      "Lag is the enemy.",
      "Physics is the boss.",
      "Survival is the prerequisite for morality.",
    ],
  },
} as const;
