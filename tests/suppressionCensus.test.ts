import { describe, it } from "bun:test";
import assert from "node:assert/strict";

import { auditLintRules, takeCensus } from "../scripts/check-suppression-census";

/**
 * The census guards every other ratchet in the gate, so the failure that matters
 * is not a wrong count — it is a scanner that quietly finds nothing and reports
 * a clean repo. A test that only asserted "counts are within baseline" would pass
 * against exactly that bug, so these pin detection against sites known to exist.
 */
describe("suppression census", () => {
  it("detects the suppressions that are actually in the tree", () => {
    const census = takeCensus();

    assert.ok(
      census.counts.lintSuppressions > 0,
      "app/layout.tsx and worker/index.ts carry lint suppressions; finding none means the scanner is broken",
    );
    assert.ok(
      census.counts.typeSuppressions > 0,
      "scripts/seo-weekly-runbook.ts and tests/uiCaptureLib.test.ts carry type suppressions",
    );

    const lintFiles = new Set(census.hits.lintSuppressions.map((hit) => hit.file));
    assert.ok(lintFiles.has("app/layout.tsx"), "known suppression site went unseen");
  });

  it("does not count the census or its own test as debt", () => {
    const census = takeCensus();
    const scanned = [
      ...census.hits.lintSuppressions,
      ...census.hits.typeSuppressions,
      ...census.hits.skippedTests,
    ].map((hit) => hit.file);

    // Both files spell every pattern out as a literal. Counting them would make
    // the census rise whenever it gained a category.
    assert.ok(!scanned.includes("scripts/check-suppression-census.ts"));
    assert.ok(!scanned.includes("tests/suppressionCensus.test.ts"));
  });

  it("separates a rule that is off everywhere from one an override re-enables", () => {
    const { disabled, scoped } = auditLintRules();

    // Both are "off" at the top level only so an `overrides` block can apply them
    // where they matter — the two file-size budgets and the lib/report/home import
    // fence. Counting those as debt would make the baseline unclearable.
    assert.ok(scoped.includes("max-lines"));
    assert.ok(scoped.includes("no-restricted-imports"));

    assert.ok(!disabled.includes("max-lines"));
    assert.ok(!disabled.includes("no-restricted-imports"));

    // Burned down and enforced; none may drift back into the disabled set.
    for (const rule of [
      "no-unused-vars",
      "no-useless-escape",
      "no-extra-boolean-cast",
      "no-useless-rename",
      "no-irregular-whitespace",
      "unicorn/no-useless-fallback-in-spread",
      "unicorn/no-thenable",
      "unicorn/no-new-array",
      "react/purity",
      "react/refs",
      "nextjs/no-html-link-for-pages",
      "jsx-a11y/label-has-associated-control",
      "jsx-a11y/no-noninteractive-tabindex",
      "jsx-a11y/no-autofocus",
      "jsx-a11y/click-events-have-key-events",
      "jsx-a11y/no-static-element-interactions",
    ]) {
      assert.ok(!disabled.includes(rule), `${rule} was re-disabled`);
    }
  });

  it("counts no skipped tests, which is the state the baseline pins", () => {
    assert.equal(takeCensus().counts.skippedTests, 0);
  });

  it("counts a rule an override turns off, not just one that is off everywhere", () => {
    const { overrideDisabled, disabled } = auditLintRules();

    // nextjs/no-html-link-for-pages is enforced repo-wide and off for app/layout.tsx
    // alone, because /feed.xml is a route handler serving a file. That is a
    // suppression with a wider reach than a disable comment, so it has to be counted
    // — otherwise silencing a rule per-file is the cheapest way past this census.
    assert.ok(overrideDisabled.includes("nextjs/no-html-link-for-pages"));
    assert.ok(!disabled.includes("nextjs/no-html-link-for-pages"));
  });
});
