import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { POST as postPremiumFunnelRoute } from "../app/api/telemetry/premium-funnel/route";

describe("/api/telemetry/premium-funnel", () => {
  it("rejects invalid payloads", async () => {
    const response = await postPremiumFunnelRoute(
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
    const response = await postPremiumFunnelRoute(
      new Request("http://localhost/api/telemetry/premium-funnel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "premium_intent",
          source: "export_brief",
          path: "/operations",
          ctaId: "copy_slack_brief",
          occurredAt: new Date().toISOString(),
        }),
      }),
    );

    assert.equal(response.status, 202);
    const body = (await response.json()) as { ok?: boolean };
    assert.equal(body.ok, true);
  });
});
