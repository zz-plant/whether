/**
 * Decision Shield unit tests for verdicts and guardrails.
 */
import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { companyFinancialProfileFor, evaluateDecision, stressTestDecisionPlan, compareDecisionPlans } from "../lib/decisionShield";
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
    assert.match(result.sizingNote, /\$540k in the first year is 20% of \$150k a month of net burn × 18 months of runway/);
  });

  it("refuses to size the plan when no cash figure was supplied, rather than guessing burn", () => {
    const result = stressTestDecisionPlan(buildExpansionAssessment(), {
      planText: "hire 40 senior engineers at $250k each",
      companyProfile: { runwayMonths: 18 },
    });
    assert.equal(result.runwayShare, null);
    assert.equal(result.verdict, "SAFE");
    assert.match(result.sizingNote, /sizing it needs your cash, or your runway and monthly spend/);
  });

  it("shows net burn as spend less revenue when the operator's revenue went into it", () => {
    // Runway 12, spend $200k, revenue $150k: this printed "90% of $50k a month × 12 months", and $50k was on no screen.
    const companyProfile = companyFinancialProfileFor(
      { version: 1, runwayMonths: 12, monthlyBurnUsd: 200_000, monthlyRevenueUsd: 150_000 },
      "VC_BACKED",
    );
    const result = stressTestDecisionPlan(buildExpansionAssessment(), { planText: "Hire 3 senior engineers @ $180k", companyProfile });
    assert.match(result.sizingNote, /is 90% of \$50k a month of net burn \(\$200k spend less \$150k revenue\) × 12 months of runway/);
  });

  it("says revenue covers spending instead of asking for runway and spend already entered", () => {
    // Runway 14, spend $100k, revenue $120k: this said "sizing it needs your cash or monthly burn" with both filled.
    const typed = companyFinancialProfileFor({ version: 1, runwayMonths: 14, monthlyBurnUsd: 100_000, monthlyRevenueUsd: 120_000 }, "VC_BACKED");
    const result = stressTestDecisionPlan(buildExpansionAssessment(), { planText: "Hire 3 senior engineers @ $180k", companyProfile: typed });
    assert.equal(result.runwayShare, null);
    assert.equal(
      result.sizingNote,
      "Read $540k for the first year. Revenue covers your spending, so there is no burn to size it against: sizing it needs your cash in the bank, and without it the verdict rests on conditions alone.",
    );

    // With the cash in, it is sized against the cash.
    const withCash = companyFinancialProfileFor({ version: 1, cashUsd: 1_400_000, monthlyBurnUsd: 100_000, monthlyRevenueUsd: 120_000 }, "VC_BACKED");
    const sized = stressTestDecisionPlan(buildExpansionAssessment(), { planText: "Hire 3 senior engineers @ $180k", companyProfile: withCash });
    assert.match(sized.sizingNote, /is 39% of \$1\.4M cash on hand/);
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

  it("does not read a bare role noun as a hire", () => {
    // "lead" and "principal" claimed both of these as hires, ahead of the pricing check.
    const leadTime = stressTestDecisionPlan(buildExpansionAssessment(), {
      planText: "Reduce sales lead time with a pricing discount",
    });
    assert.equal(leadTime.detectedCategory, "PRICING");
    assert.equal(leadTime.detectionConfidence, "MATCHED");

    const loan = stressTestDecisionPlan(buildExpansionAssessment(), {
      planText: "Repay 20% of loan principal",
    });
    assert.equal(loan.detectionConfidence, "ASSUMED");

    const starter = stressTestDecisionPlan(buildExpansionAssessment(), {
      planText: "Hire 1 principal architect at $240k during competitor freeze",
    });
    assert.equal(starter.detectedCategory, "HIRING");
    assert.equal(starter.detectionConfidence, "MATCHED");
  });

  it("reads recruit and numbered add/open as hiring, without claiming a bare office", () => {
    // The role-noun removal dropped "recruit", which is unambiguous; "add"/"open"
    // need a number, so "open a London office" stays an office, not a hire.
    const recruit = stressTestDecisionPlan(buildExpansionAssessment(), {
      planText: "Recruit 1 principal architect to rebuild our architecture",
    });
    assert.equal(recruit.detectedCategory, "HIRING");
    assert.equal(recruit.detectionConfidence, "MATCHED");

    const add = stressTestDecisionPlan(buildExpansionAssessment(), {
      planText: "Add 3 engineers to the platform team",
    });
    assert.equal(add.detectedCategory, "HIRING");

    const open = stressTestDecisionPlan(buildExpansionAssessment(), {
      planText: "open a London office",
    });
    assert.notEqual(open.detectedCategory, "HIRING");
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

  it("does not shrink a monthly commitment by a hyphenated runway aside", () => {
    // "9-month" here modifies runway, not the commitment: the $10k/mo runs a
    // full year, not 9 months.
    const result = stressTestDecisionPlan(buildExpansionAssessment(), {
      planText: "Pay $10k/mo while maintaining a 9-month runway",
      companyProfile: cashProfile,
    });
    assert.equal(result.commitment.annualUsd, 120_000);
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

describe("stress test — the fallback assumption matches the scores", () => {
  const tight: RegimeAssessment = {
    ...buildExpansionAssessment(),
    regime: "DEFENSIVE",
    scores: { tightness: 80, riskAppetite: 35, baseRateUsed: "1M", baseRate: 5.25, curveSlope: 0.2 },
  };

  it("does not call funding loose for a bootstrapped plan with no margin entered", () => {
    const result = stressTestDecisionPlan(tight, {
      planText: "hire 2 engineers",
      companyProfile: { runwayMonths: 18, businessModel: "BOOTSTRAPPED" },
    });
    assert.ok(!result.fragileAssumptions.some((a) => a.includes("Funding is loose")));
    assert.deepEqual(result.fragileAssumptions, [
      "Assumes customer revenue keeps paying for this: funding is tight now, so a shortfall would be costly to raise.",
    ]);
  });

  it("keeps the loose-funding line when the scores are loose", () => {
    const result = stressTestDecisionPlan(buildExpansionAssessment(), {
      planText: "hire 2 engineers",
      companyProfile: { runwayMonths: 18, businessModel: "BOOTSTRAPPED" },
    });
    assert.deepEqual(result.fragileAssumptions, [
      "Funding is loose now; watch for the short-term borrowing rate moving above 3.20%.",
    ]);
  });
});

describe("compare — the one-click templates grade what they say", () => {
  // The strings are the templates in `decisionShieldPlanModes.tsx`.
  it("prefers the monthly flex plan to the annual prepay when pricing starts RISKY", () => {
    const defensive: RegimeAssessment = {
      ...buildExpansionAssessment(),
      regime: "DEFENSIVE",
      scores: { tightness: 75, riskAppetite: 60, baseRateUsed: "1M", baseRate: 5.25, curveSlope: 0.2 },
    };
    const result = compareDecisionPlans(
      defensive,
      "Prepay annual SaaS vendor for $60k upfront to lock in 25% discount",
      "Pay SaaS vendor $6k monthly on flexible rolling terms",
    );
    assert.equal(result.planA.verdict, "RISKY");
    assert.equal(result.planB.verdict, "SAFE");
    assert.equal(result.preferredPlan, "B");
  });

  it("sizes the hire at $400k and the contractor at $45k", () => {
    const result = compareDecisionPlans(
      buildExpansionAssessment(),
      "Hire 2 full-time senior engineers at $200k each",
      "Engage 1 specialized contractor for 3 months at $15k/mo",
      { cashBalanceUsd: 500_000 },
    );
    assert.equal(result.planA.commitment.annualUsd, 400_000);
    assert.equal(result.planB.commitment.annualUsd, 45_000);
    assert.equal(result.planA.verdict, "DANGEROUS");
    assert.equal(result.preferredPlan, "B");
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
    assert.match(shared, /Restart when/);
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
