import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildGuidedTranslationHref,
  GuidedTranslationPanels,
  resolveGuidedTranslationState,
} from "../app/resources/components/guidedTranslationPanels";
import { findStakeholderGuide, stakeholderGuides } from "../app/guides/stakeholderGuides";
import { operationsSectionLinks } from "../lib/navigation/planningNavigation";

describe("guided translation routing", () => {
  it("routes guide selections to their rendered results", () => {
    assert.equal(buildGuidedTranslationHref(), "/resources#guided-translation");
    assert.equal(
      buildGuidedTranslationHref({ stakeholder: "founders-ceos" }),
      "/resources?stakeholder=founders-ceos#guided-translation-results",
    );
    assert.equal(
      buildGuidedTranslationHref({ stage: "series-a", library: "stages" }),
      "/resources?stage=series-a&library=stages#guided-translation-results",
    );
    assert.equal(
      buildGuidedTranslationHref({ stakeholder: "heads-of-product", stage: "series-b" }),
      "/resources?stakeholder=heads-of-product&stage=series-b#guided-translation-results",
    );
  });

  it("targets results only when a selection actually renders a panel", () => {
    for (const params of [
      { stakeholder: "founders-ceos" },
      { stage: "series-a" },
      { library: "stages" },
      { stakeholder: "missing", stage: "series-a" },
    ]) {
      const html = renderToStaticMarkup(createElement(GuidedTranslationPanels, { searchParams: params }));
      const hash = buildGuidedTranslationHref(params).split("#")[1];
      assert.ok(html.includes(`id="${hash}"`), "selection link must land on its visible result");
    }
    for (const params of [undefined, {}, { stakeholder: "missing" }, { stage: "missing" }, { library: "missing" }]) {
      assert.equal(renderToStaticMarkup(createElement(GuidedTranslationPanels, { searchParams: params })), "");
      assert.ok(buildGuidedTranslationHref(params).endsWith("#guided-translation"), "empty or invalid choices return to the browse controls");
    }
  });

  it("resolves selected stakeholder and stage data from query state", () => {
    const state = resolveGuidedTranslationState({
      stakeholder: "heads-of-product",
      stage: "series-b",
    });

    assert.equal(state.selectedStakeholder?.slug, "heads-of-product");
    assert.equal(state.selectedStage?.slug, "series-b");
    assert.ok(state.relatedStakeholderGuides.some((guide) => guide.slug === "heads-of-product"));
    assert.equal(state.showStageLibrary, true);
  });

  it("keeps planning section links aligned with the new risk-check insertion", () => {
    assert.ok(operationsSectionLinks.plan.some((link) => link.href === "#ops-failure-patterns"));
  });

  it("keeps translation panels hidden until a role or stage is selected", () => {
    const defaultHtml = renderToStaticMarkup(createElement(GuidedTranslationPanels));
    const selectedHtml = renderToStaticMarkup(
      createElement(GuidedTranslationPanels, {
        searchParams: { stakeholder: "heads-of-product" },
      }),
    );

    assert.equal(defaultHtml, "");
    assert.match(selectedHtml, /Selected view details/);
    /* The team's own name heads its panel; a "Team view" kicker sat over it until 2026-10-09. */
    assert.match(selectedHtml, /<h3[^>]*>[^<]+<\/h3>/);
    assert.doesNotMatch(selectedHtml, /Team view/);
  });

  it("gives every role a thread of what it may hear — pushback, takes and questions — with a reply for each", () => {
    let statementCount = 0;
    let questionCount = 0;

    for (const guide of stakeholderGuides) {
      assert.ok(guide.avatar.length >= 1 && guide.avatar.length <= 4, `${guide.slug}: the badge fits its circle`);
      assert.ok(guide.hearing.length >= 2, `${guide.slug}: a thread needs at least two exchanges`);

      const prompts = guide.hearing.map((entry) => entry.question);
      assert.equal(new Set(prompts).size, prompts.length, `${guide.slug}: prompts are not repeated`);

      for (const entry of guide.hearing) {
        assert.ok(entry.from.trim().length > 0, `${guide.slug}: every exchange names who is speaking`);
        assert.ok(
          /[.?]$/.test(entry.question.trim()),
          `${guide.slug}: "${entry.question}" is a complete statement or question`,
        );
        if (entry.question.trim().endsWith("?")) questionCount += 1;
        else statementCount += 1;
        assert.ok(entry.answer.trim().length > 0, `${guide.slug}: every exchange has a reply`);
        assert.ok(!entry.answer.trim().endsWith("?"), `${guide.slug}: "${entry.answer}" answers rather than asks`);
      }
    }

    assert.ok(statementCount > 0, "includes pushback and competing takes, not only questions");
    assert.ok(questionCount > 0, "includes direct questions alongside pushback");
  });

  it("renders the thread inside the role panel, excludes the active role from the switcher, and omits the thread on a stage-only view", () => {
    const roleHtml = renderToStaticMarkup(
      createElement(GuidedTranslationPanels, { searchParams: { stakeholder: "finance-leaders" } }),
    );
    const guide = findStakeholderGuide("finance-leaders");
    assert.ok(guide);

    /* React escapes apostrophes, so the comparison reads the text the browser shows. */
    const visibleText = roleHtml.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

    assert.match(visibleText, /What your team will ask/);
    assert.match(visibleText, /What to say/);
    assert.doesNotMatch(visibleText, /Open CFOs and finance leads view/, "does not offer to open the role already on screen");
    assert.match(visibleText, /Open Engineering leads view/, "all other roles are reachable");
    for (const entry of guide.hearing) {
      assert.ok(visibleText.includes(entry.from), "the speaker is named in the bubble");
      assert.ok(visibleText.includes(entry.question), "what the reader may hear is rendered");
      assert.ok(visibleText.includes(entry.answer), "the published reply sits under it");
    }

    const stageHtml = renderToStaticMarkup(
      createElement(GuidedTranslationPanels, { searchParams: { stage: "series-a" } }),
    );
    assert.doesNotMatch(stageHtml, /What your team will ask/);
  });


});
