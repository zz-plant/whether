import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";

import { POST as postAlertDeliveries } from "../app/api/alert-deliveries/route";
import { POST as postCheckRegimeChange } from "../app/api/check-regime-change/route";
import { runScheduledAlertDelivery } from "../lib/alert/alertDelivery";
import { checkRegimeChange } from "../lib/alert/checkRegimeChange";
import { getSubscriberStore, resetSubscriberStore } from "../lib/email/subscriberStore";
import { resetOperatingSnapshotStore } from "../lib/operatingState/snapshotStore";
import type { KvNamespace } from "../lib/runtime/kv";
import { getSlackWebhookStore, resetSlackWebhookStore } from "../lib/slack/slackWebhookStore";

/*
 * The manual runs of the two between-Monday checks, with nothing stored.
 *
 * `POST /api/check-regime-change` and `POST /api/alert-deliveries` pass no
 * snapshot, and with an empty store both used to fall back to `loadReportData`
 * — which, on an upstream outage, succeeds by serving the bundled copy. Neither
 * asked whether that reading could be acted on, so a manual run judged a
 * months-old saved copy against the last-known state, mailed and posted what it
 * found, and wrote `regime:last-known` and `alert:state` from it: the next real
 * reading was then compared with the copy. The 2026-09-17 fix asked this of the
 * weekly email and the Slack post only.
 *
 * The suite runs offline, so a report read here is exactly that outage.
 */

const originalFetch = globalThis.fetch;

class FakeKv implements KvNamespace {
  readonly entries = new Map<string, string>();

  async get(key: string) {
    return this.entries.get(key) ?? null;
  }

  async put(key: string, value: string) {
    this.entries.set(key, value);
  }

  async delete(key: string) {
    this.entries.delete(key);
  }

  async list(options?: { prefix?: string }) {
    const prefix = options?.prefix ?? "";
    return {
      keys: [...this.entries.keys()].filter((name) => name.startsWith(prefix)).map((name) => ({ name })),
      list_complete: true,
    };
  }
}

/** Records Slack posts and refuses everything else, the way an outage does. */
const offlineExceptSlack = () => {
  const slackPosts: string[] = [];
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith("https://hooks.slack.com/")) {
      slackPosts.push(url);
      return new Response("ok", { status: 200 });
    }
    throw new Error(`offline: ${url}`);
  };
  return slackPosts;
};

const cronRequest = (path: string) =>
  new Request(`https://whether.test${path}`, { method: "POST", headers: { authorization: "Bearer test-cron-secret" } });

afterEach(() => {
  globalThis.fetch = originalFetch;
  Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
  Reflect.deleteProperty(globalThis, "WHETHER_CRON_SECRET");
  resetOperatingSnapshotStore();
  resetSubscriberStore();
  resetSlackWebhookStore();
});

describe("a manual regime check with nothing stored", () => {
  it("refuses to judge the saved copy, and writes no state from it", async () => {
    const kv = new FakeKv();
    Object.assign(globalThis, { WHETHER_DURABLE_KV: kv });
    resetOperatingSnapshotStore();
    await kv.put("regime:last-known", "EXPANSION");
    resetSlackWebhookStore();
    await getSlackWebhookStore().subscribe("https://hooks.slack.com/services/T0/B0/manual-check");
    const slackPosts = offlineExceptSlack();

    const result = await checkRegimeChange();

    assert.equal(result.ok, false);
    assert.match(result.error ?? "", /^refused_unpublishable: /);
    assert.equal(result.changed, undefined, "nothing was judged");
    assert.equal(await kv.get("regime:last-known"), "EXPANSION", "the last-known regime is the last real one");
    assert.equal(await kv.get("regime:confidence"), null);
    assert.equal(await kv.get("regime:weeks-to-flip"), null);
    assert.deepEqual(slackPosts, [], "no channel hears about a change read off a saved copy");
  });
});

describe("a manual alert delivery with nothing stored", () => {
  it("mails nobody from the saved copy, and records no alert state", async () => {
    const kv = new FakeKv();
    Object.assign(globalThis, { WHETHER_DURABLE_KV: kv });
    resetOperatingSnapshotStore();
    const store = resetSubscriberStore();
    const subscriber = await store.subscribe("alerts@example.com", { alerts: true });
    await getSubscriberStore().verifyEmail(subscriber.confirmToken ?? "");
    offlineExceptSlack();

    const result = await runScheduledAlertDelivery();

    assert.match(result.refused ?? "", /^refused_unpublishable: /);
    assert.equal(result.sent, 0, "a first run with no state would otherwise mail a regime change");
    assert.deepEqual(result.alerts, []);
    assert.equal(await kv.get("alert:state"), null);
  });
});

describe("the two manual routes", () => {
  /* A dependency the run lacks, like a missing KV binding, not a fault in it. */
  it("answer 503 with the refusal, and the shape they already publish", async () => {
    Object.assign(globalThis, { WHETHER_DURABLE_KV: new FakeKv(), WHETHER_CRON_SECRET: "test-cron-secret" });
    resetOperatingSnapshotStore();
    offlineExceptSlack();

    const check = await postCheckRegimeChange(cronRequest("/api/check-regime-change"));
    assert.equal(check.status, 503);
    const checkBody = await check.json();
    assert.equal(checkBody.ok, false);
    assert.match(checkBody.error, /^refused_unpublishable: /);

    const alerts = await postAlertDeliveries(cronRequest("/api/alert-deliveries"));
    assert.equal(alerts.status, 503);
    const alertsBody = await alerts.json();
    assert.equal(alertsBody.ok, false);
    assert.match(alertsBody.error, /^refused_unpublishable: /);
    assert.deepEqual(
      { sent: alertsBody.sent, skipped: alertsBody.skipped, alerts: alertsBody.alerts, errors: alertsBody.errors },
      { sent: 0, skipped: 0, alerts: [], errors: 0 },
    );
  });
});
