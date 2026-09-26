/**
 * Decision Shield unit tests for verdicts and guardrails.
 */
import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { evaluateDecision, stressTestDecisionPlan, compareDecisionPlans } from "../lib/decisionShield";
import { buildShareText } from "../app/operate/components/decisionShieldUtils";
import type { RegimeAssessment } from "../lib/regimeEngine";

describe("decision shield verdicts", () => {
  it("flags hiring as dangerous in scarcity", () => {
    const assessment: RegimeAssessment = {
      regime: "SCARCITY",
      scores: {
        tightness: 100,
        riskAppetite: 20,
        baseRateUsed: "1M",
        baseRate: 5.5,
        curveSlope: -0.4,
      },
      diagnostics: {
        tightnessVsThreshold: 0,
        riskAppetiteVsThreshold: 0,
        nearestThresholdDelta: 0,
        confidence: "LOW",
        transitionWatch: false,
        intensity: "MILD",
        boundaryContributors: [],
        weakReadCount: 0,
        twoWeakReadsWarning: false,
      },
      description: "",
      constraints: [],
      tightnessExplanation: "",
      riskAppetiteExplanation: "",
      dataWarnings: [],
      thresholds: {
        baseRateTightness: 5,
        tightnessRegime: 70,
        riskAppetiteRegime: 50,
      },
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

    const output = evaluateDecision(assessment, {
      lifecycle: "GROWTH",
      category: "HIRING",
      action: "HIRE",
    });

    assert.equal(output.verdict, "DANGEROUS");
    assert.ok(output.guardrail.length > 0);
  });

  it("marks expansion hiring as safe with a guardrail", () => {
    const assessment: RegimeAssessment = {
      regime: "EXPANSION",
      scores: {
        tightness: 20,
        riskAppetite: 80,
        baseRateUsed: "1M",
        baseRate: 3.1,
        curveSlope: 1.1,
      },
      diagnostics: {
        tightnessVsThreshold: 0,
        riskAppetiteVsThreshold: 0,
        nearestThresholdDelta: 0,
        confidence: "LOW",
        transitionWatch: false,
        intensity: "MILD",
        boundaryContributors: [],
        weakReadCount: 0,
        twoWeakReadsWarning: false,
      },
      description: "",
      constraints: [],
      tightnessExplanation: "",
      riskAppetiteExplanation: "",
      dataWarnings: [],
      thresholds: {
        baseRateTightness: 5,
        tightnessRegime: 70,
        riskAppetiteRegime: 50,
      },
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

    const output = evaluateDecision(assessment, {
      lifecycle: "GROWTH",
      category: "HIRING",
      action: "HIRE",
    });

    assert.equal(output.verdict, "SAFE");
    assert.ok(output.guardrail.length > 0);
  });

  it("returns reversal triggers tied to thresholds", () => {
    const assessment: RegimeAssessment = {
      regime: "DEFENSIVE",
      scores: {
        tightness: 75,
        riskAppetite: 60,
        baseRateUsed: "1M",
        baseRate: 5.4,
        curveSlope: 0.3,
      },
      diagnostics: {
        tightnessVsThreshold: 0,
        riskAppetiteVsThreshold: 0,
        nearestThresholdDelta: 0,
        confidence: "LOW",
        transitionWatch: false,
        intensity: "MILD",
        boundaryContributors: [],
        weakReadCount: 0,
        twoWeakReadsWarning: false,
      },
      description: "",
      constraints: [],
      tightnessExplanation: "",
      riskAppetiteExplanation: "",
      dataWarnings: [],
      thresholds: {
        baseRateTightness: 5,
        tightnessRegime: 70,
        riskAppetiteRegime: 50,
      },
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

    const output = evaluateDecision(assessment, {
      lifecycle: "SCALE",
      category: "PRICING",
      action: "DISCOUNT",
    });

    assert.match(output.reversalTrigger, /funding pressure \(now 75\) drops below 70/);
    assert.match(output.reversalTrigger, /risk appetite \(now 60\) falls to or below 50/);
  });



  it("uses one-signal reversal trigger for expansion", () => {
    const assessment: RegimeAssessment = {
      regime: "EXPANSION",
      scores: {
        tightness: 20,
        riskAppetite: 80,
        baseRateUsed: "1M",
        baseRate: 3.1,
        curveSlope: 1.1,
      },
      diagnostics: {
        tightnessVsThreshold: 0,
        riskAppetiteVsThreshold: 0,
        nearestThresholdDelta: 0,
        confidence: "LOW",
        transitionWatch: false,
        intensity: "MILD",
        boundaryContributors: [],
        weakReadCount: 0,
        twoWeakReadsWarning: false,
      },
      description: "",
      constraints: [],
      tightnessExplanation: "",
      riskAppetiteExplanation: "",
      dataWarnings: [],
      thresholds: {
        baseRateTightness: 5,
        tightnessRegime: 70,
        riskAppetiteRegime: 50,
      },
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

    const output = evaluateDecision(assessment, {
      lifecycle: "GROWTH",
      category: "HIRING",
      action: "HIRE",
    });

    assert.match(output.reversalTrigger, /funding pressure \(now 20\) rises above 70, or risk appetite \(now 80\) falls to or below 50/);
  });

  it("applies lifecycle context to tighten discovery-stage verdicts", () => {
    const assessment: RegimeAssessment = {
      regime: "EXPANSION",
      scores: {
        tightness: 20,
        riskAppetite: 80,
        baseRateUsed: "1M",
        baseRate: 3.1,
        curveSlope: 1.1,
      },
      diagnostics: {
        tightnessVsThreshold: 0,
        riskAppetiteVsThreshold: 0,
        nearestThresholdDelta: 0,
        confidence: "LOW",
        transitionWatch: false,
        intensity: "MILD",
        boundaryContributors: [],
        weakReadCount: 0,
        twoWeakReadsWarning: false,
      },
      description: "",
      constraints: [],
      tightnessExplanation: "",
      riskAppetiteExplanation: "",
      dataWarnings: [],
      thresholds: {
        baseRateTightness: 5,
        tightnessRegime: 70,
        riskAppetiteRegime: 50,
      },
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

    const output = evaluateDecision(assessment, {
      lifecycle: "DISCOVERY",
      category: "HIRING",
      action: "HIRE",
    });

    assert.equal(output.verdict, "RISKY");
  });

});

/**
 * A benign regime, so anything that moves a verdict in these cases moved because
 * of the plan's size rather than the week's posture. EXPANSION grades HIRE as
 * SAFE, which leaves two clear rungs of escalation to observe.
 */
const buildExpansionAssessment = (): RegimeAssessment => ({
  regime: "EXPANSION",
  scores: { tightness: 40, riskAppetite: 70, baseRateUsed: "1M", baseRate: 3.2, curveSlope: 0.5 },
  diagnostics: {
    tightnessVsThreshold: 0,
    riskAppetiteVsThreshold: 0,
    nearestThresholdDelta: 20,
    confidence: "HIGH",
    transitionWatch: false,
    intensity: "STANDARD",
    boundaryContributors: [],
    weakReadCount: 0,
    twoWeakReadsWarning: false,
  },
  description: "",
  constraints: [],
  tightnessExplanation: "",
  riskAppetiteExplanation: "",
  dataWarnings: [],
  thresholds: { baseRateTightness: 3.5, tightnessRegime: 70, riskAppetiteRegime: 50 },
  inputs: [],
  policyAssessment: {
    version: "policy-v1",
    normalizations: [],
    composites: { cts: 0, ras: 0 },
    posture: "RISK_ON",
    band: "NEUTRAL",
    confidenceIndex: { signalDisagreement: 0, distanceFromNeutral: 0, signalDispersion: 0 },
    refusal: { refused: false, reasons: [] },
    governanceParameters: {
      hiringThreshold: "MODERATE",
      paybackWindowTolerance: "STANDARD",
      rollbackRequirement: "EXPLICIT_KILL_CRITERIA",
      approvalVelocity: "BALANCED",
      expansionScope: "BALANCED",
      experimentationTolerance: "MEDIUM",
    },
  },
});

/** $150k a month against 18 months of runway — $2.7m of cash to divide into. */
const cashProfile = { runwayMonths: 18, monthlyBurnUsd: 150_000 };

describe("stress test — sizing the plan against available cash", () => {
  it("no longer grades every commitment the same regardless of size", () => {
    const assessment = buildExpansionAssessment();
    const small = stressTestDecisionPlan(assessment, {
      planText: "hire 1 junior contractor at $60k",
      companyProfile: cashProfile,
    });
    const huge = stressTestDecisionPlan(assessment, {
      planText: "hire 40 senior engineers at $250k each",
      companyProfile: cashProfile,
    });

    assert.equal(small.verdict, "SAFE");
    assert.equal(huge.verdict, "DANGEROUS");
  });

  it("escalates exactly one rung between the elevated and severe lines", () => {
    // $700k of $2.7m is 26%: over the 25% line, under the 50% one.
    const elevated = stressTestDecisionPlan(buildExpansionAssessment(), {
      planText: "a $700k platform contract",
      companyProfile: cashProfile,
    });
    assert.equal(elevated.verdict, "RISKY");
    assert.match(elevated.sizingNote, /one step harsher/);
  });

  it("shows the arithmetic in the reader's own numbers", () => {
    const result = stressTestDecisionPlan(buildExpansionAssessment(), {
      planText: "Hiring 3 senior engineers @ $180k",
      companyProfile: cashProfile,
    });
    assert.equal(result.commitment.annualUsd, 540_000);
    assert.match(result.sizingNote, /\$540k in the first year is 20% of \$150k a month × 18 months of runway/);
  });

  it("refuses to size the plan when no cash figure was supplied, rather than guessing burn", () => {
    const result = stressTestDecisionPlan(buildExpansionAssessment(), {
      planText: "hire 40 senior engineers at $250k each",
      companyProfile: { runwayMonths: 18 },
    });
    assert.equal(result.runwayShare, null);
    assert.equal(result.verdict, "SAFE");
    assert.match(result.sizingNote, /sizing it needs your cash or monthly burn/);
  });

  it("says the plan carried no amount instead of treating it as free", () => {
    const result = stressTestDecisionPlan(buildExpansionAssessment(), {
      planText: "open a London office",
      companyProfile: cashProfile,
    });
    assert.equal(result.commitment.annualUsd, null);
    assert.match(result.sizingNote, /No amount in the plan/);
  });

  it("does not let the word 'reversible' talk a large commitment back down", () => {
    // The reversibility upgrade runs before sizing precisely so this holds.
    const result = stressTestDecisionPlan(buildExpansionAssessment(), {
      planText: "hire 40 senior engineers at $250k each, reversible",
      companyProfile: cashProfile,
    });
    assert.equal(result.verdict, "DANGEROUS");
  });
});

describe("stress test — detection confidence", () => {
  it("flags a sentence that named no decision type, rather than silently grading it as a hire", () => {
    const result = stressTestDecisionPlan(buildExpansionAssessment(), { planText: "asdf qwerty" });
    assert.equal(result.detectedAction, "HIRE");
    assert.equal(result.detectionConfidence, "ASSUMED");
  });

  it("reports a real keyword match as matched", () => {
    const cloud = stressTestDecisionPlan(buildExpansionAssessment(), {
      planText: "signing a $50k annual cloud commit",
    });
    assert.equal(cloud.detectedCategory, "INFRASTRUCTURE");
    assert.equal(cloud.detectionConfidence, "MATCHED");

    const prepay = stressTestDecisionPlan(buildExpansionAssessment(), {
      planText: "Prepay annual SaaS vendor for $60k to lock in a 25% discount",
    });
    assert.equal(prepay.detectedCategory, "PRICING");
    assert.equal(prepay.detectionConfidence, "MATCHED");

    const techDebt = stressTestDecisionPlan(buildExpansionAssessment(), {
      planText: "Allocate 40% sprint capacity to tech debt refactor",
    });
    assert.equal(techDebt.detectedCategory, "ROADMAP");
    assert.equal(techDebt.detectionConfidence, "MATCHED");

    const poach = stressTestDecisionPlan(buildExpansionAssessment(), {
      planText: "Poach 1 principal architect from competitor",
    });
    assert.equal(poach.detectedCategory, "HIRING");
    assert.equal(poach.detectionConfidence, "MATCHED");

    const usageFlex = stressTestDecisionPlan(buildExpansionAssessment(), {
      planText: "Shift enterprise renewals from $60k ARR commit to usage flex",
    });
    assert.equal(usageFlex.detectedCategory, "PRICING");
    assert.equal(usageFlex.detectionConfidence, "MATCHED");
  });

  it("treats an explicit category override as matched, not assumed", () => {
    const result = stressTestDecisionPlan(buildExpansionAssessment(), {
      planText: "asdf qwerty",
      category: "PRICING",
    });
    assert.equal(result.detectedCategory, "PRICING");
    assert.equal(result.detectionConfidence, "MATCHED");
  });
});

describe("stress test — runway prose matches the rule it applies", () => {
  it("quotes the same month count the check uses", () => {
    const base = buildExpansionAssessment();
    // Annotated rather than asserted: the preflight gate counts an added `as`,
    // and a declared type checks the override instead of trusting it.
    const defensive: RegimeAssessment = {
      ...base,
      regime: "DEFENSIVE",
      scores: { ...base.scores, tightness: 80, riskAppetite: 60 },
    };

    const result = stressTestDecisionPlan(defensive, {
      planText: "hire 2 engineers",
      companyProfile: { runwayMonths: 9 },
    });

    assert.equal(result.verdict, "DANGEROUS");
    assert.match(result.financialImpactSummary ?? "", /Runway of 9 months is under the 12-month line/);
  });
});

describe("stress test — the headline names what actually decided", () => {
  it("does not credit the week for a call the week did not make", () => {
    const sizeDriven = stressTestDecisionPlan(buildExpansionAssessment(), {
      planText: "hire 40 senior engineers at $250k each",
      companyProfile: cashProfile,
    });
    assert.equal(sizeDriven.verdictDriver, "SIZE");
    assert.equal(
      sizeDriven.headline,
      "Hire is DANGEROUS at this size, not on Sunny conditions alone.",
    );
  });

  it("keeps the regime framing when the regime is what decided", () => {
    const regimeDriven = stressTestDecisionPlan(buildExpansionAssessment(), {
      planText: "hire 1 junior contractor at $60k",
      companyProfile: cashProfile,
    });
    assert.equal(regimeDriven.verdictDriver, "REGIME");
    assert.equal(regimeDriven.headline, "Hire is considered SAFE in Sunny conditions.");
  });
});

describe("stress test — bootstrapped mode calibration", () => {
  it("decouples VC fundraising assumptions and warns on operating reserves when runway is critical", () => {
    const defensive: RegimeAssessment = {
      ...buildExpansionAssessment(),
      regime: "DEFENSIVE",
      scores: { tightness: 80, riskAppetite: 35, baseRateUsed: "1M", baseRate: 5.25, curveSlope: -0.2 },
    };

    const vcResult = stressTestDecisionPlan(defensive, {
      planText: "hire 2 engineers",
      companyProfile: { runwayMonths: 6, businessModel: "VC_BACKED" },
    });
    assert.ok(vcResult.fragileAssumptions.some((a) => a.includes("raising in Cloudy conditions is hard")));
    assert.ok(vcResult.fragileAssumptions.some((a) => a.includes("Assumes investors will fund fast burn")));

    const bootstrappedResult = stressTestDecisionPlan(defensive, {
      planText: "hire 2 engineers",
      companyProfile: { runwayMonths: 6, businessModel: "BOOTSTRAPPED" },
    });
    assert.ok(bootstrappedResult.fragileAssumptions.some((a) => a.includes("navigating Cloudy conditions leaves little room for operating losses")));
    assert.ok(!bootstrappedResult.fragileAssumptions.some((a) => a.includes("raising in Cloudy conditions is hard")));
    assert.ok(!bootstrappedResult.fragileAssumptions.some((a) => a.includes("Assumes investors will fund fast burn")));
    assert.ok(!bootstrappedResult.fragileAssumptions.some((a) => a.includes("Assumes capital and debt refinancing remain cheap")));
  });

  it("upgrades RISKY to SAFE when bootstrapped with strong gross margin (>= 70%)", () => {
    const defensive: RegimeAssessment = {
      ...buildExpansionAssessment(),
      regime: "DEFENSIVE",
      scores: { tightness: 75, riskAppetite: 40, baseRateUsed: "1M", baseRate: 5.25, curveSlope: 0.1 },
    };

    const lowMargin = stressTestDecisionPlan(defensive, {
      planText: "expand product into new vertical",
      companyProfile: { runwayMonths: 18, businessModel: "BOOTSTRAPPED", grossMarginPct: 45 },
    });
    assert.ok(lowMargin.fragileAssumptions.some((a) => a.includes("Gross margin (45%) provides limited buffer")));

    const highMargin = stressTestDecisionPlan(defensive, {
      planText: "expand product into new vertical",
      companyProfile: { runwayMonths: 18, businessModel: "BOOTSTRAPPED", grossMarginPct: 80 },
    });
    assert.equal(highMargin.verdict, "SAFE");
    assert.match(highMargin.financialImpactSummary ?? "", /Bootstrapped with 80% gross margin/);
  });
});

describe("share text — plan stress test artifact", () => {
  it("includes the plan text, verdict, sizing, assumptions, guardrail, and reversal", () => {
    const assessment = buildExpansionAssessment();
    const result = stressTestDecisionPlan(assessment, {
      planText: "hire 3 engineers at $180k each",
      companyProfile: cashProfile,
    });
    const output = evaluateDecision(assessment, {
      lifecycle: "GROWTH",
      category: "HIRING",
      action: "HIRE",
    });

    const shared = buildShareText(assessment, "GROWTH", "HIRING", "HIRE", output, {
      planMode: "natural_language",
      planText: "hire 3 engineers at $180k each",
      stressTestResult: result,
      businessModel: "VC_BACKED",
    });

    assert.match(shared, /Decision Shield — Plan Stress Test/);
    assert.match(shared, /This week's conditions: Sunny/);
    assert.match(shared, /Model: VC-Backed/);
    assert.match(shared, /Plan: "hire 3 engineers at \$180k each"/);
    assert.match(shared, /Decision verdict: /);
    assert.match(shared, /Pause if/);
    assert.match(shared, /Resume when/);
  });

  it("includes gross margin for bootstrapped mode", () => {
    const assessment = buildExpansionAssessment();
    const result = stressTestDecisionPlan(assessment, {
      planText: "hire 1 engineer",
      companyProfile: cashProfile,
    });
    const output = evaluateDecision(assessment, {
      lifecycle: "GROWTH",
      category: "HIRING",
      action: "HIRE",
    });

    const shared = buildShareText(assessment, "GROWTH", "HIRING", "HIRE", output, {
      planMode: "natural_language",
      planText: "hire 1 engineer",
      stressTestResult: result,
      businessModel: "BOOTSTRAPPED",
      grossMarginPct: 72,
    });

    assert.match(shared, /Model: Bootstrapped \(72% gross margin\)/);
  });

  it("falls back to the dropdown format when options are omitted", () => {
    const assessment = buildExpansionAssessment();
    const output = evaluateDecision(assessment, {
      lifecycle: "GROWTH",
      category: "HIRING",
      action: "HIRE",
    });

    const shared = buildShareText(assessment, "GROWTH", "HIRING", "HIRE", output);
    assert.match(shared, /Decision Shield — Whether Weekly Brief/);
    assert.doesNotMatch(shared, /Plan Stress Test/);
    assert.doesNotMatch(shared, /Plan Comparison/);
  });
});

describe("share text — plan comparison artifact", () => {
  it("includes both plans, both verdicts, and a recommendation", () => {
    const assessment = buildExpansionAssessment();
    const cmp = compareDecisionPlans(
      assessment,
      "hire 3 engineers at $180k each",
      "hire 1 contractor at $80k",
      cashProfile,
    );
    const output = evaluateDecision(assessment, {
      lifecycle: "GROWTH",
      category: "HIRING",
      action: "HIRE",
    });

    const shared = buildShareText(assessment, "GROWTH", "HIRING", "HIRE", output, {
      planMode: "compare",
      planText: "hire 3 engineers at $180k each",
      planBText: "hire 1 contractor at $80k",
      comparisonResult: cmp,
    });

    assert.match(shared, /Decision Shield — Plan Comparison/);
    assert.match(shared, /This week's conditions: Sunny/);
    assert.match(shared, /Recommendation: /);
    assert.match(shared, /Plan A: "hire 3 engineers at \$180k each"/);
    assert.match(shared, /Plan B: "hire 1 contractor at \$80k"/);
    assert.match(shared, /Decision verdict: /);
    assert.match(shared, /Pause if/);
  });
});
