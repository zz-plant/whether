import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const mockAny: any = mock;
mockAny.module("next/navigation", () => ({
  usePathname: () => "/operate",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: () => {},
    replace: () => {},
    prefetch: () => {},
  }),
}));

import { DecisionShieldPresetsSection } from "../app/operate/components/decisionShieldPresetsSection";
import { DecisionShieldPanel } from "../app/operate/components/decisionShieldPanel";
import type { RegimeAssessment } from "../lib/regimeEngine";
import type { DataProvenance } from "../app/components/dataProvenanceStrip";

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

const sampleProvenance: DataProvenance = {
  sourceLabel: "FRED + Treasury",
  recordDateLabel: "2026-09-25",
  timestampLabel: "2026-09-25T12:00:00Z",
  ageLabel: "fresh",
  statusLabel: "Live (high confidence)",
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
    assert.ok(markup.includes("Save preset"));
  });
});

import { Toast } from "@base-ui/react/toast";

describe("DecisionShieldPanel markup", () => {
  it("renders the decision shield panel with mode switcher and copy controls", () => {
    const markup = renderToStaticMarkup(
      createElement(
        Toast.Provider,
        null,
        createElement(DecisionShieldPanel, {
          assessment: sampleAssessment,
          provenance: sampleProvenance,
          recordDate: "2026-09-25",
        })
      )
    );

    assert.ok(markup.includes("id=\"decision-shield\""));
    assert.ok(markup.includes("Is this move safe right now?"));
    assert.ok(markup.includes("Copy verdict"));
    assert.ok(markup.includes("Copy link"));
    assert.ok(markup.includes("Describe a plan"));
    assert.ok(markup.includes("Compare two plans"));
    assert.ok(markup.includes("Pick from a list"));
    assert.ok(markup.includes("Decision verdict"));
  });
});

