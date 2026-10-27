import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildGuidedTranslationHref,
  GuidedTranslationPanels,
  resolveGuidedTranslationState,
} from "../app/resources/components/guidedTranslationPanels";
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
});
