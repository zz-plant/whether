import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { resetServerStoreForTests } from "../lib/serverStore";
import { DEFAULT_THRESHOLDS, type RegimeAssessment } from "../lib/regimeEngine";
import type { SignalAlertPayload } from "../lib/signalOps";

const assessment = (
  regime: RegimeAssessment["regime"],
  tightness: number,
  riskAppetite: number
): RegimeAssessment => ({
  regime,
  constraints: [],
  dataWarnings: [],
  description: "",
  inputs: [],
  policyAssessment: {
    version: "policy-v1",
    normalizations: [],
    composites: {
      cts: 0,
      ras: 0,
    },
    posture: "TRANSITION",
    band: "NEUTRAL",
    confidenceIndex: {
      agreement: 0,
      distanceFromNeutral: 0,
      volatility30d: 0,
    },
    refusal: {
      refused: false,
      reasons: [],
    },
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
    tightnessDelta: tightness - DEFAULT_THRESHOLDS.tightnessRegime,
    riskAppetiteDelta: riskAppetite - DEFAULT_THRESHOLDS.riskAppetiteRegime,
    nearestThresholdDelta: Math.min(
      Math.abs(tightness - DEFAULT_THRESHOLDS.tightnessRegime),
      Math.abs(riskAppetite - DEFAULT_THRESHOLDS.riskAppetiteRegime)
    ),
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
    tightness,
    riskAppetite,
  },
});

const buildPayload = (): SignalAlertPayload => ({
  previousRecordDate: "2026-01-01",
  currentRecordDate: "2026-01-08",
  previousAssessment: assessment("DEFENSIVE", 80, 55),
  currentAssessment: assessment("SCARCITY", 82, 44),
  reasons: [{ code: "regime-change", message: "Regime shifted." }],
  sourceUrls: ["https://example.com"],
  timeMachineHref: "/signals#time-machine",
});

const envBackup = {
  backend: process.env.WHETHER_SERVER_STORE_BACKEND,
  file: process.env.WHETHER_SERVER_STORE_FILE,
};

const loadRoutes = async () => {
  const regimeAlertsRoute = await import("../app/api/regime-alerts/route");
  const weeklyDigestRoute = await import("../app/api/weekly-digest/route");
  return { regimeAlertsRoute, weeklyDigestRoute };
};

let tempDir = "";

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "whether-server-store-"));
  process.env.WHETHER_SERVER_STORE_BACKEND = "file";
  process.env.WHETHER_SERVER_STORE_FILE = join(tempDir, "store.json");
  resetServerStoreForTests();
});

afterEach(() => {
  if (envBackup.backend === undefined) {
    delete process.env.WHETHER_SERVER_STORE_BACKEND;
  } else {
    process.env.WHETHER_SERVER_STORE_BACKEND = envBackup.backend;
  }

  if (envBackup.file === undefined) {
    delete process.env.WHETHER_SERVER_STORE_FILE;
  } else {
    process.env.WHETHER_SERVER_STORE_FILE = envBackup.file;
  }

  resetServerStoreForTests();
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
    tempDir = "";
  }
});

describe("signal ops API persistence", () => {
  it("keeps /api/regime-alerts contract stable", async () => {
    const { regimeAlertsRoute } = await loadRoutes();

    const initialResponse = await regimeAlertsRoute.GET();
    assert.equal(initialResponse.status, 200);
    const initialBody = await initialResponse.json();
    assert.deepEqual(initialBody, { alerts: [] });

    const createResponse = await regimeAlertsRoute.POST(
      new Request("https://whether.test/api/regime-alerts", {
        method: "POST",
        body: JSON.stringify(buildPayload()),
      })
    );
    assert.equal(createResponse.status, 200);

    const createdBody = await createResponse.json();
    assert.equal(createdBody.created, true);
    assert.equal(typeof createdBody.alert?.id, "string");
    assert.equal(typeof createdBody.alert?.createdAt, "string");
    assert.equal(createdBody.alerts.length, 1);

    const duplicateResponse = await regimeAlertsRoute.POST(
      new Request("https://whether.test/api/regime-alerts", {
        method: "POST",
        body: JSON.stringify(buildPayload()),
      })
    );
    assert.equal(duplicateResponse.status, 200);

    const duplicateBody = await duplicateResponse.json();
    assert.equal(duplicateBody.created, false);
    assert.equal(duplicateBody.alerts.length, 1);
  });

  it("persists alerts across store reinitialization and serves weekly digest", async () => {
    const { regimeAlertsRoute, weeklyDigestRoute } = await loadRoutes();

    const createResponse = await regimeAlertsRoute.POST(
      new Request("https://whether.test/api/regime-alerts", {
        method: "POST",
        body: JSON.stringify(buildPayload()),
      })
    );
    assert.equal(createResponse.status, 200);

    // Simulate a cold start by clearing singleton state and adapter cache.
    resetServerStoreForTests();

    const alertsResponse = await regimeAlertsRoute.GET();
    assert.equal(alertsResponse.status, 200);
    const alertsBody = await alertsResponse.json();
    assert.equal(alertsBody.alerts.length, 1);

    const digestResponse = await weeklyDigestRoute.GET();
    assert.equal(digestResponse.status, 200);
    const digestBody = await digestResponse.json();

    assert.equal(typeof digestBody.generatedAt, "string");
    assert.equal(typeof digestBody.digest.summary, "string");
    assert.ok(Array.isArray(digestBody.digest.bullets));
    assert.equal(digestBody.alertCount, 1);
    assert.equal(digestBody.deliveryCount, 0);
  });
});
