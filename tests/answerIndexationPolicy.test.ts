import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import { answerPageContent } from "../lib/answerContentSource";
import { indexableAnswerSlugs, isIndexableAnswerSlug } from "../lib/seo/indexationPolicy";
import { buildAnswerInterpretationLabel } from "../lib/report/seoDecisionPayload";

/**
 * The allowlist and the quality gate have to agree.
 *
 * They did not. The gate blocked five of eleven answers with
 * `cluster-duplicate-no-distinct-datapoint-or-interpretation`, and two of those
 * five were on the allowlist — submitted in the sitemap while rendering
 * `noindex`, which spends crawl budget to be told the page is not wanted. The
 * other three were withheld permanently for a reason no edit to those pages
 * could clear.
 *
 * The cause was structural: the decision cluster has eight pages and the engine
 * has five decision areas, so by pigeonhole at least three pages share a primary
 * rule — and the interpretation label was built from that rule alone, ignoring
 * the answer each page states in its own words.
 */
describe("answer indexation policy", () => {
  it("lists only slugs that exist", () => {
    const slugs = new Set(answerPageContent.map((page) => page.slug));
    for (const slug of indexableAnswerSlugs) {
      assert.ok(slugs.has(slug), `${slug} is allowlisted but has no page`);
    }
  });

  it("indexes the whole published set — the allowlist and the content agree", () => {
    /* Every page ships indexable; a page added to the content without this
       allowlist would publish unlisted, so the two are held equal here. */
    assert.equal(indexableAnswerSlugs.length, answerPageContent.length);
  });

  it("gives every page a distinct interpretation within its category", () => {
    /* The property the gate actually tests, asserted directly against the
       content rather than through a live report read — this runs offline and
       the editorial half of the label is what the fix added. */
    const byCategory = new Map<string, string[]>();
    for (const page of answerPageContent) {
      const label = buildAnswerInterpretationLabel({
        editorialAngle: page.shortAnswer,
        currentCall: "shared-call",
        immediateAction: "shared-action",
      });
      byCategory.set(page.category, [...(byCategory.get(page.category) ?? []), label]);
    }

    for (const [category, labels] of byCategory) {
      assert.equal(
        new Set(labels).size,
        labels.length,
        `two pages in "${category}" state the same answer`,
      );
    }
  });

  it("keeps the editorial answer inside the label", () => {
    /* The page's own sentence is the half the gate could not see. If the label
       ever goes back to the engine-derived pair, every page sharing a primary
       rule collides again and the allowlist silently becomes a lie. */
    const label = buildAnswerInterpretationLabel({
      editorialAngle: "Expand only where pipeline quality and payback support it.",
      currentCall: "shared-call",
      immediateAction: "shared-action",
    });

    assert.ok(label.includes("pipeline quality"));
    assert.notEqual(label, "shared-call|shared-action");
  });

  it("allowlists every page, now that every page passes", () => {
    for (const page of answerPageContent) {
      assert.ok(isIndexableAnswerSlug(page.slug), `${page.slug} is published but not indexable`);
    }
  });
});
