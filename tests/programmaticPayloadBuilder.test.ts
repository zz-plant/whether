import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  enumerateProgrammaticRoutes,
  generateProgrammaticPayloadArtifacts,
  readProgrammaticPayload,
} from "../lib/seo/programmaticPayloadBuilder";

describe("programmatic payload builder", () => {
  it("enumerates all cluster-derived programmatic routes", () => {
    const routes = enumerateProgrammaticRoutes();
    assert.ok(routes.length > 0);
    assert.ok(routes.some((route) => route.kind === "decide"));
    assert.ok(routes.some((route) => route.kind === "toolkit"));
    assert.ok(routes.some((route) => route.kind === "signal-scenario"));
  });

  it("generates and reads validated payload artifacts", async () => {
    const output = await generateProgrammaticPayloadArtifacts();
    assert.ok(output.version.length > 0);

    const record = await readProgrammaticPayload("/answer/ceo/capital-raising");
    assert.equal(record.url, "/answer/ceo/capital-raising");
    assert.ok(record.delta.changedSignals.length >= 0);
    assert.ok(record.payload.currentCall.length > 0);
    assert.equal(record.payload.noindex, false);

    const routes = enumerateProgrammaticRoutes();
    const decideCluster = routes
      .filter((route): route is Extract<(typeof routes)[number], { kind: "decide" }> => route.kind === "decide")
      .reduce<Map<string, string[]>>((clusters, route) => {
        const existing = clusters.get(route.cluster) ?? [];
        existing.push(route.url);
        clusters.set(route.cluster, existing);
        return clusters;
      }, new Map());

    const multiSlugCluster = [...decideCluster.entries()].find(([, urls]) => urls.length > 1);
    assert.ok(multiSlugCluster, "expected at least one decide cluster with multiple role variants");

    for (const url of multiSlugCluster[1]) {
      const clusterRecord = output.records.find((candidate) => candidate.url === url);
      assert.ok(clusterRecord, `expected generated record for ${url}`);
      assert.equal(clusterRecord.payload.noindex, false);
    }
  });
});
