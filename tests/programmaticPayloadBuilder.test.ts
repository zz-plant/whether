import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
  enumerateProgrammaticRoutes,
  generateProgrammaticPayloadArtifacts,
  readProgrammaticPayload,
} from "../lib/seo/programmaticPayloadBuilder";

describe("programmatic payload builder", () => {
  it("enumerates one route per signal watch and decision scenario", () => {
    const routes = enumerateProgrammaticRoutes();
    assert.ok(routes.length > 0);
    assert.ok(routes.every((route) => route.kind === "signal-scenario"));
    assert.ok(routes.every((route) => route.url.startsWith("/signals/")));

    const watches = new Set(routes.map((route) => route.cluster));
    const scenarios = new Set(routes.map((route) => route.scenario));
    assert.equal(routes.length, watches.size * scenarios.size);
  });

  it("generates and reads validated payload artifacts", async () => {
    const output = await generateProgrammaticPayloadArtifacts();
    assert.ok(output.version.length > 0);

    const record = await readProgrammaticPayload("/signals/capital-tightness-watch/hiring");
    assert.equal(record.url, "/signals/capital-tightness-watch/hiring");
    assert.ok(record.delta.changedSignals.length >= 0);
    assert.ok(record.payload.currentCall.length > 0);
    assert.equal(record.payload.noindex, false);
  });

  /*
   * The three watch pages for one scenario share a decision rule, so their
   * call and action match by construction. What has to differ is the evidence:
   * each page cites its own watch's signals. The uniqueness gate is keyed on
   * the scenario so that it compares exactly these three, and passes only
   * because the evidence differs.
   */
  it("gives the three watch pages for one scenario distinct evidence", async () => {
    const { records } = await generateProgrammaticPayloadArtifacts();
    const byScenario = new Map<string, typeof records>();
    for (const record of records) {
      const scenario = record.url.split("/")[3];
      byScenario.set(scenario, [...(byScenario.get(scenario) ?? []), record]);
    }

    assert.ok(byScenario.size > 0);
    for (const [scenario, group] of byScenario) {
      assert.ok(group.length > 1, `${scenario} is read through more than one watch`);
      const seen = new Set<string>();
      for (const record of group) {
        const titles = record.payload.evidence.map((item) => item.title).sort().join("|");
        assert.ok(!seen.has(titles), `${record.url} cites the same evidence as a sibling`);
        seen.add(titles);
        assert.equal(record.payload.noindex, false, `${record.url}: ${record.payload.noindexReasons?.join(", ")}`);
      }
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
  const CALLERS = ["app/signals/[cluster]/[decision-scenario]/page.tsx"];

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

  it("no longer emits the retired resolve and toolkit cluster routes", () => {
    for (const route of enumerateProgrammaticRoutes()) {
      assert.ok(!route.url.startsWith("/resolve/"), `${route.url} was retired`);
      assert.ok(!route.url.startsWith("/toolkits/"), `${route.url} was retired`);
    }
  });
});
