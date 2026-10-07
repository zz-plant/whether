import { buildFallbackForecastModel } from "../../lib/report/forecastModel";
import type { ReportData } from "../../lib/report/reportData";
import type { RegimeAssessment } from "../../lib/regimeEngine";
import type { TreasuryData } from "../../lib/types";

type AssessmentOverrides = Omit<
  Partial<RegimeAssessment>,
  "regimeTransition" | "scores" | "diagnostics" | "thresholds" | "policyAssessment"
> & {
  regimeTransition?: Partial<RegimeAssessment["regimeTransition"]> & {
    snapshot?: Partial<NonNullable<RegimeAssessment["regimeTransition"]>["snapshot"]>;
  };
  scores?: Partial<RegimeAssessment["scores"]>;
  diagnostics?: Partial<RegimeAssessment["diagnostics"]>;
  thresholds?: Partial<RegimeAssessment["thresholds"]>;
  policyAssessment?: Partial<RegimeAssessment["policyAssessment"]> & {
    composites?: Partial<RegimeAssessment["policyAssessment"]["composites"]>;
    confidenceIndex?: Partial<RegimeAssessment["policyAssessment"]["confidenceIndex"]>;
    refusal?: Partial<RegimeAssessment["policyAssessment"]["refusal"]>;
    governanceParameters?: Partial<RegimeAssessment["policyAssessment"]["governanceParameters"]>;
  };
};

type TreasuryOverrides = Partial<TreasuryData> & {
  yields?: Partial<TreasuryData["yields"]>;
};

type ReportDataOverrides = Omit<Partial<ReportData>, "assessment" | "treasury" | "liveTreasury" | "thresholds"> & {
  assessment?: AssessmentOverrides;
  treasury?: TreasuryOverrides;
  liveTreasury?: TreasuryOverrides;
  thresholds?: Partial<ReportData["thresholds"]>;
};

export const buildAssessmentFixture = (overrides: AssessmentOverrides = {}): RegimeAssessment => {
  const base: RegimeAssessment & {
    regimeTransition: NonNullable<RegimeAssessment["regimeTransition"]>;
  } = {
    regime: "DEFENSIVE",
    regimeTransition: {
      nextState: "DEFENSIVE",
      candidateState: "DEFENSIVE",
      committed: false,
      pending: false,
      transitionReason: "No threshold crossing changed the committed state.",
      snapshot: {
        committedState: "DEFENSIVE",
        pendingState: null,
        pendingCount: 0,
        lastSignals: { tightness: 72, riskAppetite: 48 },
      },
    },
    scores: { tightness: 72, riskAppetite: 48, baseRateUsed: "1M", baseRate: 5.2, curveSlope: -0.1 },
    diagnostics: {
      tightnessVsThreshold: 2,
      riskAppetiteVsThreshold: -2,
      nearestThresholdDelta: 2,
      confidence: "LOW",
      transitionWatch: true,
      intensity: "MILD",
      boundaryContributors: [],
      weakReadCount: 0,
      twoWeakReadsWarning: false,
    },
    description: "",
    constraints: ["Cut low-leverage experiments."],
    tightnessExplanation: "",
    riskAppetiteExplanation: "",
    dataWarnings: [],
    thresholds: { baseRateTightness: 5, tightnessRegime: 70, riskAppetiteRegime: 50 },
    inputs: [],
    policyAssessment: {
      version: "policy-v1",
      normalizations: [],
      composites: { cts: 0, ras: 0 },
      posture: "TRANSITION",
      band: "NEUTRAL",
      confidenceIndex: { signalDisagreement: 0, distanceFromNeutral: 0, signalDispersion: 0 },
      refusal: { refused: false, reasons: [] },
      governanceParameters: {
        hiringThreshold: "HIGH",
        paybackWindowTolerance: "STANDARD",
        rollbackRequirement: "EXPLICIT_KILL_CRITERIA",
        approvalVelocity: "BALANCED",
        expansionScope: "BALANCED",
        experimentationTolerance: "MEDIUM",
      },
    },
  };

  return {
    ...base,
    ...overrides,
    regimeTransition: {
      ...base.regimeTransition,
      ...overrides.regimeTransition,
      snapshot: {
        ...base.regimeTransition.snapshot,
        ...overrides.regimeTransition?.snapshot,
      },
    },
    scores: {
      ...base.scores,
      ...overrides.scores,
    },
    diagnostics: {
      ...base.diagnostics,
      ...overrides.diagnostics,
    },
    thresholds: {
      ...base.thresholds,
      ...overrides.thresholds,
    },
    policyAssessment: {
      ...base.policyAssessment,
      ...overrides.policyAssessment,
      composites: {
        ...base.policyAssessment.composites,
        ...overrides.policyAssessment?.composites,
      },
      confidenceIndex: {
        ...base.policyAssessment.confidenceIndex,
        ...overrides.policyAssessment?.confidenceIndex,
      },
      refusal: {
        ...base.policyAssessment.refusal,
        ...overrides.policyAssessment?.refusal,
      },
      governanceParameters: {
        ...base.policyAssessment.governanceParameters,
        ...overrides.policyAssessment?.governanceParameters,
      },
    },
  };
};

export const buildTreasuryFixture = (overrides: TreasuryOverrides = {}): TreasuryData => {
  const base: TreasuryData = {
    source: "https://example.com/treasury",
    record_date: "2026-03-01",
    fetched_at: "2026-03-01T00:00:00Z",
    isLive: true,
    yields: { oneMonth: 5.2, twoYear: 4.6, tenYear: 4.5 },
  };

  return {
    ...base,
    ...overrides,
    yields: {
      ...base.yields,
      ...overrides.yields,
    },
  };
};

export const buildReportDataFixture = (overrides: ReportDataOverrides = {}): ReportData => {
  const assessment = buildAssessmentFixture(overrides.assessment);
  const treasury = buildTreasuryFixture(overrides.treasury);
  const liveTreasury = buildTreasuryFixture(overrides.liveTreasury ?? overrides.treasury);

  const base: ReportData = {
    assessment,
    cacheCoverage: { earliest: "2025-01-01", latest: "2026-03-01" },
    cacheMonthsByYear: {},
    fetchedAtLabel: "Mar 1, 2026 00:00 UTC",
    fenceItems: assessment.constraints,
    forecast: buildFallbackForecastModel(),
    historicalComparison: null,
    historicalSelection: null,
    historicalAnalogs: [],
    internalProvenance: {
      sourceLabel: "Whether curated playbook catalog",
      recordDateLabel: "Static",
      timestampLabel: "Static catalog",
      ageLabel: "Static.",
      statusLabel: "Curated catalog (static)",
    },
    invalidHistoricalSelection: false,
    lastYearComparison: null,
    liveAssessment: null,
    liveTreasury,
    monthEndComparison: null,
    macroProvenance: {
      sourceLabel: "FRED & US Treasury",
      sourceUrl: treasury.source,
      recordDateLabel: "Mar 1, 2026",
      timestampLabel: "Mar 1, 2026 00:00 UTC",
      ageLabel: "0h",
      statusLabel: "Live (high confidence)",
    },
    macroSeries: [],
    macroCoverage: {
      mode: "live",
      label: "Live macro coverage",
      alignedCount: 0,
      totalCount: 0,
    },
    playbook: null,
    recordDateLabel: "Mar 1, 2026",
    weeklyRecordDate: "2026-03-01",
    weeklyRecordDateLabel: "Week ending Mar 1, 2026",
    reportDynamics: {
      changedSignals: [{ key: "tightness", label: "Funding pressure", delta: 2 }],
      anomalySignals: [],
      totalSignalChanges: 1,
      regimeChanged: false,
      directionLabel: "deteriorating",
    },
    requestedSelection: null,
    regimeSeries: [],
    regimeAlert: {
      changed: true,
      currentRegime: "DEFENSIVE",
      previousRegime: "VOLATILE",
      currentRecordDate: "2026-03-01",
      previousRecordDate: "2026-02-22",
      reasons: ["Tightness moved above 70."],
      summary: "Capital posture moved from VOLATILE to DEFENSIVE.",
    },
    yieldCurveSeries: [],
    regimeTrend: "STABLE",
    selectedMonth: 3,
    selectedYear: 2026,
    sensors: [],
    startItems: [],
    statusLabel: "Cloudy",
    stopItems: ["Pause non-core hiring."],
    actionStripItems: [],
    actionNowShort: "Stage decisions. Avoid irreversible spend.",
    reportEvidenceItems: [],
    guardrailThreshold: "Pause non-core hiring.",
    flipThreshold: "Reopen only when thresholds recover.",
    confidenceHistory: [],
    confidenceTrend: "unstable",
    thresholds: assessment.thresholds,
    treasury,
    treasuryProvenance: {
      sourceLabel: "Federal Reserve Economic Data (FRED)",
      sourceUrl: treasury.source,
      recordDateLabel: "Mar 1, 2026",
      timestampLabel: "Mar 1, 2026 00:00 UTC",
      ageLabel: "0h",
      statusLabel: "Live (high confidence)",
    },
    sourceHealth: [],
    materializedSignals: null,
    operatingSnapshot: null,
    projectsOperatingSnapshot: false,
  };

  return {
    ...base,
    ...overrides,
    assessment,
    treasury,
    liveTreasury,
    thresholds: {
      ...assessment.thresholds,
      ...overrides.thresholds,
    },
  };
};
