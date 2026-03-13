import type { WeeklyDecisionCardViewModel } from "../../lib/report/homeBriefModel";

export type WeeklyDecisionCardModelOverrides = Partial<{
  status: Partial<WeeklyDecisionCardViewModel["status"]>;
  decision: Partial<WeeklyDecisionCardViewModel["decision"]>;
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
  diagnostics: {
    regimeSignalIndicators: [
      { key: "tightness", label: "Capital tightness", valueLabel: "64", rawValue: 64, trendArrow: "↑", trendDeltaLabel: "+1.0 vs last week", sparkline: [61, 62, 63, 64], isFallback: false },
      { key: "riskAppetite", label: "Risk appetite", valueLabel: "52", rawValue: 52, trendArrow: "↓", trendDeltaLabel: "-1.0 vs last week", sparkline: [56, 54, 53, 52], isFallback: false },
      { key: "baseRate", label: "Base rate", valueLabel: "5.3", rawValue: 5.3, trendArrow: "→", trendDeltaLabel: "No weekly delta", sparkline: [5.3], isFallback: true },
      { key: "curveSlope", label: "Yield curve slope", valueLabel: "-0.2", rawValue: -0.2, trendArrow: "↑", trendDeltaLabel: "+0.1 vs last week", sparkline: [-0.4, -0.3, -0.2], isFallback: false },
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
