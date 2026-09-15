import assert from "node:assert/strict";
import { afterEach, describe, it, mock, spyOn } from "bun:test";
import { checkRateLimit, clientKeyFor, RateLimitedError, rateLimitedResponse } from "../lib/runtime/rateLimit";
import { POST as subscribePost } from "../app/api/email/subscribe/route";
import { POST as legacySubscribePost } from "../app/api/subscribe/route";
import { POST as mcpPost } from "../app/api/mcp/route";
import { POST as telemetryPost } from "../app/api/telemetry/[stream]/route";
import { POST as premiumFunnelPost } from "../app/api/telemetry/premium-funnel/route";
import { resetSubscriberStore } from "../lib/email/subscriberStore";
import { resetPremiumFunnelEventLogForTests } from "../lib/storage/premiumFunnelEventRepository";

type Limiter = { limit(options: { key: string }): Promise<{ success: boolean }> };
type BindingName = "WHETHER_SUBSCRIBE_RATE_LIMITER" | "WHETHER_PUBLIC_WRITE_RATE_LIMITER" | "EMAIL";

/* Bindings are installed on globalThis by the Worker; the tests do the same, reflectively,
   so no test asserts a shape onto the global object. */
const install = (name: BindingName, value: unknown) => Reflect.set(globalThis, name, value);
const uninstall = (name: BindingName) => Reflect.deleteProperty(globalThis, name);

/** A limiter that allows the first `allow` calls per key and refuses the rest, recording keys. */
const createLimiter = (allow: number) => {
  const seen = new Map<string, number>();
  const keys: string[] = [];
  return {
    keys,
    binding: {
      async limit({ key }: { key: string }) {
        keys.push(key);
        const count = (seen.get(key) ?? 0) + 1;
        seen.set(key, count);
        return { success: count <= allow };
      },
    },
  };
};

const jsonPost = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

afterEach(() => {
  uninstall("WHETHER_SUBSCRIBE_RATE_LIMITER");
  uninstall("WHETHER_PUBLIC_WRITE_RATE_LIMITER");
  uninstall("EMAIL");
  resetSubscriberStore();
  resetPremiumFunnelEventLogForTests();
  mock.restore();
});

describe("checkRateLimit", () => {
  it("allows and reports unenforced when the binding is absent", async () => {
    assert.deepEqual(await checkRateLimit("WHETHER_SUBSCRIBE_RATE_LIMITER", "1.1.1.1"), { allowed: true, enforced: false });
  });

  it("refuses once the binding says so, and fails open when the binding throws", async () => {
    const limiter = createLimiter(1);
    install("WHETHER_SUBSCRIBE_RATE_LIMITER", limiter.binding);

    assert.deepEqual(await checkRateLimit("WHETHER_SUBSCRIBE_RATE_LIMITER", "a"), { allowed: true, enforced: true });
    assert.deepEqual(await checkRateLimit("WHETHER_SUBSCRIBE_RATE_LIMITER", "a"), { allowed: false, enforced: true });
    assert.deepEqual(await checkRateLimit("WHETHER_SUBSCRIBE_RATE_LIMITER", "b"), { allowed: true, enforced: true });

    const down: Limiter = { limit: async () => { throw new Error("limiter down"); } };
    install("WHETHER_SUBSCRIBE_RATE_LIMITER", down);
    const warn = spyOn(console, "warn").mockImplementation(() => undefined);
    assert.deepEqual(await checkRateLimit("WHETHER_SUBSCRIBE_RATE_LIMITER", "a"), { allowed: true, enforced: false });
    assert.equal(warn.mock.calls.length, 1);
  });

  it("keys on the edge's connecting address, then the forwarded one, then a shared bucket", () => {
    assert.equal(clientKeyFor(new Request("https://x/", { headers: { "cf-connecting-ip": "203.0.113.9", "x-forwarded-for": "10.0.0.1" } })), "203.0.113.9");
    assert.equal(clientKeyFor(new Request("https://x/", { headers: { "x-forwarded-for": "10.0.0.1, 10.0.0.2" } })), "10.0.0.1");
    assert.equal(clientKeyFor(new Request("https://x/")), "anonymous");
  });

  it("answers 429 with a Retry-After", async () => {
    const response = rateLimitedResponse(60);
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("retry-after"), "60");
    assert.deepEqual(await response.json(), { ok: false, error: "rate_limited" });
    assert.equal(new RateLimitedError().retryAfterSeconds, 60);
  });
});

describe("subscribe endpoints under the limiter", () => {
  const stubEmail = () => {
    const sent: string[] = [];
    install("EMAIL", { send: async (message: { to: string }) => { sent.push(message.to); return {}; } });
    return sent;
  };

  it("refuses the sixth subscribe from one address before writing or sending, on every subscribe route", async () => {
    const sent = stubEmail();
    const limiter = createLimiter(5);
    install("WHETHER_SUBSCRIBE_RATE_LIMITER", limiter.binding);
    const headers = { "cf-connecting-ip": "198.51.100.7" };

    for (let i = 0; i < 5; i++) {
      const response = await subscribePost(jsonPost("https://whether.test/api/email/subscribe", { email: `r${i}@example.com` }, headers));
      assert.equal(response.status, 200);
    }
    assert.equal(sent.length, 5);

    const refused = await subscribePost(jsonPost("https://whether.test/api/email/subscribe", { email: "r6@example.com" }, headers));
    assert.equal(refused.status, 429);
    assert.equal(refused.headers.get("retry-after"), "60");
    assert.equal(sent.length, 5, "the refused call sent nothing");

    const legacy = await legacySubscribePost(jsonPost("https://whether.test/api/subscribe", { email: "r7@example.com" }, headers));
    assert.equal(legacy.status, 429);

    const mcp = await mcpPost(jsonPost("https://whether.test/api/mcp?tool=subscribe", { email: "r8@example.com" }, headers));
    assert.equal(mcp.status, 429);

    assert.ok(limiter.keys.every((key) => key === "198.51.100.7"), "keyed by the connecting address");
  });

  it("is a no-op without the binding", async () => {
    const sent = stubEmail();
    const response = await subscribePost(jsonPost("https://whether.test/api/email/subscribe", { email: "free@example.com" }));
    assert.equal(response.status, 200);
    assert.equal(sent.length, 1);
  });
});

describe("public write endpoints under the limiter", () => {
  it("refuses telemetry and premium-funnel intake past the limit", async () => {
    const limiter = createLimiter(1);
    install("WHETHER_PUBLIC_WRITE_RATE_LIMITER", limiter.binding);
    const headers = { "cf-connecting-ip": "192.0.2.4" };
    const event = { type: "premium_intent", source: "export_brief", path: "/operate", ctaId: "copy_slack_brief", occurredAt: new Date().toISOString() };

    const first = await premiumFunnelPost(jsonPost("https://whether.test/api/telemetry/premium-funnel", event, headers));
    assert.notEqual(first.status, 429);

    const second = await premiumFunnelPost(jsonPost("https://whether.test/api/telemetry/premium-funnel", event, headers));
    assert.equal(second.status, 429);

    const telemetry = await telemetryPost(
      jsonPost("https://whether.test/api/telemetry/activation", { step: "committed" }, headers),
      { params: { stream: "activation" } },
    );
    assert.equal(telemetry.status, 429);
  });
});
