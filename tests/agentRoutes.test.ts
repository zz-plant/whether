import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "bun:test";
import { GET as getLlmsRoute } from "../app/llms.txt/route";
import { agentManifestResponse } from "../lib/agentManifest";
import { GET as getAgentRoute } from "../app/api/agent/route";
import { agentApiCorsHeaders } from "../lib/agentApiCors";
import { supportedAgentCadences } from "../lib/agentInterface";
import { resetOperatingSnapshotStore } from "../lib/operatingState/snapshotStore";

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
    assert.match(
      body,
      /GET https:\/\/whether\.work\/api\/agent\?cadence=<weekly\|monthly\|quarterly\|yearly>/
    );
    assert.match(body, /Default cadence: weekly/);
    assert.match(body, /decision delta/i);
    assert.match(body, /flip watch/i);
    assert.match(body, /\.well-known\/whether-agent\.json/);
  });

  it("serves machine-readable discovery metadata", async () => {
    const response = agentManifestResponse();
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
    assert.equal(body.defaultCadence, "weekly");
    assert.deepEqual(body.supportedCadences, ["weekly", "monthly", "quarterly", "yearly"]);
    assert.equal(body.endpoints.llms, "https://whether.work/llms.txt");
    assert.equal(body.examples.weekly, "https://whether.work/api/agent?cadence=weekly");
    assert.equal(body.revisableDelegation.loopPosition, "act");
    assert.equal(body.revisableDelegation.conformanceLevel, 2);
    assert.deepEqual(body.revisableDelegation.kinds, ["belief"]);
    assert.equal(
      body.revisableDelegation.verifier,
      "https://ethotechnics.org/diagnostics/record-conformance",
    );
    assert.equal(body.revisableDelegation.records, "https://whether.work/api/decision-memory?format=records");
  });
});

/* The outage that produced the defect, reproduced at its source. `/api/agent` read through
   `loadReportData`, which throws, so a durable-store read failure inside the loader — the
   unguarded `loadLatestOperatingSnapshot()` in reportDataLoader — answered all four cadences
   with a 500 and an empty body while `/api/weekly` and its siblings served the bundled
   snapshot behind a `degraded` flag. This is a public endpoint advertised in /llms.txt and
   /api-docs, so the contract under an outage is a stale answer that admits it is stale. */
describe("/api/agent under a live-data outage", () => {
  const originalFetch = globalThis.fetch;
  const disabledFetch: typeof fetch = async () => {
    throw new Error("Test fetch disabled");
  };

  beforeEach(() => {
    globalThis.fetch = disabledFetch;
    /* Rejecting the same read the edge runtime rejects, rather than cutting the network:
       treasury and macro both carry their own snapshot fallbacks, so a dead fetch alone
       never reaches the loader's throw. */
    const store = resetOperatingSnapshotStore();
    store.readLatest = async () => {
      throw new Error("internal error; reference = test-durable-store-outage");
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    resetOperatingSnapshotStore();
  });

  for (const cadence of supportedAgentCadences) {
    it(`serves the ${cadence} snapshot with degraded: true instead of 500ing`, async () => {
      const response = await getAgentRoute(
        new Request(`https://whether.work/api/agent?cadence=${cadence}`),
      );
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.degraded, true);

      /* The published shape has to survive the outage intact: the SDK client, both MCP
         servers, pullRecentSiteInfo, and the discovery document read these keys. */
      assert.equal(body.cadence, cadence);
      assert.equal(body.defaultCadence, "weekly");
      assert.deepEqual(body.supportedCadences, [...supportedAgentCadences]);
      assert.ok(body.summary && typeof body.summary === "object");
      assert.equal(body.copy, body.summary.copy);
      assert.deepEqual(body.provenance, body.summary.provenance);
      assert.equal(body.recordDateLabel, body.summary.recordDateLabel);
      assert.ok(body.agentHandoff.payload, "agentHandoff.payload should survive the outage");
      assert.equal(typeof body.agentHandoff.prompt, "string");
      assert.equal(
        typeof body.summaryHash,
        cadence === "weekly" || cadence === "monthly" ? "string" : "object",
      );
      assert.equal(body.links.self, `/api/agent?cadence=${cadence}`);
      assert.equal(body.links.llms, "/llms.txt");
      assert.equal(body.links.discovery, "/.well-known/whether-agent.json");
      assert.ok(!Number.isNaN(Date.parse(body.generatedAt)));
      assert.equal(body.version, "v1");
      assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
    });
  }

  it("still rejects an unknown cadence with 400 rather than degrading into weekly", async () => {
    const response = await getAgentRoute(
      new Request("https://whether.work/api/agent?cadence=fortnightly"),
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.deepEqual(body.allowedCadences, [...supportedAgentCadences]);
  });

  it("serves a frozen published brief when queried by week, and 404s for an unknown week", async () => {
    const response = await getAgentRoute(
      new Request("https://whether.work/api/agent?week=2026-w41"),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.type, "published_brief");
    assert.equal(body.slug, "2026-w41");
    assert.ok(body.headline);
    assert.ok(body.actionNow);
    assert.ok(body.decisions.length > 0);

    const notFound = await getAgentRoute(
      new Request("https://whether.work/api/agent?week=1999-w01"),
    );
    assert.equal(notFound.status, 404);
    const notFoundBody = await notFound.json();
    assert.match(notFoundBody.error, /not found/i);
    assert.ok(Array.isArray(notFoundBody.availableWeeks));
  });

  it("serves an archive period when queried by period, and 404s for an unknown period", async () => {
    const response = await getAgentRoute(
      new Request("https://whether.work/api/agent?period=2024-q1"),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.type, "posture_archive_period");
    assert.equal(body.slug, "2024-q1");
    assert.equal(body.kind, "quarter");

    const notFound = await getAgentRoute(
      new Request("https://whether.work/api/agent?period=invalid-period"),
    );
    assert.equal(notFound.status, 404);
  });
});
