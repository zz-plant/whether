import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";

describe("home route render contract", () => {
  it("keeps the active / route carrying the homepage decision contract", () => {
    const routeSource = readFileSync("app/page.tsx", "utf8");

    const heroSource = readFileSync("app/components/DecisionHero.tsx", "utf8");
    // The top fold is now `WeeklyChangeReport`, rendered by the hero. The rule it
    // carries is unchanged — one revisit block, owned by the hero — so the
    // assertions follow it to the file that holds it rather than relaxing.
    const changeReportSource = readFileSync("app/components/hero/weeklyChangeReport.tsx", "utf8");
    assert.match(changeReportSource, /data-testid="weekly-top-fold"/);
    assert.ok(heroSource.includes("<WeeklyChangeReport"), "the hero still owns the top fold");
    assert.ok(!routeSource.includes("<WeeklyChangeReport"), "the route does not mount a second change report");
    assert.ok(routeSource.includes("revisitDecisions="), "home route passes the canonical revisit state into the hero");
    assert.ok(!routeSource.includes("WeeklyTopFoldContract"), "home route does not repeat the current-conditions card");
    assert.ok(!routeSource.includes("lg:grid-cols-[1fr_18rem]"), "history does not occupy a competing sticky dashboard rail");
    assert.ok(
      changeReportSource.includes("What changed this week?"),
      "the hero's top fold leads with the weekly delta",
    );
    // The three bands are the contract, not decoration: a change with no stated
    // consequence and a consequence with no stated cause are both what this
    // block exists to prevent.
    for (const band of ["What changed", "What that changes for you", "What stays the same"]) {
      assert.ok(changeReportSource.includes(`>${band}<`), `change report keeps the "${band}" band`);
    }
    assert.ok(heroSource.includes("Why this call"), "diagnostics are progressively disclosed");
    assert.ok(!routeSource.includes("DeltaTrustStrip"), "trust stays inline in the decision hero, not a duplicate summary card");
    assert.ok(!routeSource.includes("<FlipMeter"), "flip watch lives in the hero, not a separate barometer card");

    // The hero owns the bounded guardrail; no adjacent status card restates it.
    assert.ok(!routeSource.includes("Watch:"), "guardrails stay in the decision hero, not restated in the top fold");
  });

  it("keeps one canonical copy action in the homepage body", () => {
    // `DecisionHero` owns the one-tap `Copy Brief`. The header `Export` menu is the format picker and
    // `StickyCallStrip` is its on-scroll persistence — no third in-body copy button.
    //
    // This used to assert against `ThreeWhethersCard`, which 69221739 stopped rendering and
    // which is now deleted. The DD-005 rule it protected is unchanged, so it moves to the
    // one other body surface that carries a copy control: the non-weekly cadence lead.
    const heroSource = readFileSync("app/components/DecisionHero.tsx", "utf8");
    const cadenceSource = readFileSync("app/components/CadenceCallCard.tsx", "utf8");

    assert.ok(heroSource.includes("<ShareBriefButton"), "decision hero owns the canonical copy action");
    // The cadence lead copies a different artifact — the month's or quarter's call, not the
    // week's — so it earns its own control. What DD-005 rules out is a second button under
    // the hero's name, which is why this one has to pass its own label.
    assert.ok(
      cadenceSource.includes("label={model.shareLabel}"),
      "cadence lead must name the artifact it copies rather than reusing 'Copy Brief'",
    );
  });

  it("copies the brief the reader is previewing, not a blurb about the product", () => {
    const railSource = readFileSync("app/components/shareRail.tsx", "utf8");
    const routeSource = readFileSync("app/page.tsx", "utf8");

    // The panel copied a fixed marketing sentence plus a URL under both format
    // names, and its third control read the decision card out of
    // `[data-share-section="decision"]` — an attribute nothing in this app sets,
    // so it only ever copied its own not-found string.
    assert.ok(
      !railSource.includes("data-share-section"),
      "no copy control may scrape a selector the app does not render",
    );
    assert.ok(railSource.includes("formatBriefArtifact"), "the panel formats the real brief");
    assert.ok(
      railSource.includes("{briefText}"),
      "the preview renders the same string the copy button writes",
    );
    assert.ok(
      routeSource.includes("<BriefArtifactScript"),
      "the route publishes the brief the globally-mounted panel reads",
    );
  });

  it("keeps transition forecasting internal and off the hero surface", () => {
    const routeSource = readFileSync("app/page.tsx", "utf8");
    const heroSource = readFileSync("app/components/DecisionHero.tsx", "utf8");

    assert.ok(!routeSource.includes("transitionForecast="), "the route no longer passes a transition forecast into the hero");
    assert.ok(!heroSource.includes("transitionForecast"), "the hero no longer renders the transition forecast");
    assert.ok(!heroSource.includes("transitionProbability"), "a bare probability cannot be appended to the flip condition");
  });

  it("keeps the lower home handoff to the one-screen loop without a peer-route rail", () => {
    const routeSource = readFileSync("app/page.tsx", "utf8");
    const paletteSource = readFileSync("app/components/commandPalette.tsx", "utf8");

    assert.ok(!routeSource.includes("<DecisionRouteRail"), "home route no longer mounts a peer-route handoff rail");
    assert.ok(!routeSource.includes("<StageSwitcher"), "the interpretation-layer switch is gone from /");
    assert.ok(!routeSource.includes("<ViewSelector"), "the view selector is gone from /");
    assert.ok(!routeSource.includes("autoExpand="), "CompareStrip is a manual disclosure, not an auto-opened panel");

    // Demoted hubs stay reachable on demand: the command palette mounts every
    // IA navigation layer and its own history shortcut.
    assert.ok(paletteSource.includes("loopNavigationLayers"), "command palette mounts the IA navigation layers");
    assert.ok(paletteSource.includes('navigateTo("/history")'), "command palette keeps the history deep link");
  });

it("opens the command palette from the header search button", () => {
    const actionsSource = readFileSync("app/components/globalHeaderActionsClient.tsx", "utf8");
    const paletteSource = readFileSync("app/components/commandPalette.tsx", "utf8");

    assert.ok(actionsSource.includes('aria-label="Search"'), "header has a search button");
    assert.ok(actionsSource.includes("setShowPalette(true)"), "search button opens the command palette");
    assert.ok(paletteSource.includes("aria-label=\"Command palette\""), "command palette is accessible");
  });
});
