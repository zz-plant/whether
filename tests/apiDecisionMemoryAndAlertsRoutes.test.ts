import assert from "node:assert/strict";
import { beforeEach, describe, it } from "bun:test";
import { GET as getAlertDeliveriesRoute, POST as postAlertDeliveriesRoute } from "../app/api/alert-deliveries/route";
import { GET as getWeeklyDigestRoute } from "../app/api/weekly-digest/route";
import { GET as getRegimeAlertsRoute, POST as postRegimeAlertsRoute } from "../app/api/regime-alerts/route";
import { getRegimeAlertRepository, resetRegimeAlertRepository } from "../lib/storage/regimeAlertRepository";
import type { AlertDeliveryEvent, RegimeAlertEvent } from "../lib/signalOps";

describe("alert routes", () => {
  beforeEach(() => {
    resetRegimeAlertRepository();
  });

  /** Narrow the response instead of asserting a shape onto it. */
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

  it("lists delivery events for one client without leaking another's", async () => {
    const repository = getRegimeAlertRepository();
    const deliveryFor = (clientId: string, channel: AlertDeliveryEvent["channel"]): AlertDeliveryEvent => ({
      eventId: `${clientId}-${channel}`,
      sourceVersion: "v1",
      canonicalTimestampSource: "request-received-at",
      id: `${clientId}-${channel}`,
      clientId,
      alertId: "alert-1",
      channel,
      deliveredAt: "2026-02-16T00:00:00.000Z",
      status: "sent",
      summary: "regime moved",
    });

    await repository.appendDelivery(deliveryFor("abc", "email"));
    await repository.appendDelivery(deliveryFor("abc", "slack"));
    await repository.appendDelivery(deliveryFor("other-client", "email"));

    Object.assign(globalThis, { WHETHER_CRON_SECRET: "test-cron-secret" });
    const get = await getAlertDeliveriesRoute(
      new Request("http://localhost/api/alert-deliveries?clientId=abc", {
        headers: { authorization: "Bearer test-cron-secret" },
      }),
    );
    Reflect.deleteProperty(globalThis, "WHETHER_CRON_SECRET");

    assert.equal(get.status, 200);
    const body: unknown = await get.json();
    assert.ok(isRecord(body), "responds with an object");
    assert.ok(Array.isArray(body.deliveries), "responds with a delivery list");
    assert.equal(body.deliveries.length, 2);
    assert.equal(body.count, 2);
    assert.equal(body.clientId, "abc");
    assert.ok(
      body.deliveries.every((delivery) => isRecord(delivery) && delivery.clientId === "abc"),
      "every listed delivery belongs to the requested client",
    );
  });

  // The guard used to read "reject if a secret is configured and does not match", so a
  // deployment without WHETHER_CRON_SECRET served every client's delivery history to
  // anyone who asked. Misconfiguration should close this, not open it.
  it("refuses to list deliveries without cron credentials, and when no secret is set", async () => {
    const unconfigured = await getAlertDeliveriesRoute(
      new Request("http://localhost/api/alert-deliveries?clientId=abc"),
    );
    assert.equal(unconfigured.status, 503, "fails closed when no secret is configured");

    Object.assign(globalThis, { WHETHER_CRON_SECRET: "test-cron-secret" });
    const wrongToken = await getAlertDeliveriesRoute(
      new Request("http://localhost/api/alert-deliveries?clientId=abc", {
        headers: { authorization: "Bearer not-the-secret" },
      }),
    );
    Reflect.deleteProperty(globalThis, "WHETHER_CRON_SECRET");
    assert.equal(wrongToken.status, 401);
  });

  // The unauthenticated branch this replaces appended a row with status "sent" for every
  // enabled channel without contacting one, so anyone could write delivery records for
  // sends that never happened — and the panel read them back as "Delivered to N channels".
  it("refuses to record deliveries for an unauthenticated caller", async () => {
    const repository = getRegimeAlertRepository();

    const response = await postAlertDeliveriesRoute(
      new Request("http://localhost/api/alert-deliveries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId: "abc", alertId: "alert-1" }),
      }),
    );

    assert.ok(response.status === 401 || response.status === 503, `refused, got ${response.status}`);

    const listed = await repository.listDeliveries({ limit: 10 });
    assert.deepEqual(listed.deliveries, [], "nothing was written");
  });

  it("keeps regime alert history readable by the browser without cron credentials", async () => {
    const repository = getRegimeAlertRepository();
    const alert: RegimeAlertEvent = {
      eventId: "browser-alert-event",
      sourceVersion: "v1",
      canonicalTimestampSource: "request-received-at",
      id: "browser-alert",
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

    const response = await getRegimeAlertsRoute(new Request("http://localhost/api/regime-alerts"));

    assert.equal(response.status, 200);
    const body = (await response.json()) as { alerts: Array<{ id: string }> };
    assert.equal(body.alerts[0]?.id, "browser-alert");
  });

  it("continues to protect regime alert writes with cron authentication", async () => {
    const previousSecret = process.env.WHETHER_CRON_SECRET;
    process.env.WHETHER_CRON_SECRET = "regime-alert-route-test-secret";

    try {
      const response = await postRegimeAlertsRoute(new Request("http://localhost/api/regime-alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }));

      assert.equal(response.status, 401);
    } finally {
      if (previousSecret === undefined) {
        delete process.env.WHETHER_CRON_SECRET;
      } else {
        process.env.WHETHER_CRON_SECRET = previousSecret;
      }
    }
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
      // The seeded alert is from February. It still counts toward alertCount, but
      // the digest speaks for one week: a months-old crossing is reported as the
      // last recorded alert, never as this week's guidance.
      assert.equal(body.digest?.summary, "No alerts this week.");
      assert.ok(Array.isArray(body.digest?.bullets));
      assert.ok(
        body.digest?.bullets?.some((bullet) =>
          bullet.startsWith("Last recorded alert: conditions were Freezing as of Feb 16, 2026"),
        ),
        "the February crossing is still surfaced, labelled as history",
      );
      assert.match(body.deprecated?.note ?? "", /Top-level alertCount and deliveryCount remain canonical/i);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
