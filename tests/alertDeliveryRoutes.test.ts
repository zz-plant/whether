import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { resetServerStoreForTests } from "../lib/serverStore";
import { DEFAULT_THRESHOLDS, type RegimeAssessment } from "../lib/regimeEngine";
import type { SignalAlertPayload } from "../lib/signalOps";
import { POST as postRegimeAlert } from "../app/api/regime-alerts/route";
import {
  GET as getAlertPreferences,
  POST as postAlertPreferences,
} from "../app/api/alert-preferences/route";
import {
  GET as getAlertDeliveries,
  POST as postAlertDeliveries,
} from "../app/api/alert-deliveries/route";

const buildAssessment = (regime: RegimeAssessment["regime"]): RegimeAssessment => ({
  regime,
  constraints: [],
  dataWarnings: [],
  description: "",
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
  riskAppetiteExplanation: "",
  tightnessExplanation: "",
  thresholds: DEFAULT_THRESHOLDS,
  diagnostics: {
    tightnessDelta: 0,
    riskAppetiteDelta: 0,
    nearestThresholdDelta: 0,
    confidence: "MEDIUM",
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
    tightness: 70,
    riskAppetite: 50,
  },
});

const payload: SignalAlertPayload = {
  previousRecordDate: "2026-02-01",
  currentRecordDate: "2026-02-08",
  previousAssessment: buildAssessment("DEFENSIVE"),
  currentAssessment: buildAssessment("SCARCITY"),
  reasons: [{ code: "regime-change", message: "Regime changed." }],
  sourceUrls: ["https://example.com/source"],
  timeMachineHref: "/signals#time-machine",
};

const envBackup = {
  backend: process.env.WHETHER_SERVER_STORE_BACKEND,
};

beforeEach(() => {
  process.env.WHETHER_SERVER_STORE_BACKEND = "memory";
  resetServerStoreForTests();
});

afterEach(() => {
  if (envBackup.backend === undefined) {
    delete process.env.WHETHER_SERVER_STORE_BACKEND;
  } else {
    process.env.WHETHER_SERVER_STORE_BACKEND = envBackup.backend;
  }
  resetServerStoreForTests();
});

describe("alert preference and delivery routes", () => {
  it("stores preferences and emits delivery events", async () => {
    const createdAlertResponse = await postRegimeAlert(
      new Request("https://whether.test/api/regime-alerts", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
    const createdAlertBody = await createdAlertResponse.json();
    const alertId = createdAlertBody.alert?.id as string;
    assert.equal(typeof alertId, "string");

    const initialPreferences = await getAlertPreferences(
      new Request("https://whether.test/api/alert-preferences?clientId=test-client"),
    );
    const initialPreferencesBody = await initialPreferences.json();
    assert.deepEqual(initialPreferencesBody.preferences, {
      slack: true,
      email: true,
      webhook: false,
    });

    const updatedPreferences = await postAlertPreferences(
      new Request("https://whether.test/api/alert-preferences", {
        method: "POST",
        body: JSON.stringify({
          clientId: "test-client",
          preferences: { slack: true, email: false, webhook: true },
        }),
      }),
    );
    assert.equal(updatedPreferences.status, 200);

    const updatedPreferencesBody = await updatedPreferences.json();
    assert.deepEqual(updatedPreferencesBody.preferences, {
      slack: true,
      email: false,
      webhook: true,
    });

    const deliveryResponse = await postAlertDeliveries(
      new Request("https://whether.test/api/alert-deliveries", {
        method: "POST",
        body: JSON.stringify({
          clientId: "test-client",
          alertId,
        }),
      }),
    );
    assert.equal(deliveryResponse.status, 200);
    const deliveryBody = await deliveryResponse.json();
    assert.equal(Array.isArray(deliveryBody.created), true);
    assert.equal(deliveryBody.created.length, 3);
    assert.equal(
      deliveryBody.created.some(
        (event: { channel: string; status: string }) =>
          event.channel === "email" && event.status === "skipped",
      ),
      true,
    );

    const deliveriesResponse = await getAlertDeliveries();
    const deliveriesBody = await deliveriesResponse.json();
    assert.equal(Array.isArray(deliveriesBody.deliveries), true);
    assert.equal(deliveriesBody.deliveries.length >= 3, true);
  });
});
