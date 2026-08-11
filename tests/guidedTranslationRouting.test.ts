import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildGuidedTranslationHref,
  GuidedTranslationPanels,
  resolveGuidedTranslationState,
} from "../app/answer/components/guidedTranslationPanels";
import { operationsSectionLinks } from "../lib/navigation/planningNavigation";

describe("guided translation routing", () => {
  it("routes guide selections into the canonical decide translation anchor", () => {
    assert.equal(buildGuidedTranslationHref(), "/answer#guided-translation");
    assert.equal(
      buildGuidedTranslationHref({ stakeholder: "founders-ceos" }),
      "/answer?stakeholder=founders-ceos#guided-translation",
    );
    assert.equal(
      buildGuidedTranslationHref({ stage: "series-a", library: "stages" }),
      "/answer?stage=series-a&library=stages#guided-translation",
    );
    assert.equal(
      buildGuidedTranslationHref({ stakeholder: "heads-of-product", stage: "series-b" }),
      "/answer?stakeholder=heads-of-product&stage=series-b#guided-translation",
    );
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
    assert.match(selectedHtml, /Team view/);
  });
});
