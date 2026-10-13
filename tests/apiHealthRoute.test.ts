import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { GET as getHealthRoute } from "../app/api/health/route";

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

  it("names its stale live sources, and says degraded rather than ok when there are any", async () => {
    const body: Record<string, unknown> = await (await getHealthRoute()).json();
    assert.ok(Array.isArray(body.staleSources), "the stale sources are listed, empty or not");
    const dependencies = body.dependencies;
    assert.ok(dependencies && typeof dependencies === "object" && "dataFreshness" in dependencies);
    const stale = Array.isArray(body.staleSources) && body.staleSources.length > 0;
    const modelStale = Reflect.get(dependencies, "ingestModel") === "stale";
    if (body.status !== "down") assert.equal(body.status, stale || modelStale ? "degraded" : "ok");
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
});
