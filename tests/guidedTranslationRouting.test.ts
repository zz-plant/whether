import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGuidedTranslationHref,
  resolveGuidedTranslationState,
} from "../app/decide/components/guidedTranslationPanels";
import { operationsSectionLinks } from "../lib/navigation/operationsNavigation";

describe("guided translation routing", () => {
  it("routes guide selections into the canonical decide translation anchor", () => {
    assert.equal(buildGuidedTranslationHref(), "/decide#guided-translation");
    assert.equal(
      buildGuidedTranslationHref({ stakeholder: "founders-ceos" }),
      "/decide?stakeholder=founders-ceos#guided-translation",
    );
    assert.equal(
      buildGuidedTranslationHref({ stage: "series-a", library: "stages" }),
      "/decide?stage=series-a&library=stages#guided-translation",
    );
    assert.equal(
      buildGuidedTranslationHref({ stakeholder: "heads-of-product", stage: "series-b" }),
      "/decide?stakeholder=heads-of-product&stage=series-b#guided-translation",
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
});
