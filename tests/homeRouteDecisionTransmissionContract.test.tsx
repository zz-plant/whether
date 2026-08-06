import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";

describe("home route render contract", () => {
  it("keeps the active / route carrying the homepage decision contract", () => {
    const routeSource = readFileSync("app/page.tsx", "utf8");

    assert.match(routeSource, /data-testid="weekly-top-fold"/);
    assert.match(routeSource, /lg:grid-cols-12/);
    assert.match(routeSource, /lg:grid-cols-\[1fr_18rem\]/);

    const scalarIndex = routeSource.indexOf("Posture shift:");
    const revisitIndex = routeSource.indexOf(">Revisit<");
    const guardrailIndex = routeSource.indexOf("Watch:");
    const memoryIndex = routeSource.indexOf("memoryItems.join");

    assert.ok(scalarIndex >= 0, "active route exposes the canonical scalar");
    assert.ok(revisitIndex > scalarIndex, "active route exposes the revisit decision state after scalar");
    assert.ok(guardrailIndex > revisitIndex, "active route exposes bounded guardrails after revisit state");
    assert.ok(memoryIndex > guardrailIndex, "active route exposes memory rail after guardrails");
    assert.ok(!routeSource.includes("DeltaTrustStrip"), "trust stays inline in the decision hero, not a duplicate summary card");
    assert.ok(!routeSource.includes("<FlipMeter"), "flip watch lives in the hero, not a separate barometer card");
  });
});
