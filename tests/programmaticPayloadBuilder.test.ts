import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFileSync } from "node:fs";
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

    const record = await readProgrammaticPayload("/resolve/ceo/capital-raising");
    assert.equal(record.url, "/resolve/ceo/capital-raising");
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

/*
 * The pages look their payload up by URL string. A route rename left two of
 * them asking for `/resolve/...` and `/evidence/...` — prefixes the enumerator
 * had stopped producing and which 404 as routes — so those pages threw on every
 * request. Nothing caught it, because the mismatch is between a literal in a
 * page and a literal in the builder.
 */
describe("programmatic payload lookups match enumerated routes", () => {
  const CALLERS = [
    "app/resolve/[slug]/[cluster]/page.tsx",
    "app/signals/[cluster]/[decision-scenario]/page.tsx",
    "app/toolkits/[slug]/[cluster]/page.tsx",
  ];

  it("asks only for URL prefixes the builder emits", () => {
    const enumerated = new Set(
      enumerateProgrammaticRoutes().map((route) => route.url.split("/")[1]),
    );
    assert.ok(enumerated.size > 0);

    for (const caller of CALLERS) {
      const source = readFileSync(new URL(`../${caller}`, import.meta.url), "utf8");
      const requested = [...source.matchAll(/readProgrammaticPayload\(`\/([^/`]+)\//g)].map(
        (match) => match[1],
      );

      assert.ok(requested.length > 0, `${caller} no longer looks up a payload`);
      for (const prefix of requested) {
        assert.ok(
          enumerated.has(prefix),
          `${caller} requests /${prefix}/..., which enumerateProgrammaticRoutes never emits (it emits: ${[...enumerated].join(", ")})`,
        );
      }
    }
  });
});
