import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GET as getLlmsRoute } from "../app/llms.txt/route";
import { agentApiCorsHeaders } from "../lib/agentApiCors";

describe("agent-facing routes", () => {
  it("defines permissive read-only CORS headers for /api/agent", () => {
    assert.equal(agentApiCorsHeaders["Access-Control-Allow-Origin"], "*");
    assert.equal(agentApiCorsHeaders["Access-Control-Allow-Methods"], "GET, OPTIONS");
    assert.equal(
      agentApiCorsHeaders["Access-Control-Allow-Headers"],
      "Content-Type, Accept"
    );
  });

  it("serves llms.txt guidance", async () => {
    const response = await getLlmsRoute();
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
    assert.match(body, /GET https:\/\/whether\.work\/api\/agent\?cadence=<weekly\|monthly\|quarterly\|yearly>/);
    assert.match(body, /Default cadence: weekly/);
  });
});
