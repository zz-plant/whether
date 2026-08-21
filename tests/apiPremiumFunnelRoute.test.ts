import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import { GET, POST } from "../app/api/telemetry/premium-funnel/route";
import { resetPremiumFunnelEventLogForTests } from "../lib/storage/premiumFunnelEventRepository";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  resetPremiumFunnelEventLogForTests();
});

describe("/api/telemetry/premium-funnel", () => {
  it("rejects invalid payloads", async () => {
    const response = await POST(
      new Request("http://localhost/api/telemetry/premium-funnel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "premium_intent", source: "invalid" }),
      }),
    );

    assert.equal(response.status, 400);
    const body = (await response.json()) as { error?: string };
    assert.equal(body.error, "invalid_payload");
  });

  it("accepts valid premium intent events", async () => {
    const response = await POST(
      new Request("http://localhost/api/telemetry/premium-funnel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "premium_intent",
          source: "export_brief",
          path: "/operate",
          ctaId: "copy_slack_brief",
          occurredAt: new Date().toISOString(),
        }),
      }),
    );

    assert.equal(response.status, 202);
    const body = (await response.json()) as { ok?: boolean };
    assert.equal(body.ok, true);
  });

  it("refuses an oversized body before parsing it", async () => {
    const response = await POST(
      new Request("http://localhost/api/telemetry/premium-funnel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "premium_intent",
          source: "export_brief",
          path: "/operate",
          detail: "x".repeat(8192),
          occurredAt: new Date().toISOString(),
        }),
      }),
    );

    assert.equal(response.status, 413);
  });

  it("refuses to read the funnel without the cron secret", async () => {
    process.env.WHETHER_CRON_SECRET = "s3cret";

    const response = await GET(
      new Request("http://localhost/api/telemetry/premium-funnel"),
    );

    assert.equal(response.status, 401);
  });

  it("returns a summary of captured events to an authorized reader", async () => {
    process.env.WHETHER_CRON_SECRET = "s3cret";
    resetPremiumFunnelEventLogForTests();

    await POST(
      new Request("http://localhost/api/telemetry/premium-funnel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "premium_intent",
          source: "api_access",
          path: "/api-docs",
          occurredAt: new Date().toISOString(),
        }),
      }),
    );

    const response = await GET(
      new Request("http://localhost/api/telemetry/premium-funnel", {
        headers: { authorization: "Bearer s3cret" },
      }),
    );

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.summary.total, 1);
    assert.equal(body.summary.bySource.api_access, 1);
  });
});
