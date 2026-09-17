import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";

describe("home route render contract", () => {
  it("keeps the horizon control beside the card it changes", () => {
    /* It used to sit under `BelowTheFoldEvidence`, roughly 1,500px below the
       card it swaps, and reached back up with a `scrollIntoView` — so the only
       way to use it correctly was to be scrolled somewhere you had not asked to
       go, and the only way to discover it was to have already scrolled past
       everything it affects. It now sits in the meta row with the week
       switcher, which is where this page keeps its other period controls.

       A source read, and it has to be: the claim is about where in the document
       the control sits relative to another element, and this page suspends at
       its data boundary in this suite, so a render gives a shell. */
    const source = readFileSync("app/page.tsx", "utf8");
    assert.equal(source.split("<CadenceSelector").length - 1, 1);
    assert.ok(
      source.indexOf("<CadenceSelector") < source.indexOf("<DecisionHero"),
      "the horizon control must sit above the call it restates",
    );
    assert.ok(
      source.indexOf("<CadenceSelector") < source.indexOf("<BelowTheFoldEvidence"),
      "the horizon control must not be below the fold again",
    );
    const header = readFileSync("app/components/globalHeaderRouteGate.tsx", "utf8");
    assert.ok(!header.includes("<CadenceSelector"));
  });

  it("hands the client cadence selector data, never a function", () => {
    // `app/page.tsx` renders on the server. A function prop crossing into the
    // client control is not a warning: React refuses the whole render and the
    // homepage shows "This brief isn't rendering right now".
    const source = readFileSync("app/page.tsx", "utf8");
    const tag = source.slice(source.indexOf("<CadenceSelector"), source.indexOf("/>", source.indexOf("<CadenceSelector")) + 2);
    assert.doesNotMatch(tag, /=\{\s*(async\s*)?\(/, "no inline function crosses the server/client boundary");
    assert.doesNotMatch(tag, /onNavigate=/, "the callback form is for client callers only");
    /* The reveal prop is gone with the distance that required it. A control
       adjacent to its target has nothing to scroll to. */
    assert.doesNotMatch(tag, /revealTargetId/, "a control beside its target needs no reveal");
    assert.ok(source.includes('id="weekly-call"'), "the call region still anchors the page");
  });

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

    // Demoted hubs stay reachable on demand: the command palette mounts every
    // IA navigation layer and its own history shortcut.
    assert.ok(paletteSource.includes("loopNavigationLayers"), "command palette mounts the IA navigation layers");
    assert.ok(paletteSource.includes('navigateTo("/history")'), "command palette keeps the history deep link");
  });

  it("keeps the 2026-09-15 declutter: one control per job, one timeline, one plan CTA", () => {
    const routeSource = readFileSync("app/page.tsx", "utf8");

    // Each of these restated something the hero already carries, or recreated a
    // downstream page inline. The restatement it resolved is recorded in
    // docs/feature-specs-current.md; a render site returning here is a regression.
    for (const tag of [
      "<TimelineBar",
      "<SwipeableWeek",
      "<StressTestQuickCard",
      "<DirectAnswersStrip",
      "<WeeklyRetrospectiveCard",
      "<StageDropdownPill",
      "<SectionSignpost",
      "<BriefSectionNav",
    ]) {
      assert.ok(!routeSource.includes(tag), `${tag} has no render site on /`);
    }

    // One stage control at every width: the header's phone-only pill and the
    // hero's tablist above `sm` are complementary, and nothing else asks.
    const headerSource = readFileSync("app/components/globalHeaderRouteGate.tsx", "utf8");
    const heroSource = readFileSync("app/components/DecisionHero.tsx", "utf8");
    assert.match(headerSource, /<StageDropdownPill className="sm:hidden"/, "the header keeps the phone pill");
    assert.match(heroSource, /<div className="hidden sm:block">\s*<StagePersonaSelector/, "the hero keeps the sm+ tablist");
    const explainerSource = readFileSync("app/components/homeFirstRunOrientation.tsx", "utf8");
    assert.ok(!explainerSource.includes("OPERATOR_STAGE_OPTIONS"), "the first-run line no longer asks the stage a third time");

    // One planning CTA: the pill in the handoff.
    assert.equal(routeSource.split("<BelowTheFoldEvidence").length - 1, 1);
    assert.ok(!routeSource.includes("Open in Planning"), "no second plan CTA above the handoff");

    // The record date prints once, in the hero's trust line.
    assert.ok(!routeSource.includes("Data through {"), "the meta row does not restate the record date");

    // The sticky strip is the desktop floating pill; phones have the tab bar.
    const stripSource = readFileSync("app/components/StickyCallStrip.tsx", "utf8");
    assert.match(stripSource, /className="[^"]*\bhidden\b[^"]*\bmd:block\b/, "the strip renders from md up");
    assert.ok(!stripSource.includes("h-[4.75rem]"), "no spacer reserved for a strip phones no longer show");
  });

  it("opens the shared command palette from the header search button", () => {
    const actionsSource = readFileSync("app/components/globalHeaderActionsClient.tsx", "utf8");
    const paletteSource = readFileSync("app/components/commandPalette.tsx", "utf8");

    assert.ok(actionsSource.includes('aria-label="Search"'), "header has a search button");
    assert.ok(actionsSource.includes('new CustomEvent("whether-open-command-palette")'), "header uses the same palette as mobile and keyboard shortcuts");
    assert.ok(paletteSource.includes("aria-label=\"Command palette\""), "command palette is accessible");
  });
});
