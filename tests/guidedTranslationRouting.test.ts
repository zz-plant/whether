import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildGuidedTranslationHref,
  GuidedTranslationPanels,
  resolveGuidedTranslationState,
} from "../app/resources/components/guidedTranslationPanels";
import { findStakeholderGuide, selectHearingForAreas, stakeholderGuides } from "../app/guides/stakeholderGuides";
import { HearingSection } from "../app/components/home/HearingSection";
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

  it("gives every role a thread of what it may hear, with an answer for each", () => {
    for (const guide of stakeholderGuides) {
      assert.ok(guide.avatar.length >= 1 && guide.avatar.length <= 4, `${guide.slug}: the badge fits its circle`);
      assert.ok(guide.hearing.length >= 2, `${guide.slug}: a thread needs at least two questions`);

      const questions = guide.hearing.map((entry) => entry.question);
      assert.equal(new Set(questions).size, questions.length, `${guide.slug}: questions are not repeated`);

      for (const entry of guide.hearing) {
        assert.ok(entry.from.trim().length > 0, `${guide.slug}: every question names who is asking`);
        assert.ok(entry.question.endsWith("?"), `${guide.slug}: "${entry.question}" is asked as a question`);
        assert.ok(entry.answer.trim().length > 0, `${guide.slug}: every question has an answer`);
        assert.ok(!entry.answer.trim().endsWith("?"), `${guide.slug}: "${entry.answer}" answers rather than asks`);
      }
    }
  });

  it("selects one question per crossed area, group and speaker for the homepage", () => {
    assert.deepEqual(selectHearingForAreas([]), [], "a week with no crossed line says nothing");

    const hiring = selectHearingForAreas(["hiring"]);
    assert.equal(hiring.length, 1);
    assert.equal(hiring[0]?.hearing.area, "hiring");

    const spending = selectHearingForAreas(["burn-discipline"]);
    assert.ok(spending.length > 0);
    const speakers = spending.map((pick) => pick.hearing.from);
    assert.equal(new Set(speakers).size, speakers.length, "one bubble per speaker");

    const groups = spending.map((pick) => pick.guide.slug);
    assert.equal(new Set(groups).size, groups.length, "one bubble per role thread");

    const both = selectHearingForAreas(["hiring", "burn-discipline"]);
    assert.ok(both.length >= 2);
    assert.ok(both.length <= 3, "the section stays compact");
    assert.ok(both.every((pick) => pick.hearing.area !== undefined), "only area-tagged questions are selected");

    const taggedAreas = new Set(
      stakeholderGuides.flatMap((guide) => guide.hearing.flatMap((entry) => (entry.area ? [entry.area] : []))),
    );
    for (const area of taggedAreas) {
      assert.ok(selectHearingForAreas([area]).length > 0, `${area} selects a question`);
    }
  });

  it("renders the thread inside the role panel and not on a stage-only view", () => {
    const roleHtml = renderToStaticMarkup(
      createElement(GuidedTranslationPanels, { searchParams: { stakeholder: "finance-leaders" } }),
    );
    const guide = findStakeholderGuide("finance-leaders");
    assert.ok(guide);

    /* React escapes apostrophes, so the comparison reads the text the browser shows. */
    const visibleText = roleHtml.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

    assert.match(visibleText, /What you may be hearing/);
    for (const entry of guide.hearing) {
      assert.ok(visibleText.includes(entry.from), "the speaker is named in the bubble");
      assert.ok(visibleText.includes(entry.question), "the question the reader may hear is rendered");
      assert.ok(visibleText.includes(entry.answer), "the published answer sits under it");
    }

    const stageHtml = renderToStaticMarkup(
      createElement(GuidedTranslationPanels, { searchParams: { stage: "series-a" } }),
    );
    assert.doesNotMatch(stageHtml, /What you may be hearing/);
  });

  it("renders the homepage section from the crossed lines, and nothing without them", () => {
    const empty = renderToStaticMarkup(createElement(HearingSection, { entries: [] }));
    assert.equal(empty, "");

    const entries = selectHearingForAreas(["burn-discipline"]);
    const html = renderToStaticMarkup(createElement(HearingSection, { entries }));
    assert.match(html, /What you may be hearing/);
    assert.match(html, /id="what-you-may-hear"/);
    for (const { hearing } of entries) {
      assert.ok(html.includes(hearing.from));
      assert.ok(html.includes(hearing.answer.replace(/'/g, "&#x27;")));
    }
  });
});
