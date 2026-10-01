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
      source.indexOf("<CadenceSelector") < source.indexOf("<DoAndShareSection"),
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
    /* The hero was unpacked into the five sections a reader asks for, in that
       order, on 2026-09-22: the call, what changed, what it changes by area,
       what would change the call, and what to do. The rule this case has always
       carried is unchanged — each thing is stated once, by the surface that
       owns it — so the assertions follow the content to its new owners.

       A source read, and it has to be: the claim is about which file mounts
       what, and this page suspends at its data boundary in this suite. */
    const routeSource = readFileSync("app/page.tsx", "utf8");

    for (const section of [
      "<WhatChangedSection",
      "<WhatItChangesSection",
      "<WhatWouldChangeSection",
      "<DoAndShareSection",
    ]) {
      assert.equal(routeSource.split(section).length - 1, 1, `${section} is mounted exactly once`);
    }

    // The order in the document is the order of the questions.
    const order = ["<DecisionHero", "<WhatChangedSection", "<WhatItChangesSection", "<WhatWouldChangeSection", "<DoAndShareSection"]
      .map((tag) => routeSource.indexOf(tag));
    assert.deepEqual([...order].sort((a, b) => a - b), order, "the sections read in the reader's order");
    // CSS must not reverse that reading order for sighted phone users.
    const changedSource = readFileSync("app/components/home/WhatChangedSection.tsx", "utf8");
    const consequencesSource = readFileSync("app/components/home/WhatItChangesSection.tsx", "utf8");
    assert.match(changedSource, /className="order-2"/);
    assert.match(consequencesSource, /className="order-3"/);

    // The hero is the state tier and nothing else: every number it used to
    // carry is a section's now, so it takes no score props at all.
    const heroSource = readFileSync("app/components/DecisionHero.tsx", "utf8");
    for (const prop of ["tightness", "riskAppetite", "boldnessScore", "signalData", "boundedConditions"]) {
      assert.ok(!heroSource.includes(`${prop}?:`), `the hero no longer takes ${prop}`);
    }
    assert.ok(!routeSource.includes("<DeltaTrustStrip"), "trust is the one strip under the call, not a duplicate summary card");
    assert.ok(!routeSource.includes("<FlipMeter"), "what would change the call is a section, not a barometer card");
  });

  it("keeps one canonical copy action in the homepage body", () => {
    // One one-tap `Copy Brief`, under `DecisionHero`. The header `Export` menu is the format picker and
    // `StickyCallStrip` is its on-scroll persistence — no third in-body copy button.
    //
    // This used to assert against `ThreeWhethersCard`, which 69221739 stopped rendering and
    // which is now deleted. The DD-005 rule it protected is unchanged, so it moves to the
    // one other body surface that carries a copy control: the non-weekly cadence lead.
    const actSource = readFileSync("app/components/home/DoAndShareSection.tsx", "utf8");
    const cadenceSource = readFileSync("app/components/CadenceCallCard.tsx", "utf8");

    // It sits directly under the call card (2026-09-30): on the first screen,
    // outside the card people screenshot. The hero is the state tier and carries
    // no controls, and the act section no longer repeats it — one button, one place.
    const routeSource = readFileSync("app/page.tsx", "utf8");
    assert.equal(routeSource.split("<ShareBriefButton").length - 1, 1, "one canonical copy action on the route");
    const heroIndex = routeSource.indexOf("<DecisionHero");
    const copyIndex = routeSource.indexOf("<ShareBriefButton");
    assert.ok(heroIndex > -1 && copyIndex > heroIndex, "Copy Brief follows the call card");
    // It folds with the brief on a first visit, where the decision picker takes its place.
    const copyRow = routeSource.slice(routeSource.lastIndexOf("<div", copyIndex), copyIndex);
    assert.match(copyRow, /data-first-visit-collapsible=\{offersFirstVisitFold/, "Copy Brief folds on a first visit");
    assert.ok(!actSource.includes("<ShareBriefButton"), "the act section does not repeat it");
    const heroSource = readFileSync("app/components/DecisionHero.tsx", "utf8");
    assert.ok(!heroSource.includes("<ShareBriefButton"), "no copy action inside the screenshot card");
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

    // One control per axis at every width: the header's phone-only pills and
    // the hero's tablists above `sm` are complementary, and nothing else asks.
    const headerSource = readFileSync("app/components/globalHeaderRouteGate.tsx", "utf8");
    assert.match(
      headerSource,
      /<div [^>]*className="[^"]*\bsm:hidden\b[^"]*"[^>]*>\s*<StageDropdownPill \/>\s*<RunwayDropdownPill \/>/,
      "the header keeps the phone pills, and only there",
    );
    const consequencesSource = readFileSync("app/components/home/WhatItChangesSection.tsx", "utf8");
    assert.match(
      consequencesSource,
      /<div className="hidden sm:flex[^"]*">\s*<StagePersonaSelector[^>]*\/>\s*<RunwayPersonaSelector/,
      "the sm+ tablists sit with the rules they reshape",
    );
    assert.ok(!routeSource.includes("<RunwayDropdownPill"), "<RunwayDropdownPill has no render site on /");
    const explainerSource = readFileSync("app/components/homeFirstRunOrientation.tsx", "utf8");
    assert.ok(!explainerSource.includes("OPERATOR_STAGE_OPTIONS"), "the first-run line no longer asks the stage a third time");

    // One planning CTA: the pill in the act section.
    assert.equal(routeSource.split("<DoAndShareSection").length - 1, 1);
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
