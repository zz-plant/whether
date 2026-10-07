import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as nextNavigation from "next/navigation";

const mockAny: any = mock;
let mockSearchParams = new URLSearchParams();
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  usePathname: () => "/operate",
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({
    push: () => {},
    replace: () => {},
    prefetch: () => {},
  }),
}));

import { DecisionShieldPresetsSection } from "../app/operate/components/decisionShieldPresetsSection";
import { DecisionShieldPanel } from "../app/operate/components/decisionShieldPanel";
import type { RegimeAssessment } from "../lib/regimeEngine";

const sampleAssessment: RegimeAssessment = {
  regime: "DEFENSIVE",
  scores: {
    tightness: 75,
    riskAppetite: 35,
    baseRateUsed: "1M",
    baseRate: 5.25,
    curveSlope: -0.15,
  },
  diagnostics: {
    tightnessVsThreshold: 5,
    riskAppetiteVsThreshold: -15,
    nearestThresholdDelta: 5,
    confidence: "HIGH",
    transitionWatch: false,
    intensity: "STANDARD",
    boundaryContributors: [],
    weakReadCount: 0,
    twoWeakReadsWarning: false,
  },
  description: "Defensive posture",
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

describe("DecisionShieldPresetsSection markup", () => {
  it("renders empty preset state when no presets are saved", () => {
    const markup = renderToStaticMarkup(
      createElement(DecisionShieldPresetsSection, {
        currentSelection: {
          lifecycle: "GROWTH",
          category: "HIRING",
          action: "HIRE",
        },
        onApplyPreset: () => {},
      })
    );

    assert.ok(markup.includes("Saved scenarios"));
    assert.ok(markup.includes("Max 8 presets"));
    assert.ok(markup.includes("No presets yet. Save one to come back to this decision."));
    assert.ok(markup.includes("Or load a starter scenario:"));
    assert.ok(markup.includes("Procurement: Vendor discount vs yield"));
    assert.ok(markup.includes("Engineering: Tech debt refactor window"));
    assert.ok(markup.includes("Talent: Strategic senior hire"));
    assert.ok(markup.includes("Capital: Discretionary spend control"));
    assert.ok(markup.includes("Save preset"));
  });
});

import { Toast } from "@base-ui/react/toast";
import { PlanStressTestMode, ComparePlansMode } from "../app/operate/components/decisionShieldPlanModes";
import { companyFinancialProfileFor, stressTestDecisionPlan, compareDecisionPlans } from "../lib/decisionShield";
import { EMPTY_OPERATOR_PROFILE } from "../lib/operatorProfile";

describe("DecisionShieldPlanModes markup", () => {
  /* Compact until used (2026-10-07): the step opened on runway, spend, model, a
     three-line box and a verdict panel announcing there was no verdict. Before a
     plan is typed it is one field and the examples; the figures and the verdict
     join once there is something to grade. This replaces a pin on the
     "Plan stress test" heading, which the mode switch above already names. */
  it("opens as one field and the examples, with no figures and no empty verdict", () => {
    const stressResult = stressTestDecisionPlan(sampleAssessment, { planText: "" });
    const markup = renderToStaticMarkup(
      createElement(PlanStressTestMode, {
        planText: "",
        setPlanText: () => {},
        planReady: false,
        profile: EMPTY_OPERATOR_PROFILE,
        setProfileField: () => {},
        businessModel: "VC_BACKED",
        setBusinessModel: () => {},
        stressTestResult: stressResult,
      })
    );

    assert.ok(markup.includes("id=\"decision-shield-plan-input\""));
    assert.ok(markup.includes("Try an example:"));
    assert.ok(markup.includes("Vendor prepay vs. yield"));
    assert.ok(markup.includes("Senior talent sniping"));
    assert.ok(markup.includes("Sprint tech debt refactor"));
    assert.ok(markup.includes("Flexible contract terms"));
    // The examples are controls with the 44px floor, not 20px chips.
    assert.equal((markup.match(/class="weather-pill /g) ?? []).length, 4);
    assert.ok(!markup.includes("Runway (months)"), "the figures wait for a plan");
    assert.ok(!markup.includes("decision-shield-model"), "the model select waits for a plan");
    assert.ok(!markup.includes("Decision verdict"), "no verdict panel before there is a plan to grade");
    assert.ok(markup.includes("aria-live=\"polite\""), "the live region is mounted before the verdict arrives");
  });

  it("adds the figures and the verdict once a plan is typed", () => {
    const planText = "Hire 3 senior engineers @ $180k";
    const stressResult = stressTestDecisionPlan(sampleAssessment, { planText });
    const markup = renderToStaticMarkup(
      createElement(PlanStressTestMode, {
        planText,
        setPlanText: () => {},
        planReady: true,
        profile: EMPTY_OPERATOR_PROFILE,
        setProfileField: () => {},
        businessModel: "VC_BACKED",
        setBusinessModel: () => {},
        stressTestResult: stressResult,
      })
    );

    assert.ok(markup.includes("Runway (months)"));
    assert.ok(markup.includes("decision-shield-model"));
    assert.ok(markup.includes("Decision verdict"));
    // The sizing note names the spend box by its label, and says what revenue does to the sizing.
    assert.ok(markup.includes("Runway and monthly spend are optional"));
    assert.ok(!markup.includes("Runway and burn"));
    // The plan comes before the figures that size it.
    assert.ok(markup.indexOf("decision-shield-plan-input") < markup.indexOf("Runway (months)"));
  });

  it("says revenue covers spending, in the box and the sizing line, when runway and spend are both filled", () => {
    const profile = { version: 1 as const, runwayMonths: 14, monthlyBurnUsd: 100_000, monthlyRevenueUsd: 120_000 };
    const planText = "Hire 3 senior engineers @ $180k";
    const stressResult = stressTestDecisionPlan(sampleAssessment, {
      planText,
      companyProfile: companyFinancialProfileFor(profile, "VC_BACKED"),
    });
    const markup = renderToStaticMarkup(
      createElement(PlanStressTestMode, {
        planText,
        setPlanText: () => {},
        planReady: true,
        profile,
        setProfileField: () => {},
        businessModel: "VC_BACKED",
        setBusinessModel: () => {},
        stressTestResult: stressResult,
      })
    );
    assert.ok(markup.includes("Revenue covers your spending, so no runway is counting down."));
    assert.ok(markup.includes("Revenue covers your spending, so there is no burn to size it against"));
    assert.ok(!markup.includes("needs your cash or monthly burn"));
  });

  it("renders comparison templates in ComparePlansMode", () => {
    const cmpResult = compareDecisionPlans(sampleAssessment, "", "");
    const markup = renderToStaticMarkup(
      createElement(ComparePlansMode, {
        planText: "",
        setPlanText: () => {},
        planBText: "",
        setPlanBText: () => {},
        planReady: false,
        comparisonReady: false,
        comparisonResult: cmpResult,
      })
    );

    // No "Compare two plans" heading: the mode switch above it carries that name.
    assert.ok(markup.includes("Describe two plans."));
    assert.ok(markup.includes("Compare common tradeoffs:"));
    assert.ok(markup.includes("Vendor Prepay vs. Monthly Flex"));
    assert.ok(markup.includes("Full-Time Hire vs. Contractor"));
    assert.ok(markup.includes("Speculative Feature vs. Tech Debt"));
    // Nothing typed, so no recommendation box asking for both plans.
    assert.ok(!markup.includes("Describe both plans to compare them."));
  });
});

describe("DecisionShieldPanel markup", () => {
  it("opens on the mode switch and one field, with nothing to copy yet", () => {
    const markup = renderToStaticMarkup(
      createElement(
        Toast.Provider,
        null,
        createElement(DecisionShieldPanel, {
          assessment: sampleAssessment,
          recordDate: "2026-09-25",
        })
      )
    );

    assert.ok(markup.includes("id=\"decision-shield\""));
    // The step around it asks the question; the panel no longer asks it again.
    assert.ok(!markup.includes("Is this move safe right now?"));
    assert.ok(markup.includes("Describe a plan"));
    assert.ok(markup.includes("Compare two plans"));
    assert.ok(markup.includes("Pick from a list"));
    /* Before 2026-10-07 the row was always drawn, so Copy verdict on an empty box
       copied the list mode's default verdict, one the reader never saw. */
    assert.ok(!markup.includes("Decision verdict"));
    assert.ok(!markup.includes("Copy verdict"), "no verdict, so nothing to copy");
    assert.ok(!markup.includes("Copy link"));
    assert.ok(!markup.includes("Saved scenarios"), "dropdown presets section should not render in plan mode");
  });

  it("puts the copy and record actions after the verdict they act on", () => {
    mockSearchParams = new URLSearchParams({ planMode: "natural_language", plan: "Hire 2 staff engineers at $250k salary" });
    try {
      const markup = renderToStaticMarkup(
        createElement(
          Toast.Provider,
          null,
          createElement(DecisionShieldPanel, {
            assessment: sampleAssessment,
            recordDate: "2026-09-25",
          })
        )
      );
      assert.ok(markup.includes("Copy verdict"));
      assert.ok(markup.includes("Copy link"));
      assert.ok(markup.indexOf("Decision verdict") < markup.indexOf("Copy verdict"), "the verdict comes before the copy action");
    } finally {
      mockSearchParams = new URLSearchParams();
    }
  });

  describe("opened from a copied plan link", () => {
    afterEach(() => {
      mockSearchParams = new URLSearchParams();
    });

    const renderPanel = () =>
      renderToStaticMarkup(
        createElement(
          Toast.Provider,
          null,
          createElement(DecisionShieldPanel, {
            assessment: sampleAssessment,
            recordDate: "2026-09-25",
          })
        )
      );

    it("opens on the plan text and mode the link carries", () => {
      mockSearchParams = new URLSearchParams({
        planMode: "natural_language",
        plan: "Hire 2 staff engineers at $250k salary",
      });

      const markup = renderPanel();
      assert.ok(markup.includes("Hire 2 staff engineers at $250k salary"));
      assert.ok(markup.includes("Decision verdict"));
    });

    it("opens a dropdown link in dropdown mode rather than the plan box", () => {
      mockSearchParams = new URLSearchParams({ planMode: "dropdown" });

      const markup = renderPanel();
      assert.ok(markup.includes("Saved scenarios"), "dropdown presets render in dropdown mode");
    });
  });
});

