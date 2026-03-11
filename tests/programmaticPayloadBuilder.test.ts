import assert from "node:assert/strict";
import { describe, it } from "node:test";
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

    const record = await readProgrammaticPayload("/decide/ceo/capital-raising");
    assert.equal(record.url, "/decide/ceo/capital-raising");
    assert.ok(record.delta.changedSignals.length >= 0);
    assert.ok(record.payload.currentCall.length > 0);
    assert.equal(record.payload.noindex, false);
  });
});
