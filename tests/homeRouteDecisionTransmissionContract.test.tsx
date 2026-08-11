import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";

describe("home route render contract", () => {
  it("keeps the active / route carrying the homepage decision contract", () => {
    const routeSource = readFileSync("app/page.tsx", "utf8");

    assert.match(routeSource, /data-testid="weekly-top-fold"/);
    assert.match(routeSource, /md:grid-cols-12/);
    assert.match(routeSource, /lg:grid-cols-\[1fr_18rem\]/);

    // Top-fold order since the "Refactor top-fold" redesign: posture delta scalar,
    // then the memory trajectory trail (left column), then the revisit-queue state (right column).
    const scalarIndex = routeSource.indexOf("weeklySummary.notchShiftLabel");
    const memoryIndex = routeSource.indexOf("memoryItems.join");
    const revisitIndex = routeSource.indexOf('shouldRevisit ? "Revisit active"');

    assert.ok(scalarIndex >= 0, "active route exposes the canonical posture-delta scalar");
    assert.ok(memoryIndex > scalarIndex, "active route exposes the memory trail after the scalar");
    assert.ok(revisitIndex > memoryIndex, "active route exposes the revisit decision state after the memory trail");
    assert.ok(!routeSource.includes("DeltaTrustStrip"), "trust stays inline in the decision hero, not a duplicate summary card");
    assert.ok(!routeSource.includes("<FlipMeter"), "flip watch lives in the hero, not a separate barometer card");

    // The hero owns the bounded guardrail (rendered there as `Guardrail:` under `Watch this week`).
    // The top fold restated the same string, so it must not grow a `Watch:` row back.
    assert.ok(!routeSource.includes("Watch:"), "guardrails stay in the decision hero, not restated in the top fold");
  });

  it("keeps one canonical copy action in the homepage body", () => {
    // `DecisionHero` owns the one-tap `Copy Brief`. The header `Export` menu is the format picker and
    // `StickyCallStrip` is its on-scroll persistence — no third in-body copy button.
    const heroSource = readFileSync("app/components/DecisionHero.tsx", "utf8");
    const rulesSource = readFileSync("app/components/ThreeWhethersCard.tsx", "utf8");

    assert.ok(heroSource.includes("<ShareBriefButton"), "decision hero owns the canonical copy action");
    assert.ok(!rulesSource.includes("ShareBriefButton"), "bounded rules card must not duplicate the hero copy action");
  });

  it("routes the lower home handoff through a collapsed disclosure to the operator-loop surfaces", () => {
    const routeSource = readFileSync("app/page.tsx", "utf8");
    const railSource = readFileSync("app/components/DecisionRouteRail.tsx", "utf8");

    assert.ok(routeSource.includes("<DecisionRouteRail"), "home route mounts the route-handoff disclosure");
    assert.ok(railSource.includes("hidden={!open}"), "route handoff is a collapsed disclosure, not an always-open rail");

    for (const target of [
      "/planning/financial",
      "/planning/ship-checklist",
      "/answer",
      "/answer#toolkit-library",
      "/template",
      "/resources/reversal-trigger-checklist",
      "/history/compare",
      "/history",
    ]) {
      assert.ok(railSource.includes(`"${target}"`), `route handoff surfaces ${target}`);
    }

    assert.ok(!railSource.includes("<ShareBriefButton"), "route handoff must not add a copy action");
  });

it("opens the command palette from the header search button", () => {
    const actionsSource = readFileSync("app/components/globalHeaderActionsClient.tsx", "utf8");
    const paletteSource = readFileSync("app/components/commandPalette.tsx", "utf8");

    assert.ok(actionsSource.includes('aria-label="Search"'), "header has a search button");
    assert.ok(actionsSource.includes("setShowPalette(true)"), "search button opens the command palette");
    assert.ok(paletteSource.includes("aria-label=\"Command palette\""), "command palette is accessible");
  });
});
