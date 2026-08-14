import assert from "node:assert/strict";
import { beforeEach, describe, it } from "bun:test";
import { GET as getDecisionMemoryRoute, POST as postDecisionMemoryRoute } from "../app/api/decision-memory/route";
import { GET as getAlertPreferencesRoute, POST as postAlertPreferencesRoute } from "../app/api/alert-preferences/route";
import { GET as getAlertDeliveriesRoute, POST as postAlertDeliveriesRoute } from "../app/api/alert-deliveries/route";
import { GET as getWeeklyDigestRoute } from "../app/api/weekly-digest/route";
import { DEFAULT_THRESHOLDS } from "../lib/regimeEngine";
import { resetDecisionMemoryRepository } from "../lib/storage/decisionMemoryRepository";
import { resetAlertPreferenceRepository } from "../lib/storage/alertPreferenceRepository";
import { getRegimeAlertRepository, resetRegimeAlertRepository } from "../lib/storage/regimeAlertRepository";
import type { AlertDeliveryEvent, RegimeAlertEvent } from "../lib/signalOps";

describe("decision memory and alert routes", () => {
  beforeEach(() => {
    resetDecisionMemoryRepository();
    resetAlertPreferenceRepository();
    resetRegimeAlertRepository();
  });

  it("creates and lists decision memory entries, including csv export", async () => {
    const postRequest = new Request("http://localhost/api/decision-memory", {
      method: "POST",
      headers: { "content-type": "application/json", "x-whether-client-id": "client-a" },
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

    const getResponse = await getDecisionMemoryRoute(new Request("http://localhost/api/decision-memory", { headers: { "x-whether-client-id": "client-a" } }));
    assert.equal(getResponse.status, 200);
    const getBody = (await getResponse.json()) as { entries: unknown[]; count: number };
    assert.equal(getBody.count, 1);
    assert.equal(getBody.entries.length, 1);

    const filteredResponse = await getDecisionMemoryRoute(
      new Request("http://localhost/api/decision-memory?clientId=client-a", { headers: { "x-whether-client-id": "client-a" } }),
    );
    assert.equal(filteredResponse.status, 200);
    const filteredBody = (await filteredResponse.json()) as { entries: Array<{ context: { clientId: string } }>; count: number };
    assert.equal(filteredBody.count, 1);
    assert.equal(filteredBody.entries[0]?.context.clientId, "client-a");

    const csvResponse = await getDecisionMemoryRoute(new Request("http://localhost/api/decision-memory?format=csv", { headers: { "x-whether-client-id": "client-a" } }));
    assert.equal(csvResponse.status, 200);
    assert.equal(csvResponse.headers.get("content-type"), "text/csv; charset=utf-8");
    const csvBody = await csvResponse.text();
    assert.match(csvBody, /"recordDate"/);
  });

  it("scopes POST response entries to the posting client", async () => {
    const payload = (clientId: string) => ({
      clientId,
      recordDate: "2026-02-16",
      decision: { lifecycle: "GROWTH", category: "HIRING", action: "HIRE" },
      outcome: {
        verdict: "RISKY",
        summary: `Hiring remains constrained for ${clientId}.`,
        guardrail: "Require revenue-backed roles first.",
        reversalTrigger: "tightness drops below 70",
      },
      assessment: {
        regime: "DEFENSIVE",
        scores: { tightness: 72, riskAppetite: 52, baseRate: 5.2, curveSlope: 0.2, baseRateUsed: "1M" },
        thresholds: DEFAULT_THRESHOLDS,
        inputs: [],
      },
    });

    await postDecisionMemoryRoute(new Request("http://localhost/api/decision-memory", {
      method: "POST", headers: { "content-type": "application/json", "x-whether-client-id": "client-a" }, body: JSON.stringify(payload("client-a")),
    }));
    const response = await postDecisionMemoryRoute(new Request("http://localhost/api/decision-memory", {
      method: "POST", headers: { "content-type": "application/json", "x-whether-client-id": "client-b" }, body: JSON.stringify(payload("client-b")),
    }));

    const body: unknown = await response.json();
    assert.ok(body && typeof body === "object");
    const entries = "entries" in body ? body.entries : null;
    const count = "count" in body ? body.count : null;
    assert.equal(count, 1);
    assert.ok(Array.isArray(entries));
    assert.equal(entries[0]?.context?.clientId, "client-b");
  });

  it("accepts the posture-snapshot payload the weekly brief button sends", async () => {
    const response = await postDecisionMemoryRoute(
      new Request("http://localhost/api/decision-memory", {
        method: "POST",
        headers: { "content-type": "application/json", "x-whether-client-id": "client-hero" },
        body: JSON.stringify({
          kind: "posture-snapshot",
          clientId: "client-hero",
          recordDate: "2026-02-16",
          regime: "DEFENSIVE",
          primaryCall: "Move carefully forward.",
          tightness: 72,
          riskAppetite: 52,
          boldnessScore: 44,
          guardrail: "tightness crosses 78",
          reversalTrigger: "tightness drops below 60",
        }),
      }),
    );

    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      created?: boolean;
      entry?: {
        kind?: string;
        decision?: unknown;
        outcome: { verdict?: string; summary: string; guardrail: string; reversalTrigger: string };
        regime: { label: string; scores: Record<string, number> };
        context: { clientId: string; recordDate: string };
      };
    };

    assert.equal(body.created, true);
    assert.equal(body.entry?.kind, "posture-snapshot");
    assert.equal(body.entry?.context.clientId, "client-hero");
    assert.equal(body.entry?.outcome.summary, "Move carefully forward.");
    assert.equal(body.entry?.outcome.guardrail, "tightness crosses 78");
    // A snapshot ran through no verdict engine, so it must not invent a decision or verdict.
    assert.equal(body.entry?.decision, undefined);
    assert.equal(body.entry?.outcome.verdict, undefined);
    // riskAppetite and boldnessScore are distinct metrics and must both survive.
    assert.equal(body.entry?.regime.scores.riskAppetite, 52);
    assert.equal(body.entry?.regime.scores.boldnessScore, 44);
    assert.equal(body.entry?.regime.scores.tightness, 72);
  });

  it("lists posture snapshots alongside decision entries and exports both to csv", async () => {
    await postDecisionMemoryRoute(new Request("http://localhost/api/decision-memory", {
      method: "POST",
      headers: { "content-type": "application/json", "x-whether-client-id": "client-mixed" },
      body: JSON.stringify({
        kind: "posture-snapshot",
        clientId: "client-mixed",
        recordDate: "2026-02-16",
        regime: "DEFENSIVE",
        primaryCall: "Move carefully forward.",
      }),
    }));
    await postDecisionMemoryRoute(new Request("http://localhost/api/decision-memory", {
      method: "POST",
      headers: { "content-type": "application/json", "x-whether-client-id": "client-mixed" },
      body: JSON.stringify({
        clientId: "client-mixed",
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
          scores: { tightness: 72, riskAppetite: 52, baseRate: 5.2, curveSlope: 0.2, baseRateUsed: "1M" },
          thresholds: DEFAULT_THRESHOLDS,
          inputs: [],
        },
      }),
    }));

    const listed = await getDecisionMemoryRoute(
      new Request("http://localhost/api/decision-memory?clientId=client-mixed", { headers: { "x-whether-client-id": "client-mixed" } }),
    );
    const listedBody = (await listed.json()) as { count: number; entries: Array<{ kind?: string }> };
    assert.equal(listedBody.count, 2);
    assert.ok(listedBody.entries.some((entry) => entry.kind === "posture-snapshot"));
    assert.ok(listedBody.entries.some((entry) => entry.kind === "decision"));

    const csvResponse = await getDecisionMemoryRoute(
      new Request("http://localhost/api/decision-memory?clientId=client-mixed&format=csv", { headers: { "x-whether-client-id": "client-mixed" } }),
    );
    assert.equal(csvResponse.status, 200);
    const csvBody = await csvResponse.text();
    assert.match(csvBody, /"kind"/);
    assert.match(csvBody, /"posture-snapshot"/);
    // The snapshot row leaves the decision triple and verdict empty rather than fabricating them.
    assert.match(csvBody, /"posture-snapshot","client-mixed","2026-02-16","DEFENSIVE","","","",""/);
  });

  it("rejects a posture snapshot missing its primary call", async () => {
    const response = await postDecisionMemoryRoute(
      new Request("http://localhost/api/decision-memory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "posture-snapshot",
          recordDate: "2026-02-16",
          regime: "DEFENSIVE",
          primaryCall: "   ",
        }),
      }),
    );

    assert.equal(response.status, 400);
    const body = (await response.json()) as { error?: string };
    assert.equal(body.error, "invalid-payload");
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

  it("rejects missing and mismatched decision-memory ownership", async () => {
    const missing = await getDecisionMemoryRoute(new Request("http://localhost/api/decision-memory?clientId=client-a"));
    assert.equal(missing.status, 401);
    const mismatch = await getDecisionMemoryRoute(new Request("http://localhost/api/decision-memory?clientId=client-a", {
      headers: { "x-whether-client-id": "client-b" },
    }));
    assert.equal(mismatch.status, 403);
  });

  it("gets and upserts alert preferences", async () => {
    const initial = await getAlertPreferencesRoute(new Request("http://localhost/api/alert-preferences?clientId=abc", { headers: { "x-whether-client-id": "abc" } }));
    assert.equal(initial.status, 200);
    const initialBody = (await initial.json()) as { preferences: { slack: boolean } };
    assert.equal(initialBody.preferences.slack, true);

    const post = await postAlertPreferencesRoute(
      new Request("http://localhost/api/alert-preferences", {
        method: "POST",
        headers: { "content-type": "application/json", "x-whether-client-id": "abc" },
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

  it("keeps weekly digest counts top-level and marks fallback-backed payloads as degraded", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error("Test fetch disabled");
    };

    try {
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
          previousAssessment: {
            regime: "DEFENSIVE",
            scores: { tightness: 68, riskAppetite: 49 },
          } as RegimeAlertEvent["payload"]["previousAssessment"],
          currentAssessment: {
            regime: "SCARCITY",
            scores: { tightness: 72, riskAppetite: 45 },
          } as RegimeAlertEvent["payload"]["currentAssessment"],
          reasons: [{ code: "risk", message: "risk moved" }],
          decisionDeltas: [],
          triggerStates: {},
          sourceUrls: [],
          timeMachineHref: "/",
        },
      };
      const delivery: AlertDeliveryEvent = {
        eventId: "delivery-event",
        sourceVersion: "v1",
        canonicalTimestampSource: "request-received-at",
        id: "delivery-1",
        clientId: "client-a",
        alertId: "alert-1",
        channel: "slack",
        deliveredAt: "2026-02-16T00:05:00.000Z",
        status: "sent",
        summary: "SCARCITY (2026-02-16) · signals-updated",
      };

      await repository.appendAlert(alert);
      await repository.appendDelivery(delivery);

      const response = await getWeeklyDigestRoute();
      assert.equal(response.status, 200);

      const body = (await response.json()) as {
        version?: string;
        digest?: { summary?: string; bullets?: string[] };
        alertCount?: number;
        deliveryCount?: number;
        degraded?: boolean;
        backend?: string;
        deprecated?: { alertCount?: number; deliveryCount?: number; note?: string };
      };

      assert.equal(body.version, "v1");
      assert.equal(body.alertCount, 1);
      assert.equal(body.deliveryCount, 1);
      assert.equal(body.deprecated?.alertCount, 1);
      assert.equal(body.deprecated?.deliveryCount, 1);
      assert.equal(body.degraded, true);
      assert.equal(body.backend, "local-fallback");
      assert.match(body.digest?.summary ?? "", /SCARCITY regime as of 2026-02-16/);
      assert.ok(Array.isArray(body.digest?.bullets));
      assert.match(body.deprecated?.note ?? "", /Top-level alertCount and deliveryCount remain canonical/i);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
