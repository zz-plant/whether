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
          "In growth regimes, users are assets to retain. In tight regimes, support is a cost to control.",
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
    title: "Regime Playbooks",
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
          "Premature optimization",
          "Penny-pinching that slows velocity",
          "Slow, risk-averse hiring loops",
        ],
        start: [
          "Viral loops and referrals",
          "Freemium or generous trials",
          "Experimental product lines",
          "Aggressive geo-expansion",
        ],
        metric: "Week-over-week growth and market share",
      },
    ],
  },
  regimeEvidence: {
    title: "Regime Evidence",
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
          },
          {
            title: "10-Year vs. 2-Year Treasury Spread",
            source: "FRED",
            url: "https://fred.stlouisfed.org/series/T10Y2Y",
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
          },
          {
            title: "Treasury Yield Curve Methodology",
            source: "US Treasury",
            url: "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView",
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
          },
          {
            title: "Daily Treasury Yield Curve Rates",
            source: "US Treasury Fiscal Data",
            url: "https://fiscaldata.treasury.gov/api-documentation/",
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
          },
          {
            title: "10-Year vs. 2-Year Treasury Spread",
            source: "FRED",
            url: "https://fred.stlouisfed.org/series/T10Y2Y",
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
