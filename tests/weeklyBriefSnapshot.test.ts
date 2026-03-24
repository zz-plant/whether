import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildFallbackForecastModel } from "../lib/report/forecastModel";
import { buildPostureStateContract } from "../lib/report/postureStateContract";
import { buildWeeklyBriefSnapshot } from "../lib/report/weeklyBriefSnapshot";
import type { ReportData } from "../lib/report/reportData";
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
  fetchedAtLabel: "2026-03-01T00:00:00Z",
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

describe("buildWeeklyBriefSnapshot", () => {
  it("builds a usable baseline snapshot without posture state", () => {
    const snapshot = buildWeeklyBriefSnapshot({
      reportData,
      degraded: false,
    });

    assert.equal(snapshot.canonicalDecisionCopy, null);
    assert.equal(snapshot.weeklyDecisionCardModel.status.statusLabel.length > 0, true);
    assert.equal(snapshot.trustStatus.trustStatusTone, "stable");
  });

  it("enriches the snapshot when posture state is provided", () => {
    const postureState = buildPostureStateContract({
      assessment,
      recordDate: treasury.record_date,
      postureLabel: "Defensive",
      decisionEventStore: [],
    });

    const snapshot = buildWeeklyBriefSnapshot({
      reportData,
      degraded: false,
      postureState,
    });

    assert.equal(snapshot.postureState, postureState);
    assert.ok(snapshot.canonicalDecisionCopy);
    assert.equal(snapshot.weeklyDecisionCardModel.decision.immediateDecision.length > 0, true);
    assert.match(snapshot.callCitation, /Whether call/);
  });
});
