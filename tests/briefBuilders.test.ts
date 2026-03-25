import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildBoardBrief, buildCallCitation, buildSlackBrief } from "../lib/export/briefBuilders";
import type { RegimeAssessment } from "../lib/regimeEngine";
import type { MacroSeriesReading, SensorReading, TreasuryData } from "../lib/types";

const assessment: RegimeAssessment = {
  regime: "EXPANSION",
  scores: {
    tightness: 12,
    riskAppetite: 68,
    baseRateUsed: "1M",
    baseRate: 3.75,
    curveSlope: 0.55,
  },
  diagnostics: {
    tightnessDelta: 0,
    riskAppetiteDelta: 0,
    nearestThresholdDelta: 0,
    confidence: "MEDIUM",
    transitionWatch: false,
    intensity: "MILD",
    boundaryContributors: [],
    weakReadCount: 0,
    twoWeakReadsWarning: false,
  },
  description: "",
  constraints: ["Constraint one", "Constraint two", "Constraint three"],
  tightnessExplanation: "",
  riskAppetiteExplanation: "",
  dataWarnings: [],
  thresholds: { baseRateTightness: 5, tightnessRegime: 70, riskAppetiteRegime: 50 },
  inputs: [],
  policyAssessment: {
    version: "v1",
    normalizations: [],
    composites: { cts: 0, ras: 0 },
    posture: "RISK_ON",
    band: "NEUTRAL",
    confidenceIndex: { agreement: 0, distanceFromNeutral: 0, volatility30d: 0 },
    refusal: { refused: false, reasons: [] },
    governanceParameters: {
      hiringThreshold: "MODERATE",
      paybackWindowTolerance: "LONGER",
      rollbackRequirement: "STANDARD",
      approvalVelocity: "FASTER",
      expansionScope: "BROAD",
      experimentationTolerance: "HIGH",
    },
  },
};

const treasury: TreasuryData = {
  source: "https://fred.stlouisfed.org",
  record_date: "2026-03-04",
  fetched_at: "2026-03-04T00:00:00.000Z",
  isLive: true,
  yields: { oneMonth: 3.75, threeMonth: 3.8, twoYear: 4.1, tenYear: 4.65 },
};

const sensors: SensorReading[] = [
  {
    id: "BASE_RATE",
    label: "Base rate",
    value: 3.75,
    unit: "%",
    explanation: "",
    category: "Rates",
    group: { id: "Rates", label: "Financial conditions", description: "Core funding conditions" },
    availableTimeWindows: ["1M", "3M", "6M", "12M"],
    sourceLabel: "FRED",
    sourceUrl: "https://fred.stlouisfed.org",
    formulaUrl: "",
    record_date: "2026-03-04",
    fetched_at: "2026-03-04T00:00:00.000Z",
    isLive: true,
  },
  {
    id: "CURVE_SLOPE",
    label: "Curve slope",
    value: 0.55,
    unit: "%",
    explanation: "",
    category: "Rates",
    group: { id: "Rates", label: "Financial conditions", description: "Core funding conditions" },
    availableTimeWindows: ["1M", "3M", "6M", "12M"],
    sourceLabel: "FRED",
    sourceUrl: "https://fred.stlouisfed.org",
    formulaUrl: "",
    record_date: "2026-03-04",
    fetched_at: "2026-03-04T00:00:00.000Z",
    isLive: true,
  },
];

const macros: MacroSeriesReading[] = [
  {
    id: "CHICAGO_FCI",
    label: "Chicago Fed National Financial Conditions Index",
    value: -0.52,
    unit: "index",
    explanation: "",
    sourceLabel: "FRED",
    sourceUrl: "https://fred.stlouisfed.org/series/NFCI",
    formulaUrl: "",
    record_date: "2026-02-27",
    fetched_at: "2026-03-04T00:00:00.000Z",
    isLive: true,
  },
  {
    id: "BBB_CREDIT_SPREAD",
    label: "BBB credit spread (OAS)",
    value: 174,
    unit: "bps",
    explanation: "",
    sourceLabel: "FRED",
    sourceUrl: "https://fred.stlouisfed.org/series/BAA10Y",
    formulaUrl: "",
    record_date: "2026-03-04",
    fetched_at: "2026-03-04T00:00:00.000Z",
    isLive: true,
  },
];

describe("buildSlackBrief", () => {
  it("formats index values without the literal unit suffix", () => {
    const brief = buildSlackBrief(assessment, treasury, sensors, macros);

    assert.match(brief, /Chicago Fed National Financial Conditions Index: -0\.52 · refreshed 2026-02-27/);
    assert.doesNotMatch(brief, /-0\.52index/);
  });

  it("includes compact financial implications aligned to posture", () => {
    const brief = buildSlackBrief(assessment, treasury, sensors, macros);

    assert.match(brief, /Financial implications:/);
    assert.match(brief, /Runway risk:/);
    assert.match(brief, /Suggested burn adjustment:/);
  });

  it("uses bounded decision triplets in stable action-trigger-reversal order", () => {
    const brief = buildSlackBrief(assessment, treasury, sensors, macros, {
      modeledDecision: {
        actionStripItems: [
          {
            lever: "hiring-stance",
            label: "Hiring stance",
            actionNow: "Limit net new hiring.",
            triggerThreshold: "Pause approvals when tightness > 70.",
            reversalCondition: "Resume when tightness < 64.",
          },
        ],
      },
    });

    assert.match(brief, /Bounded decision \(action \/ trigger \/ reversal\):/);
    assert.match(brief, /• Action: Limit net new hiring\./);
    assert.match(brief, /• Trigger threshold: Pause approvals when tightness > 70\./);
    assert.match(brief, /• Reversal condition: Resume when tightness < 64\./);
    assert.ok(brief.indexOf("• Action: Limit net new hiring.") < brief.indexOf("• Trigger threshold: Pause approvals when tightness > 70."));
    assert.ok(brief.indexOf("• Trigger threshold: Pause approvals when tightness > 70.") < brief.indexOf("• Reversal condition: Resume when tightness < 64."));
  });

  it("optionally appends interpretation layer content for handoff", () => {
    const brief = buildSlackBrief(assessment, treasury, sensors, macros, {
      interpretationLayer: {
        view: "financial",
        label: "Financial view",
        summary: "Runway translation for near-term operating cadence.",
        bullets: ["Action: Tighten non-core spend.", "Trigger: Reopen when risk appetite improves.", "Reverse: Restore burn only after two stable updates."],
      },
    });

    assert.match(brief, /Interpretation context: Financial view \(financial\)/);
    assert.match(brief, /Interpretation summary: Runway translation for near-term operating cadence\./);
    assert.match(brief, /Interpretation trust: translation layer only; canonical posture\/confidence\/thresholds unchanged\./);
    assert.match(brief, /• Action: Tighten non-core spend\./);
  });

  it("formats bps values with readable spacing", () => {
    const brief = buildSlackBrief(assessment, treasury, sensors, macros);

    assert.match(brief, /BBB credit spread \(OAS\): 174\.00 bps · refreshed 2026-03-04/);
  });

  it("carries interpretation context into board and citation artifacts", () => {
    const interpretationLayer = {
      view: "forecast" as const,
      label: "Forecast view",
      summary: "Boundary pressure translation for planning windows.",
      bullets: [
        "Action: Operate for Defensive (31%) while posture holds.",
        "Trigger: 3 points to boundary; crossing risk High.",
        "Reverse: Momentum mixed across boundary signals.",
      ],
    };

    const board = buildBoardBrief(assessment, treasury, sensors, macros, { interpretationLayer });
    const citation = buildCallCitation(assessment, treasury, { interpretationLayer });

    assert.match(board, /Interpretation context: Forecast view \(forecast\)/);
    assert.match(board, /Interpretation summary: Boundary pressure translation for planning windows\./);
    assert.match(citation, /Interpretation context: Forecast view \(forecast\)/);
  });

  it("includes posture stage label in export surfaces when provided", () => {
    const stageLabel = "Expansion — Late (Fragile)";
    const brief = buildSlackBrief(assessment, treasury, sensors, macros, { postureWithStageLabel: stageLabel });
    const citation = buildCallCitation(assessment, treasury, { postureWithStageLabel: stageLabel });

    assert.match(brief, /Capital posture: Expansion — Late \(Fragile\)/);
    assert.match(citation, /Posture: Expansion — Late \(Fragile\) \(EXPANSION\)/);
  });

  it("adds compact weekly call artifact lines when operating stance context is provided", () => {
    const brief = buildSlackBrief(assessment, treasury, sensors, macros, {
      postureWithStageLabel: "Guarded Expansion — Late",
      operatingStanceLine: "Stage decisions. Avoid irreversible spend.",
      trendLabel: "Deteriorating",
      transitionWatch: "ON",
      regimeDistancePoints: 2,
      confidenceLabel: "MED",
      freshnessLabel: "Unavailable",
      actionStripItems: [
        {
          lever: "hiring-stance",
          label: "Hiring stance",
          actionNow: "Backfills only",
          triggerThreshold: "Pause net-new hiring if tightness > 76",
          reversalCondition: "Resume staged approvals when tightness < 66",
        },
      ],
    });

    assert.match(brief, /Startup environment — weekly call:/);
    assert.match(brief, /• Posture: Guarded Expansion — Late/);
    assert.match(brief, /• Trend: DETERIORATING/);
    assert.match(brief, /• Distance to regime change: 2\.0 points/);
    assert.match(brief, /• Regime shift watch: ON/);
    assert.match(brief, /• Current call:/);
    assert.match(brief, /• Re-check owner\/cadence: Owner: CEO \+ Finance lead/);
    assert.match(brief, /• Trust markers: Confidence: Guarded · Freshness: Stale/);
    assert.match(brief, /• Operating posture: Stage decisions\. Avoid irreversible spend\./);
    assert.match(brief, /• Hiring stance/);
    assert.match(brief, /Action now: Backfills only/);
    assert.match(brief, /Trigger\/threshold to tighten or loosen: Pause net-new hiring if tightness > 76/);
    assert.match(brief, /Reversal condition: Resume staged approvals when tightness < 66/);
  });

  it("keeps citation-ready source lines in exported briefs", () => {
    const brief = buildSlackBrief(assessment, treasury, sensors, macros);
    assert.match(brief, /Citations:/);
    assert.match(brief, /Treasury source: https:\/\/fred\.stlouisfed\.org \(2026-03-04\)/);
    assert.match(brief, /Chicago Fed National Financial Conditions Index: https:\/\/fred\.stlouisfed\.org\/series\/NFCI \(2026-02-27\)/);
  });




  it("includes at least one false-signal warning line when active", () => {
    const brief = buildSlackBrief(assessment, treasury, sensors, macros, {
      failureModes: [
        {
          warning: "Boundary whipsaw risk: call is near a flip threshold with unstable weekly motion.",
          mitigationCheck: "Mitigation check: require one confirming read before escalating fixed-cost commitments.",
        },
      ],
    });

    assert.match(brief, /False-signal warning:/);
    assert.match(brief, /Boundary whipsaw risk:/);
    assert.match(brief, /Mitigation check:/);
  });

  it("adds compact historical analog references when provided", () => {
    const brief = buildSlackBrief(assessment, treasury, sensors, macros, {
      historicalAnalogs: [
        { date: "2024-10-31", similarityScore: 0.91, implication: "Keep approvals reversible while trend remains mixed." },
      ],
    });

    assert.match(brief, /Historical analogs:/);
    assert.match(brief, /2024-10-31 · 91% match/);
  });
  it("omits interpretation context when default layer is selected", () => {
    const citation = buildCallCitation(assessment, treasury, {
      interpretationLayer: {
        view: "default",
        label: "Default view",
        summary: "Core weekly interpretation.",
        bullets: ["Action: Hold core posture."],
      },
    });

    assert.doesNotMatch(citation, /Interpretation context:/);
  });
});
