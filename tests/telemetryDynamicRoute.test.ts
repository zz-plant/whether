import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { POST } from "../app/api/telemetry/[stream]/route";

describe("Unified Dynamic Telemetry Handler (/api/telemetry/[stream])", () => {
  it("rejects invalid stream parameters", async () => {
    const request = new Request("http://localhost/api/telemetry/unknown-stream", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ any: "data" }),
    });

    const response = await POST(request, { params: { stream: "unknown-stream" } });
    assert.equal(response.status, 400);
    const body: { error: string } = await response.json();
    assert.equal(body.error, "invalid_stream");
  });

  it("rejects malformed JSON", async () => {
    const request = new Request("http://localhost/api/telemetry/web-vitals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid-json",
    });

    const response = await POST(request, { params: { stream: "web-vitals" } });
    assert.equal(response.status, 400);
    const body: { error: string } = await response.json();
    assert.equal(body.error, "invalid_json");
  });

  it("accepts valid web-vitals payloads", async () => {
    const request = new Request("http://localhost/api/telemetry/web-vitals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "LCP",
        value: 1200,
        rating: "good",
        delta: 50,
        id: "v3-12345",
        path: "/",
        navigationType: "navigate",
      }),
    });

    const response = await POST(request, { params: { stream: "web-vitals" } });
    assert.equal(response.status, 202);
    const body: { ok: boolean } = await response.json();
    assert.equal(body.ok, true);
  });

  it("accepts the route transition the client actually sends", async () => {
    const request = new Request("http://localhost/api/telemetry/operator-workflow", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "route_transition",
        path: "/signals",
        fromPath: "/",
        toPath: "/signals",
      }),
    });

    const response = await POST(request, { params: { stream: "operator-workflow" } });
    assert.equal(response.status, 202);
    const body: { ok: boolean } = await response.json();
    assert.equal(body.ok, true);
  });

  it("rejects the assist and artifact events no emitter produces", async () => {
    // These two were valid until 2026-09-07, typed against a literacy-assist
    // module whose storage keys nothing wrote. Accepting them made the endpoint
    // look like it served UI that was never built.
    for (const payload of [
      { type: "assist_panel_opened", path: "/", assistMode: "decision", source: "click" },
      { type: "artifact_mode_selected", path: "/", artifactMode: "operator" },
    ]) {
      const request = new Request("http://localhost/api/telemetry/operator-workflow", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const response = await POST(request, { params: { stream: "operator-workflow" } });
      assert.equal(response.status, 400);
    }
  });
});
