import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";

describe("home route render contract", () => {
  it("keeps the active / route carrying the homepage decision contract", () => {
    const routeSource = readFileSync("app/page.tsx", "utf8");

    const heroSource = readFileSync("app/components/DecisionHero.tsx", "utf8");
    assert.match(heroSource, /data-testid="weekly-top-fold"/);
    assert.ok(routeSource.includes("revisitDecisions="), "home route passes the canonical revisit state into the hero");
    assert.ok(!routeSource.includes("WeeklyTopFoldContract"), "home route does not repeat the current-conditions card");
    assert.ok(!routeSource.includes("lg:grid-cols-[1fr_18rem]"), "history does not occupy a competing sticky dashboard rail");
    assert.ok(heroSource.includes("What needs reconsideration this week?"), "the hero owns the canonical revisit block");
    assert.ok(heroSource.includes("Why this call"), "diagnostics are progressively disclosed");
    assert.ok(!routeSource.includes("DeltaTrustStrip"), "trust stays inline in the decision hero, not a duplicate summary card");
    assert.ok(!routeSource.includes("<FlipMeter"), "flip watch lives in the hero, not a separate barometer card");

    // The hero owns the bounded guardrail; no adjacent status card restates it.
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

  it("keeps transition forecasting internal and off the hero surface", () => {
    const routeSource = readFileSync("app/page.tsx", "utf8");
    const heroSource = readFileSync("app/components/DecisionHero.tsx", "utf8");

    assert.ok(!routeSource.includes("transitionForecast="), "the route no longer passes a transition forecast into the hero");
    assert.ok(!heroSource.includes("transitionForecast"), "the hero no longer renders the transition forecast");
    assert.ok(!heroSource.includes("transitionProbability"), "a bare probability cannot be appended to the flip condition");
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
