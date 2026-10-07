import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildDeliverySummary,
  buildSignalAlertPayload,
  buildWeeklyDigest,
  shouldCreateSignalAlert,
  type RegimeAlertEvent,
  type SignalAlertInputPayload,
} from "../lib/signalOps";
import { DEFAULT_THRESHOLDS, type RegimeAssessment } from "../lib/regimeEngine";
import { buildDecisionDeltaRules, buildDecisionVerdictHeadline } from "../lib/alert/decisionDeltaRules";

const assessment = (
  regime: RegimeAssessment["regime"],
  tightness: number,
  riskAppetite: number,
  confidence: RegimeAssessment["diagnostics"]["confidence"] = "MEDIUM",
): RegimeAssessment => ({
  regime,
  regimeTransition: {
    nextState: regime,
    candidateState: regime,
    committed: true,
    pending: false,
    transitionReason: "",
    transitionPendingCount: 0,
    snapshot: {
      committedState: regime,
      pendingState: null,
      pendingCount: 0,
      lastSignals: { tightness, riskAppetite },
    },
  },
  constraints: [],
  dataWarnings: [],
  description: "",
  inputs: [],
  riskAppetiteExplanation: "",
  tightnessExplanation: "",
  thresholds: DEFAULT_THRESHOLDS,
  diagnostics: {
    tightnessVsThreshold: tightness - DEFAULT_THRESHOLDS.tightnessRegime,
    riskAppetiteVsThreshold: riskAppetite - DEFAULT_THRESHOLDS.riskAppetiteRegime,
    nearestThresholdDelta: Math.min(
      Math.abs(tightness - DEFAULT_THRESHOLDS.tightnessRegime),
      Math.abs(riskAppetite - DEFAULT_THRESHOLDS.riskAppetiteRegime),
    ),
    confidence,
    transitionWatch: false,
    intensity: "STANDARD",
    boundaryContributors: [],
    weakReadCount: 0,
    twoWeakReadsWarning: false,
  },
  scores: {
    baseRate: 5,
    baseRateUsed: "1M",
    curveSlope: -0.1,
    tightness,
    riskAppetite,
  },
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
});

const basePayload = (
  previousAssessment: RegimeAssessment,
  currentAssessment: RegimeAssessment,
): SignalAlertInputPayload => ({
  previousRecordDate: "2026-01-01",
  currentRecordDate: "2026-01-08",
  previousAssessment,
  currentAssessment,
  sourceUrls: ["https://example.com"],
  timeMachineHref: "/evidence?advanced=1#time-machine",
});

describe("signalOps", () => {
  it("emits alert payload on threshold crossing with explicit decision delta", () => {
    const payload = buildSignalAlertPayload(
      basePayload(assessment("DEFENSIVE", 68, 55), assessment("SCARCITY", 88, 44)),
    );

    assert.ok(payload.decisionDeltas.some((delta) => delta.code === "tightness-upshift"));
    assert.equal(shouldCreateSignalAlert(payload), true);
  });

  it("suppresses alerts when no threshold crossing happened", () => {
    const payload = buildSignalAlertPayload(
      basePayload(assessment("DEFENSIVE", 66, 54), assessment("DEFENSIVE", 68, 53)),
    );

    assert.equal(payload.decisionDeltas.length, 0);
    assert.equal(shouldCreateSignalAlert(payload), false);
  });

  it("suppresses jittering unsustained non-severe crossings", () => {
    const first = buildSignalAlertPayload(
      basePayload(assessment("DEFENSIVE", 75, 54), assessment("DEFENSIVE", 77, 54)),
    );
    assert.ok(first.decisionDeltas.some((delta) => delta.code === "tightness-upshift"));
    assert.equal(shouldCreateSignalAlert(first), false);

    const latest: RegimeAlertEvent = {
      eventId: "evt-1",
      sourceVersion: "test",
      canonicalTimestampSource: "request-received-at",
      id: "1",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      payload: {
        ...first,
        decisionDeltas: [
          {
            code: "tightness-upshift",
            decisionArea: "spend",
            actionText: "Pause new discretionary spend if funding pressure rises above 76.",
            triggerValue: 77,
            thresholdLabel: "Spending pause line",
            thresholdValue: 76,
            confidence: "MEDIUM",
            reversalText: "Resume new spend when funding pressure falls below 66 and the payback figures still hold.",
            gate: "pass",
            severe: false,
          },
        ],
        triggerStates: { "tightness-upshift": { crossed: true, sustainedPeriods: 1 } },
        reasons: [{ code: "tightness-upshift", message: "jitter" }],
      },
    };

    const jitter = buildSignalAlertPayload(
      basePayload(assessment("DEFENSIVE", 76.8, 54), assessment("DEFENSIVE", 77.2, 54)),
      latest,
    );

    assert.equal(shouldCreateSignalAlert(jitter, latest), false);
  });

  it("suppresses low-confidence deltas unless severe thresholds are exceeded", () => {
    const lowConfidence = buildSignalAlertPayload(
      basePayload(assessment("DEFENSIVE", 68, 55), assessment("DEFENSIVE", 78, 49, "LOW")),
    );
    assert.equal(lowConfidence.decisionDeltas.length, 0);

    const severeLowConfidence = buildSignalAlertPayload(
      basePayload(assessment("DEFENSIVE", 68, 55), assessment("SCARCITY", 88, 33, "LOW")),
    );
    assert.ok(severeLowConfidence.decisionDeltas.length > 0);
    assert.ok(severeLowConfidence.decisionDeltas.every((delta) => delta.gate === "downgrade"));
  });

  it("emits reversal alerts once state sustains after crossing", () => {
    const latest = buildSignalAlertPayload(
      basePayload(assessment("SCARCITY", 75, 45), assessment("SCARCITY", 76, 44)),
    );

    const latestEvent: RegimeAlertEvent = {
      eventId: "evt-2",
      sourceVersion: "test",
      canonicalTimestampSource: "request-received-at",
      id: "2",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      payload: {
        ...latest,
        decisionDeltas: [
          {
            code: "tightness-downshift",
            decisionArea: "spend",
            actionText: "Resume new spend when funding pressure falls below 66 and the payback figures still hold.",
            triggerValue: 65,
            thresholdLabel: "Spending resume line",
            thresholdValue: 66,
            confidence: "MEDIUM",
            reversalText: "Pause new discretionary spend if funding pressure rises above 76.",
            gate: "pass",
            severe: false,
          },
        ],
        triggerStates: { "tightness-downshift": { crossed: true, sustainedPeriods: 1 } },
        reasons: [{ code: "tightness-downshift", message: "prior" }],
      },
    };

    const reversalPayload = buildSignalAlertPayload(
      basePayload(assessment("SCARCITY", 68, 45), assessment("DEFENSIVE", 63, 51)),
      latestEvent,
    );

    assert.ok(reversalPayload.decisionDeltas.some((delta) => delta.code === "tightness-downshift"));
    assert.equal(shouldCreateSignalAlert(reversalPayload, latestEvent), true);
  });

  it("builds delivery summaries with structured delta codes", () => {
    const payload = buildSignalAlertPayload(
      basePayload(assessment("DEFENSIVE", 68, 55), assessment("SCARCITY", 88, 44)),
    );

    const latest: RegimeAlertEvent = {
      eventId: "evt-3",
      sourceVersion: "test",
      canonicalTimestampSource: "request-received-at",
      id: "1",
      createdAt: new Date().toISOString(),
      payload,
    };

    const summary = buildDeliverySummary(latest);
    assert.match(summary, /SCARCITY/);
    assert.match(summary, /tightness-upshift/);
  });

  /*
   * The area rules fired on the change lines and printed them as the areas'
   * lines: "Re-open spend only if funding pressure falls back to 70" (Spending
   * resumes below 66) and a hiring pause the week risk appetite crossed 50
   * (Hiring pauses below 44). And the regime change said the way out was the
   * previous conditions, when on Oct 5 risk appetite clearing 50 alone meant
   * Cloudy, not Sunny.
   */
  it("states the published area lines, and where conditions change next", () => {
    const deltas = buildDecisionDeltaRules(assessment("EXPANSION", 63, 56), assessment("SCARCITY", 90, 48));

    const spend = deltas.find((delta) => delta.code === "tightness-upshift");
    assert.equal(spend?.thresholdValue, 76);
    assert.equal(spend?.action, "Pause new discretionary spend if funding pressure rises above 76.");
    assert.equal(spend?.reversal, "Resume new spend when funding pressure falls below 66 and the payback figures still hold.");
    assert.equal(
      deltas.some((delta) => delta.decisionArea === "hiring"),
      false,
      "risk appetite fell through 50, not through Hiring's pause line at 44",
    );

    const change = deltas.find((delta) => delta.code === "regime-change");
    assert.equal(
      change?.reversal,
      "Conditions change if: Funding pressure falls 20 pts to 70 or below (90 today) or risk appetite rises 2 pts to clear 50 (48 today).",
    );

    const hiring = buildDecisionDeltaRules(assessment("SCARCITY", 90, 48), assessment("SCARCITY", 90, 43)).find(
      (delta) => delta.code === "risk-appetite-downshift",
    );
    assert.equal(hiring?.thresholdValue, 44);
    assert.match(hiring?.action ?? "", /^Pause net-new hiring if .*risk appetite falls below 44\.$/);
    assert.match(hiring?.reversal ?? "", /funding pressure falls below 66 and risk appetite is above 54/);

    for (const delta of deltas) {
      assert.doesNotMatch(`${delta.action} ${delta.reversal}`, /falls back to 70|previous conditions/);
    }
  });

  it("names the decision the alert affects in the verdict headline, not the raw signal move", () => {
    const severe = buildDecisionVerdictHeadline({ decisionArea: "spend", severe: true });
    assert.equal(severe, "RECONSIDER SPENDING");
    const watch = buildDecisionVerdictHeadline({ decisionArea: "hiring", severe: false });
    assert.equal(watch, "WATCH HIRING");
    const posture = buildDecisionVerdictHeadline({ decisionArea: "posture", severe: true });
    assert.equal(posture, "RECONSIDER THE GUIDANCE");
  });

  it("leads alert reasons and digest bullets with the decision verdict", () => {
    const payload = buildSignalAlertPayload(
      basePayload(assessment("DEFENSIVE", 68, 55), assessment("SCARCITY", 88, 44)),
    );
    assert.ok(
      payload.reasons.some((reason) => reason.message.startsWith("RECONSIDER")),
      "reason messages lead with the verdict headline",
    );

    const latest: RegimeAlertEvent = {
      eventId: "evt-4",
      sourceVersion: "test",
      canonicalTimestampSource: "request-received-at",
      id: "1",
      createdAt: new Date().toISOString(),
      payload,
    };
    const digest = buildWeeklyDigest([latest]);
    assert.ok(
      digest.bullets.some((bullet) => bullet.startsWith("RECONSIDER")),
      "digest bullets lead with the verdict headline",
    );
  });

  it("reports an alert older than the week as history, not as this week's call", () => {
    const payload = buildSignalAlertPayload(
      basePayload(assessment("EXPANSION", 49, 58), assessment("DEFENSIVE", 88, 44)),
    );
    const now = Date.parse("2026-08-21T00:00:00.000Z");
    const stale: RegimeAlertEvent = {
      eventId: "evt-stale",
      sourceVersion: "test",
      canonicalTimestampSource: "request-received-at",
      id: "1",
      createdAt: "2026-06-13T21:35:01.967Z",
      payload,
    };

    const digest = buildWeeklyDigest([stale], { now });

    // Production served "DEFENSIVE regime as of 2026-04-09" from a single June
    // alert while the live posture was EXPANSION. The digest may be quiet; it
    // must never restate a months-old crossing as the current call.
    assert.equal(digest.summary, "No regime-change alerts this week.");
    assert.ok(
      digest.bullets.some((bullet) => bullet.startsWith("Last recorded change: DEFENSIVE as of")),
      "the older crossing is still reported, labelled as history",
    );
    assert.ok(
      digest.bullets.every((bullet) => !bullet.startsWith("RECONSIDER")),
      "a stale crossing does not issue this week's verdicts",
    );
  });

  it("summarises an alert raised inside the week", () => {
    const payload = buildSignalAlertPayload(
      basePayload(assessment("EXPANSION", 49, 58), assessment("DEFENSIVE", 88, 44)),
    );
    const now = Date.parse("2026-08-21T00:00:00.000Z");
    const fresh: RegimeAlertEvent = {
      eventId: "evt-fresh",
      sourceVersion: "test",
      canonicalTimestampSource: "request-received-at",
      id: "2",
      createdAt: "2026-08-19T12:00:00.000Z",
      payload,
    };

    const digest = buildWeeklyDigest([fresh], { now });

    assert.match(digest.summary, /^DEFENSIVE regime as of /);
  });
});
