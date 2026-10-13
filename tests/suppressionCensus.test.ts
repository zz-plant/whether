import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { censusFromConfig } from "suppression-census";

import { suppressionCensusConfig } from "../scripts/census.config";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The census guards every other ratchet in the gate, so the failure that matters
 * is not a wrong count — it is a scanner that quietly finds nothing and reports
 * a clean repo. The package's own suite pins its detection against fixtures; this
 * pins this repo's config against sites known to exist, because a config pointing
 * at the wrong roots reports zero and passes.
 */
describe("suppression census", () => {
  const census = censusFromConfig(REPO_ROOT, suppressionCensusConfig);

  it("detects the suppressions that are actually in the tree", () => {
    assert.ok(
      (census.counts.lintSuppressions ?? 0) > 0,
      "app/layout.tsx and worker/index.ts carry lint suppressions; finding none means the config is broken",
    );
    assert.ok(
      (census.counts.typeSuppressions ?? 0) > 0,
      "scripts/seo-weekly-runbook.ts and tests/seoRefreshQueue.test.ts carry type suppressions",
    );

    const lintFiles = new Set((census.hits.lintSuppressions ?? []).map((hit) => hit.file));
    assert.ok(lintFiles.has("app/layout.tsx"), "known suppression site went unseen");
    assert.ok(census.testFiles >= (suppressionCensusConfig.minimumTestFiles ?? 0), "the test-file pattern matched too little");
  });

  it("separates a rule that is off everywhere from one an override re-enables", () => {
    assert.ok(census.lintRules, "the config names .oxlintrc.json, so the rule audit must run");
    const { disabled, scoped } = census.lintRules;

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
    assert.equal(census.counts.skippedTests, 0);
  });

  it("counts a rule an override turns off, not just one that is off everywhere", () => {
    assert.ok(census.lintRules);
    const { overrideDisabled, disabled } = census.lintRules;

    // nextjs/no-html-link-for-pages is enforced repo-wide and off for app/layout.tsx
    // alone, because /feed.xml is a route handler serving a file. That is a
    // suppression with a wider reach than a disable comment, so it has to be counted
    // — otherwise silencing a rule per-file is the cheapest way past this census.
    assert.ok(overrideDisabled.includes("nextjs/no-html-link-for-pages"));
    assert.ok(!disabled.includes("nextjs/no-html-link-for-pages"));
  });
});
