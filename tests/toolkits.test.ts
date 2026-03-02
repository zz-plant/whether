import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toolkitDefinitions } from "../lib/informationArchitecture";

describe("toolkit definitions", () => {
  it("provides built-out operating guidance for each toolkit", () => {
    for (const toolkit of toolkitDefinitions) {
      assert.ok(toolkit.operatingOutcome.length > 30, `${toolkit.slug} should include a concrete operating outcome`);
      assert.ok(toolkit.timeToRun.length > 10, `${toolkit.slug} should include expected runtime guidance`);
      assert.ok(toolkit.recommendedParticipants.length > 20, `${toolkit.slug} should specify who should run the toolkit`);
      assert.ok(toolkit.prepChecklist.length >= 3, `${toolkit.slug} should include prep checklist items`);
      assert.ok(toolkit.successSignals.length >= 3, `${toolkit.slug} should include success signals`);
      assert.ok(toolkit.runSequence.length >= 3, `${toolkit.slug} should include at least three execution phases`);

      for (const item of toolkit.prepChecklist) {
        assert.ok(item.length > 20, `${toolkit.slug} prep item should be concrete`);
      }

      for (const item of toolkit.successSignals) {
        assert.ok(item.length > 20, `${toolkit.slug} success signal should be concrete`);
      }

      for (const step of toolkit.runSequence) {
        assert.ok(step.objective.length > 20, `${toolkit.slug}:${step.phase} should have a real objective`);
        assert.ok(step.prompts.length >= 2, `${toolkit.slug}:${step.phase} should include facilitation prompts`);
        assert.ok(step.deliverable.length > 15, `${toolkit.slug}:${step.phase} should name an explicit deliverable`);
      }
    }
  });
});
