import assert from "node:assert/strict";
import { beforeEach, describe, it } from "bun:test";
import { GET as getDecisionMemoryRoute, POST as postDecisionMemoryRoute } from "../app/api/decision-memory/route";
import { GET as getAlertPreferencesRoute, POST as postAlertPreferencesRoute } from "../app/api/alert-preferences/route";
import { GET as getAlertDeliveriesRoute, POST as postAlertDeliveriesRoute } from "../app/api/alert-deliveries/route";
import { DEFAULT_THRESHOLDS } from "../lib/regimeEngine";
import { resetDecisionMemoryRepository } from "../lib/storage/decisionMemoryRepository";
import { resetAlertPreferenceRepository } from "../lib/storage/alertPreferenceRepository";
import { getRegimeAlertRepository, resetRegimeAlertRepository } from "../lib/storage/regimeAlertRepository";
import type { RegimeAlertEvent } from "../lib/signalOps";

describe("decision memory and alert routes", () => {
  beforeEach(() => {
    resetDecisionMemoryRepository();
    resetAlertPreferenceRepository();
    resetRegimeAlertRepository();
  });

  it("creates and lists decision memory entries, including csv export", async () => {
    const postRequest = new Request("http://localhost/api/decision-memory", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientId: "client-a",
        recordDate: "2026-02-16",
        decision: { lifecycle: "GROWTH", category: "HIRING", action: "HIRE" },
        outcome: {
          verdict: "RISKY",
          summary: "Hiring remains constrained.",
          guardrail: "Require revenue-backed roles first.",
          reversalTrigger: "tightness drops below 70",
        },
        assessment: {
          regime: "DEFENSIVE",
          scores: {
            tightness: 72,
            riskAppetite: 52,
            baseRate: 5.2,
            curveSlope: 0.2,
            baseRateUsed: "1M",
          },
          thresholds: DEFAULT_THRESHOLDS,
          inputs: [],
        },
      }),
    });

    const postResponse = await postDecisionMemoryRoute(postRequest);
    assert.equal(postResponse.status, 200);
    const postBody = (await postResponse.json()) as { count: number; created?: boolean };
    assert.equal(postBody.created, true);
    assert.equal(postBody.count, 1);

    const getResponse = await getDecisionMemoryRoute(new Request("http://localhost/api/decision-memory"));
    assert.equal(getResponse.status, 200);
    const getBody = (await getResponse.json()) as { entries: unknown[]; count: number };
    assert.equal(getBody.count, 1);
    assert.equal(getBody.entries.length, 1);

    const filteredResponse = await getDecisionMemoryRoute(
      new Request("http://localhost/api/decision-memory?clientId=client-a"),
    );
    assert.equal(filteredResponse.status, 200);
    const filteredBody = (await filteredResponse.json()) as { entries: Array<{ context: { clientId: string } }>; count: number };
    assert.equal(filteredBody.count, 1);
    assert.equal(filteredBody.entries[0]?.context.clientId, "client-a");

    const csvResponse = await getDecisionMemoryRoute(new Request("http://localhost/api/decision-memory?format=csv"));
    assert.equal(csvResponse.status, 200);
    assert.equal(csvResponse.headers.get("content-type"), "text/csv; charset=utf-8");
    const csvBody = await csvResponse.text();
    assert.match(csvBody, /"recordDate"/);
  });

  it("rejects invalid decision memory payload", async () => {
    const response = await postDecisionMemoryRoute(
      new Request("http://localhost/api/decision-memory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recordDate: "2026-02-16" }),
      }),
    );

    assert.equal(response.status, 400);
    const body = (await response.json()) as { error?: string };
    assert.equal(body.error, "invalid-payload");
  });

  it("gets and upserts alert preferences", async () => {
    const initial = await getAlertPreferencesRoute(new Request("http://localhost/api/alert-preferences?clientId=abc"));
    assert.equal(initial.status, 200);
    const initialBody = (await initial.json()) as { preferences: { slack: boolean } };
    assert.equal(initialBody.preferences.slack, true);

    const post = await postAlertPreferencesRoute(
      new Request("http://localhost/api/alert-preferences", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: "abc",
          preferences: { slack: false, email: true, webhook: true },
        }),
      }),
    );

    assert.equal(post.status, 200);
    const postBody = (await post.json()) as { preferences: { slack: boolean; webhook: boolean } };
    assert.equal(postBody.preferences.slack, false);
    assert.equal(postBody.preferences.webhook, true);
  });

  it("rejects invalid alert preferences payload", async () => {
    const response = await postAlertPreferencesRoute(
      new Request("http://localhost/api/alert-preferences", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId: "abc", preferences: { slack: true } }),
      }),
    );

    assert.equal(response.status, 400);
    const body = (await response.json()) as { error?: string };
    assert.equal(body.error, "invalid-payload");
  });

  it("creates and lists alert deliveries", async () => {
    const repository = getRegimeAlertRepository();
    const alert: RegimeAlertEvent = {
      eventId: "alert-event",
      sourceVersion: "v1",
      canonicalTimestampSource: "request-received-at",
      id: "alert-1",
      createdAt: "2026-02-16T00:00:00.000Z",
      payload: {
        previousRecordDate: "2026-02-09",
        currentRecordDate: "2026-02-16",
        previousAssessment: { regime: "DEFENSIVE" } as RegimeAlertEvent["payload"]["previousAssessment"],
        currentAssessment: { regime: "SCARCITY" } as RegimeAlertEvent["payload"]["currentAssessment"],
        reasons: [{ code: "risk", message: "risk moved" }],
        decisionDeltas: [],
        triggerStates: {},
        sourceUrls: [],
        timeMachineHref: "/",
      },
    };
    await repository.appendAlert(alert);

    const post = await postAlertDeliveriesRoute(
      new Request("http://localhost/api/alert-deliveries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId: "abc", alertId: "alert-1" }),
      }),
    );

    assert.equal(post.status, 200);
    const postBody = (await post.json()) as { deliveries: Array<{ status: string; clientId: string }>; clientId: string };
    assert.equal(postBody.deliveries.length, 3);
    assert.equal(postBody.clientId, "abc");
    assert.ok(postBody.deliveries.every((delivery) => delivery.clientId === "abc"));

    const secondPost = await postAlertDeliveriesRoute(
      new Request("http://localhost/api/alert-deliveries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId: "other-client", alertId: "alert-1" }),
      }),
    );
    assert.equal(secondPost.status, 200);

    const get = await getAlertDeliveriesRoute(new Request("http://localhost/api/alert-deliveries?clientId=abc"));
    assert.equal(get.status, 200);
    const getBody = (await get.json()) as { deliveries: Array<{ clientId: string }>; count: number; clientId: string | null };
    assert.equal(getBody.deliveries.length, 3);
    assert.equal(getBody.count, 3);
    assert.equal(getBody.clientId, "abc");
    assert.ok(getBody.deliveries.every((delivery) => delivery.clientId === "abc"));
  });

  it("rejects invalid alert deliveries payload", async () => {
    const response = await postAlertDeliveriesRoute(
      new Request("http://localhost/api/alert-deliveries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId: "abc" }),
      }),
    );

    assert.equal(response.status, 400);
    const body = (await response.json()) as { error?: string };
    assert.equal(body.error, "invalid-payload");
  });
});
