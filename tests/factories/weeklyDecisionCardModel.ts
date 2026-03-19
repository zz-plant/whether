import type { WeeklyDecisionCardViewModel } from "../../lib/report/homeBriefModel";

export type WeeklyDecisionCardModelOverrides = Partial<{
  status: Partial<WeeklyDecisionCardViewModel["status"]>;
  decision: Partial<WeeklyDecisionCardViewModel["decision"]>;
  presentation: Partial<NonNullable<WeeklyDecisionCardViewModel["presentation"]>>;
  diagnostics: Partial<WeeklyDecisionCardViewModel["diagnostics"]>;
  history: Partial<WeeklyDecisionCardViewModel["history"]>;
  sinceLastReview: Partial<WeeklyDecisionCardViewModel["sinceLastReview"]>;
  artifact: Partial<WeeklyDecisionCardViewModel["artifact"]>;
}>;

export const buildWeeklyDecisionCardModel = (
  overrides: WeeklyDecisionCardModelOverrides = {},
): WeeklyDecisionCardViewModel => ({
  status: {
    statusLabel: "DEFENSIVE",
    regimeKey: "DEFENSIVE",
    postureLabel: "Defensive",
    stageLabel: "Watchful",
    postureWithStageLabel: "Defensive — Watchful",
    postureDelta: "Worse than last week",
    confidenceLabel: "MED",
    confidencePercent: 68,
    signalConfidenceReason: "Reason: regime boundary proximity + volatile macro signals",
    regimeHeader: {
      regime: "Defensive",
      confidence: "Medium (mixed signal reliability)",
      primaryRisk: "Downside: Capital tightness tightened (1.0).",
    },
    trendLabel: "Improving",
    confidenceHistory: [
      { recordDate: "2026-02-13", confidencePercent: 60, isMissing: false },
      { recordDate: "2026-02-20", confidencePercent: 66, isMissing: false },
      { recordDate: "2026-02-27", confidencePercent: 72, isMissing: false },
    ],
    confidenceTrend: "strengthening",
    transitionWatch: "ON",
    isFallbackSnapshot: false,
    ...overrides.status,
  },
  decision: {
    operatingStanceLine: "Stage decisions. Avoid irreversible spend.",
    weeklyMemoLines: [
      "Market conditions tightened this week.",
      "Stage decisions. Avoid irreversible spend.",
      "Regime shift watch is on: stage approvals and preserve runway.",
    ],
    netConstraintSummary: "Pressure remains elevated but stabilizing.",
    guardrail: "Hold irreversible hiring unless direct revenue impact is clear.",
    reversalTrigger: "If risk appetite rises above 55, reopen selective hiring.",
    actionNowShort: "Focus on reversible bets.",
    immediateDecision: "Revise hiring and roadmap calls now.",
    guardrailThreshold: "Hold irreversible hiring unless direct revenue impact is clear.",
    flipThreshold: "If risk appetite rises above 55, reopen selective hiring.",
    compactFlipConditionLabels: ["Risk appetite > 55"],
    reportDynamics: { directionLabel: "deteriorating", totalSignalChanges: 0, regimeChanged: false, changedSignals: [], anomalySignals: [] },
    decisionShiftSummary: "Decision delta: tighten roadmap optionality while protecting core delivery.",
    transitionProbabilities: { Expansion: 10, Mixed: 35, Scarcity: 40, Defensive: 15 },
    decisionRules: [],
    decisionMatrix: {
      columns: [
        { key: "approve", label: "Approve" },
        { key: "delay", label: "Delay" },
        { key: "flip", label: "Flip" },
      ],
      rows: [
        {
          key: "hiring",
          label: "Hiring",
          cells: {
            approve: { text: "Approve revenue-linked backfills.", detail: "Only when proof and manager capacity are in place.", action: "Approve revenue-linked backfills.", threshold: "Hold if tightness rises above 70.", reversal: "Reopen after risk appetite recovery holds." },
            delay: { text: "Delay team expansion.", detail: "Hold broad org adds until tighter conditions ease.", action: "Delay team expansion.", threshold: "Hold if tightness rises above 70.", reversal: "Reopen after risk appetite recovery holds." },
            flip: { text: "Reopen selective hiring.", detail: "Flip after risk appetite recovery holds.", action: "Approve revenue-linked backfills.", threshold: "Hold if tightness rises above 70.", reversal: "Reopen selective hiring." },
          },
        },
        {
          key: "product",
          label: "Product",
          cells: {
            approve: { text: "Ship near-term proof work.", detail: "Bias roadmap toward measurable customer pull.", action: "Ship near-term proof work.", threshold: "Pause long-payback bets if risk appetite drops.", reversal: "Re-expand once threshold pressure clears." },
            delay: { text: "Delay long-payback roadmap bets.", detail: "Keep optional work staged.", action: "Delay long-payback roadmap bets.", threshold: "Pause long-payback bets if risk appetite drops.", reversal: "Re-expand once threshold pressure clears." },
            flip: { text: "Re-expand roadmap scope.", detail: "Flip once threshold pressure clears.", action: "Ship near-term proof work.", threshold: "Pause long-payback bets if risk appetite drops.", reversal: "Re-expand roadmap scope." },
          },
        },
        {
          key: "capital",
          label: "Capital",
          cells: {
            approve: { text: "Prepare financing narrative.", detail: "Keep financing options warm.", action: "Prepare financing narrative.", threshold: "Pause acceleration if risk appetite falls.", reversal: "Accelerate once financing conditions improve." },
            delay: { text: "Delay aggressive raise timing.", detail: "Avoid assuming a better market next week.", action: "Delay aggressive raise timing.", threshold: "Pause acceleration if risk appetite falls.", reversal: "Accelerate once financing conditions improve." },
            flip: { text: "Accelerate raise prep.", detail: "Move once financing conditions improve.", action: "Prepare financing narrative.", threshold: "Pause acceleration if risk appetite falls.", reversal: "Accelerate raise prep." },
          },
        },
        {
          key: "burn",
          label: "Burn",
          cells: {
            approve: { text: "Approve critical fixed cost only.", detail: "Tie spend to near-term proof.", action: "Approve critical fixed cost only.", threshold: "Pause burn expansion if tightness rises.", reversal: "Re-open once the reversal trigger prints." },
            delay: { text: "Delay discretionary expansion.", detail: "Protect runway while confidence is mixed.", action: "Delay discretionary expansion.", threshold: "Pause burn expansion if tightness rises.", reversal: "Re-open once the reversal trigger prints." },
            flip: { text: "Re-open spend bands.", detail: "Flip after the reversal trigger prints.", action: "Approve critical fixed cost only.", threshold: "Pause burn expansion if tightness rises.", reversal: "Re-open spend bands." },
          },
        },
      ],
    },
    actionStripItems: [
      {
        lever: "hiring-stance",
        label: "Hiring pace",
        actionNow: "Keep hiring to critical, revenue-linked backfills only.",
        triggerThreshold: "Tighten if tightness rises above 70 or confidence slips.",
        reversalCondition: "Reopen selective hiring after risk appetite clears 55 for two reads.",
      },
      {
        lever: "investment-pace",
        label: "Investment pace",
        actionNow: "Stage discretionary spend behind proof milestones.",
        triggerThreshold: "Loosen only after threshold pressure eases and payback stays inside plan.",
        reversalCondition: "Reverse to faster pace once the flip condition prints and confidence improves.",
      },
    ],
    roleAwareTemplates: [
      {
        role: "startup-leadership",
        roleLabel: "Startup leadership",
        doNow: "Keep delivery focused.",
        avoidNow: "Do not add fixed costs without proof.",
        flipTrigger: "Resume staged expansion when tightness and risk appetite recover.",
      },
      {
        role: "vc-partner",
        roleLabel: "VC partner",
        doNow: "Push portfolio pacing discipline.",
        avoidNow: "Avoid encouraging irreversible expansion.",
        flipTrigger: "Reopen growth pacing after two improving reads.",
      },
    ],
    executiveOperationalStance: {
      expand: ["Increase product tempo for reversible bets", "Selective hiring for revenue-linked roles"],
      avoid: ["net-new hiring if tightness > 74", "long-payback bets if risk appetite < 44"],
    },
    revisitDecisions: true,
    weeklyMovement: { score: 1.2, direction: "defensive", summary: "Model pressure increased by +1.2 this week; tighten approvals until a reversal trigger prints." },
    ...overrides.decision,
  },
  presentation: {
    whyItMattersLine: "External conditions shape how aggressively teams hire, spend, and approve long-payback work this week.",
    readThisCardItems: [
      { label: "What changed", detail: "Pressure rose versus last week." },
      { label: "What action it changes", detail: "Revise hiring and roadmap calls now." },
      { label: "What would reverse the call", detail: "If risk appetite rises above 55, reopen selective hiring." },
    ],
    glossaryHref: "/method#beginner-glossary",
    ...overrides.presentation,
  },
  diagnostics: {
    regimeSignalIndicators: [
      { key: "tightness", label: "Capital tightness", valueLabel: "64", rawValue: 64, trendArrow: "↑", trendDeltaLabel: "+1.0 vs last week", sparkline: [61, 62, 63, 64], isFallback: false },
      { key: "riskAppetite", label: "Risk appetite", valueLabel: "52", rawValue: 52, trendArrow: "↓", trendDeltaLabel: "-1.0 vs last week", sparkline: [56, 54, 53, 52], isFallback: false },
      { key: "baseRate", label: "Base rate", valueLabel: "5.3", rawValue: 5.3, trendArrow: "→", trendDeltaLabel: "No weekly delta", sparkline: [5.3], isFallback: true },
      { key: "curveSlope", label: "Yield curve slope", valueLabel: "-0.2", rawValue: -0.2, trendArrow: "↑", trendDeltaLabel: "+0.1 vs last week", sparkline: [-0.4, -0.3, -0.2], isFallback: false },
    ],
    inputInfluence: [
      {
        key: "tightness",
        label: "Capital tightness",
        valueLabel: "64",
        pressureLabel: "Room to loosen",
        effectDetail: "6.0 pts below the regime line, so the call still has room to loosen if other inputs confirm.",
        influencePercent: 39,
        influencePercentLabel: "39%",
        trendArrow: "↑",
        trendLabel: "+1.0 vs last week",
        watchLabel: "Regime line 70.0",
        tone: "positive",
      },
      {
        key: "riskAppetite",
        label: "Risk appetite",
        valueLabel: "52",
        pressureLabel: "Expansion support",
        effectDetail: "2.0 pts above the regime line, so the call can carry larger reversible bets.",
        influencePercent: 31,
        influencePercentLabel: "31%",
        trendArrow: "↓",
        trendLabel: "-1.0 vs last week",
        watchLabel: "Regime line 50.0",
        tone: "positive",
      },
      {
        key: "baseRate",
        label: "Base rate",
        valueLabel: "5.3",
        pressureLabel: "Payback pressure",
        effectDetail: "0.3 pts above the cost-of-money line, so long-payback work needs harder proof.",
        influencePercent: 22,
        influencePercentLabel: "22%",
        trendArrow: "→",
        trendLabel: "No fresh weekly delta yet.",
        watchLabel: "Cost-of-money line 5.0%",
        tone: "warning",
      },
      {
        key: "curveSlope",
        label: "Yield curve slope",
        valueLabel: "-0.2",
        pressureLabel: "Recession caution",
        effectDetail: "The curve is still inverted, so expansion confidence stays capped even if other inputs improve.",
        influencePercent: 8,
        influencePercentLabel: "8%",
        trendArrow: "↑",
        trendLabel: "+0.1 vs last week",
        watchLabel: "Below 0.0% = inversion",
        tone: "warning",
      },
    ],
    startupClimateIndex: { score: 63, status: "Improving", breakdown: [{ label: "Capital availability", score: 71 }] },
    regimeDistance: { dimensionLabel: "Tightness", currentValue: 64, thresholdValue: 70, pointsToFlip: 6, dimensionKey: "tightness", thresholdDirection: "riseAbove" },
    regimeVelocity: { status: "insufficient_history", from: "Expansion", to: "Mixed", sampleSize: 1, displayLabel: "Expansion→Mixed: insufficient history" },
    whyThisCall: [{ label: "Momentum", detail: "Capital tightness tightened this week." }],
    evidenceItems: [{ key: "tightness", title: "Capital conditions", supportingBullets: ["Weekly move: +1.0 vs. prior snapshot."], confidenceLabel: "Medium", directionLabel: "Tightening", immediateImplication: "Tighten approvals and protect runway for fixed-cost commitments." }],
    failureModes: [],
    ...overrides.diagnostics,
  },
  history: {
    memoryRail: [{ label: "Now", posture: "Defensive" }],
    historicalTimeline: [{ label: "2026", posture: "Defensive" }],
    historicalAnalogs: [],
    macroOverlay: [{ label: "VC funding", detail: "-4.5 · ↑ improving" }],
    ...overrides.history,
  },
  sinceLastReview: {
    isReturningUser: true,
    hasMeaningfulDelta: true,
    fallbackCopy: "",
    items: [
      { id: "posture-shift", label: "Posture shift", detail: "Posture moved from Volatile to Defensive.", href: "/decide" },
      { id: "top-driver", label: "Top driver change", detail: "Capital tightness tightened.", href: "/signals" },
      { id: "trigger-risk", label: "Trigger / risk change", detail: "Guardrail now tightened.", href: "/operations" },
    ],
    ...overrides.sinceLastReview,
  },
  artifact: {
    citation: "Whether weekly brief citation",
    recordDateLabel: "Mar 5, 2026",
    fetchedAtLabel: "Mar 6, 2026 09:12 UTC",
    freshnessLine: "Freshness: Mar 6, 2026 09:12 UTC",
    ...overrides.artifact,
  },
});
