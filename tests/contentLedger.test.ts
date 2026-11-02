import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { answerPages } from "../app/answers/decisionPages";
import {
  contentLedger,
  latestReviewForSlug,
  orphanedLedgerSlugs,
  resolveAnswerUpdatedAt,
} from "../lib/answers/contentLedger";

/**
 * The ledger is the source of truth for "when was this answer last reviewed".
 * The page and the sitemap both read it, so a review cannot bump one and leave
 * the other on the old date.
 */
describe("content ledger", () => {
  it("names only answer pages that exist", () => {
    assert.deepEqual(orphanedLedgerSlugs(answerPages.map((page) => page.slug)), []);
  });

  it("dates a reviewed page from the ledger, not the page field", () => {
    const reviewed = contentLedger.answers[0];
    assert.ok(reviewed);
    assert.equal(resolveAnswerUpdatedAt(reviewed.slug), reviewed.changedAt);
    /* The page's own field is only the fallback for a page the ledger lacks. */
    assert.equal(resolveAnswerUpdatedAt("not-in-the-ledger", "2020-01-01"), "2020-01-01");
    assert.equal(resolveAnswerUpdatedAt("not-in-the-ledger"), undefined);
  });

  it("takes the newest row when a page is reviewed more than once", () => {
    const first = contentLedger.answers[0];
    assert.ok(first);
    const latest = latestReviewForSlug(first.slug);
    assert.ok(latest);
    for (const entry of contentLedger.answers) {
      if (entry.slug === first.slug) {
        assert.ok(latest.changedAt >= entry.changedAt, "a later review must win");
      }
    }
  });

  it("flags a ledger row whose page was renamed or deleted", () => {
    assert.deepEqual(orphanedLedgerSlugs(["some-other-page"]).length, contentLedger.answers.length);
  });
});
