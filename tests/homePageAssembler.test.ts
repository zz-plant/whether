import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assembleHomePage } from "../lib/report/homePageAssembler";
import { buildFallbackForecastModel } from "../lib/report/forecastModel";
import { buildPostureStateContract, type PostureStateContract } from "../lib/report/postureStateContract";
import type { LoadReportDataSafeResult, ReportData } from "../lib/report/reportData";
import type { RegimeAssessment } from "../lib/regimeEngine";
import type { TreasuryData } from "../lib/types";

const assessment: RegimeAssessment = {
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
    tightnessDelta: 2,
    riskAppetiteDelta: -2,
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
    confidenceIndex: { agreement: 0, distanceFromNeutral: 0, volatility30d: 0 },
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

const treasury: TreasuryData = {
  source: "https://example.com/treasury",
  record_date: "2026-03-01",
  fetched_at: "2026-03-01T00:00:00Z",
  isLive: true,
  yields: { oneMonth: 5.2, twoYear: 4.6, tenYear: 4.5 },
};

const reportData: ReportData = {
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
    statusLabel: "Simulated (low)",
  },
  invalidHistoricalSelection: false,
  lastYearComparison: null,
  liveAssessment: null,
  liveTreasury: treasury,
  macroProvenance: {
    sourceLabel: "FRED & US Treasury",
    sourceUrl: treasury.source,
    recordDateLabel: "Mar 1, 2026",
    timestampLabel: "Mar 1, 2026 00:00 UTC",
    ageLabel: "0h",
    statusLabel: "Live (high confidence)",
  },
  macroSeries: [],
  playbook: null,
  recordDateLabel: "Mar 1, 2026",
  weeklyRecordDate: "2026-03-01",
  weeklyRecordDateLabel: "Week ending Mar 1, 2026",
  reportDynamics: {
    changedSignals: [{ key: "tightness", label: "Capital tightness", delta: 2 }],
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
  statusLabel: "Defensive",
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
};

const postureState = buildPostureStateContract({
  assessment,
  recordDate: treasury.record_date,
  postureLabel: "Contraction",
  decisionEventStore: [],
});

const buildReportResult = (): LoadReportDataSafeResult => ({
  ok: true,
  data: reportData,
});

describe("assembleHomePage streaming contract", () => {
  it("returns the weekly call before deferred posture-state work settles", async () => {
    let releasePostureState: ((value: PostureStateContract) => void) | undefined;
    const postureStatePromise = new Promise<PostureStateContract>((resolve) => {
      releasePostureState = resolve;
    });

    const homepage = await assembleHomePage(
      { searchParams: undefined },
      {
        loadHomePageReportData: async () => buildReportResult(),
        buildPostureState: async () => postureStatePromise,
      },
    );

    assert.match(homepage.weeklyDecisionCardModel.decision.immediateDecision, /stage|revise|hold/i);
    assert.ok(homepage.reportShell.commandBar.doNow.length > 0);
    assert.equal(homepage.fallbackActive, false);

    let diagnosticsSettled = false;
    let artifactSettled = false;
    let workspaceSettled = false;
    void homepage.diagnosticsLanePromise.then(() => {
      diagnosticsSettled = true;
    });
    void homepage.leadershipArtifactPayloadPromise.then(() => {
      artifactSettled = true;
    });
    void homepage.workspaceModelPromise.then(() => {
      workspaceSettled = true;
    });

    await Promise.resolve();
    await Promise.resolve();

    assert.equal(diagnosticsSettled, false);
    assert.equal(artifactSettled, false);
    assert.equal(workspaceSettled, false);

    releasePostureState?.(postureState);

    const diagnosticsLane = await homepage.diagnosticsLanePromise;
    const artifactPayload = await homepage.leadershipArtifactPayloadPromise;
    const workspaceModel = await homepage.workspaceModelPromise;

    assert.ok(diagnosticsLane.immediateDecision.length > 0);
    assert.ok(artifactPayload);
    assert.match(artifactPayload?.weeklyCallSnapshotText ?? "", /avoid|hiring|threshold|flip/i);
    assert.equal(workspaceModel.workspaceActions.auditHref, "#audit-this-call");
    assert.equal(workspaceModel.operations.continueHref, "/operations#ops-monthly-action-summary");
    assert.equal(workspaceModel.translate.decisionUtilities.length, 2);
  });

  it("parses interpretation view from search params without changing the canonical weekly call", async () => {
    const homepage = await assembleHomePage(
      { searchParams: { view: "forecast", month: "3", year: "2026" } },
      {
        loadHomePageReportData: async () => buildReportResult(),
        buildPostureState: async () => postureState,
      },
    );

    assert.equal(homepage.interpretationLayer.view, "forecast");
    assert.equal(homepage.interpretationSearchParams?.view, "forecast");
    assert.equal(homepage.interpretationSearchParams?.month, "3");
    assert.match(homepage.interpretationLayer.summary, /boundary|flip|momentum/i);
    assert.match(homepage.weeklyDecisionCardModel.decision.immediateDecision, /stage|revise|hold/i);
  });
});
