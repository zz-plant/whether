import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { GET as getHealthRoute } from "../app/api/health/route";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";
import { FakeKv } from "./fixtures/fakeKv";

serveUnreachableUpstreams();

describe("/api/health", () => {
  it("returns a minimal status payload", async () => {
    const response = await getHealthRoute();
    assert.ok([200, 503].includes(response.status), "health should return 200 or 503");

    const body = (await response.json()) as Record<string, unknown>;
    assert.ok(typeof body.status === "string");
    assert.equal(body.service, "whether");
    assert.equal(body.version, "v1");
    assert.ok(typeof body.generatedAt === "string");
  });

  it("names its degraded live sources, and says degraded rather than ok when there are any", async () => {
    const body: Record<string, unknown> = await (await getHealthRoute()).json();
    assert.ok(Array.isArray(body.degradedSources), "the degraded sources are listed, empty or not");
    assert.ok(Array.isArray(body.staleSources), "the stale subset keeps its name");
    const dependencies = body.dependencies;
    assert.ok(dependencies && typeof dependencies === "object" && "dataFreshness" in dependencies);
    const degraded = Array.isArray(body.degradedSources) && body.degradedSources.length > 0;
    const modelStale = Reflect.get(dependencies, "ingestModel") === "stale";
    const automationDown = ["unconfigured", "failing"].includes(String(Reflect.get(dependencies, "automation")));
    if (body.status !== "down") assert.equal(body.status, degraded || modelStale || automationDown ? "degraded" : "ok");
  });

  it("reports the ingest model's freshness apart from the sources", async () => {
    const body: Record<string, unknown> = await (await getHealthRoute()).json();
    const dependencies = body.dependencies;
    assert.ok(dependencies && typeof dependencies === "object");
    assert.ok(["ok", "stale", "unknown"].includes(String(Reflect.get(dependencies, "ingestModel"))));
    assert.ok("ingestModelAsOf" in body);
  });

  it("reports null for deployedVersion when the Cloudflare binding is absent", async () => {
    const body: Record<string, unknown> = await (await getHealthRoute()).json();
    assert.equal(body.deployedVersion, null);
  });

  it("reports the commit only when the build compiled one in, which bun test never does", async () => {
    const body: Record<string, unknown> = await (await getHealthRoute()).json();
    assert.ok("commit" in body);
    assert.equal(body.commit, null);
  });

  it("names the running Worker build when the binding is installed", async () => {
    const binding = { id: "fd5d5e6f-6b25-4ddd-8fde-90f58fc8425e", tag: "", timestamp: "2026-09-01T20:12:02.047Z" };
    Reflect.set(globalThis, "CF_VERSION_METADATA", binding);
    try {
      const body: Record<string, unknown> = await (await getHealthRoute()).json();
      assert.deepEqual(body.deployedVersion, binding);
    } finally {
      Reflect.deleteProperty(globalThis, "CF_VERSION_METADATA");
    }
  });

  it("rejects a malformed binding rather than reporting a partial version", async () => {
    Reflect.set(globalThis, "CF_VERSION_METADATA", { id: "only-an-id" });
    try {
      const body: Record<string, unknown> = await (await getHealthRoute()).json();
      assert.equal(body.deployedVersion, null);
    } finally {
      Reflect.deleteProperty(globalThis, "CF_VERSION_METADATA");
    }
  });

  it("reports automation as ok where the lane switches nothing on that needs a secret", async () => {
    const body: Record<string, unknown> = await (await getHealthRoute()).json();
    assert.equal(Reflect.get(Object(body.dependencies), "automation"), "ok");
    assert.deepEqual(body.missingSecrets, []);
    assert.deepEqual(body.failingRuns, []);
  });

  it("names a required secret the running lane is missing, and says degraded", async () => {
    Reflect.set(globalThis, "EMAIL", { send: async () => ({}) });
    try {
      const body: Record<string, unknown> = await (await getHealthRoute()).json();
      assert.equal(Reflect.get(Object(body.dependencies), "automation"), "unconfigured");
      assert.deepEqual(body.missingSecrets, ["WHETHER_OPS_EMAIL"]);
      if (body.status !== "down") assert.equal(body.status, "degraded");
    } finally {
      Reflect.deleteProperty(globalThis, "EMAIL");
    }
  });

  it("names a scheduled run whose last outcome failed", async () => {
    const kv = new FakeKv();
    kv.entries.set("ops:last-run:brief-freeze", JSON.stringify({ at: "2026-11-23T14:01:00.000Z", failedSteps: ["brief-freeze"] }));
    Reflect.set(globalThis, "WHETHER_DURABLE_KV", kv);
    try {
      const body: Record<string, unknown> = await (await getHealthRoute()).json();
      assert.equal(Reflect.get(Object(body.dependencies), "automation"), "failing");
      assert.deepEqual(body.failingRuns, [{ run: "brief-freeze", at: "2026-11-23T14:01:00.000Z", failedSteps: ["brief-freeze"] }]);
      if (body.status !== "down") assert.equal(body.status, "degraded");
    } finally {
      Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
    }
  });
});
