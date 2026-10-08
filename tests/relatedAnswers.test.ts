import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { selectAnswersCiting, selectRelatedAnswers, type RelatedAnswerCandidate } from "../lib/seo/relatedAnswers";
import { answerPages } from "../app/answers/decisionPages";
import { isIndexableAnswerSlug } from "../lib/seo/indexationPolicy";

const candidate = (
  slug: string,
  overrides: Partial<RelatedAnswerCandidate> = {},
): RelatedAnswerCandidate => ({
  slug,
  title: slug,
  category: "decision",
  audience: "CEO/CFO",
  thresholdFocus: "both",
  mappedDecisionAreas: ["hiring"],
  ...overrides,
});

describe("related answers", () => {
  it("ranks by shared decision areas before anything else", () => {
    const page = candidate("page", { mappedDecisionAreas: ["hiring", "burn-discipline"] });
    const related = selectRelatedAnswers(page, [
      page,
      candidate("none", { mappedDecisionAreas: ["expansion-bets"] }),
      candidate("both", { mappedDecisionAreas: ["hiring", "burn-discipline"] }),
      candidate("one", { mappedDecisionAreas: ["burn-discipline"] }),
    ]);

    assert.deepEqual(related.map((entry) => entry.slug), ["both", "one", "none"]);
  });

  it("breaks ties on threshold focus, then audience, then slug", () => {
    const page = candidate("page", { thresholdFocus: "risk", audience: "CFO" });
    const related = selectRelatedAnswers(page, [
      page,
      candidate("d-audience-only", { thresholdFocus: "tightness", audience: "CFO" }),
      candidate("a-neither", { thresholdFocus: "tightness", audience: "VP Product" }),
      candidate("c-threshold-match", { thresholdFocus: "risk", audience: "VP Product" }),
      candidate("b-neither", { thresholdFocus: "tightness", audience: "VP Product" }),
    ], { limit: 4 });

    assert.deepEqual(
      related.map((entry) => entry.slug),
      ["c-threshold-match", "d-audience-only", "a-neither", "b-neither"],
    );
  });

  it("never links a page to itself", () => {
    const page = candidate("self");
    assert.deepEqual(selectRelatedAnswers(page, [page]), []);
  });

  it("skips candidates the caller rules out", () => {
    const page = candidate("page");
    const related = selectRelatedAnswers(page, [page, candidate("kept"), candidate("dropped")], {
      isEligible: (slug) => slug !== "dropped",
    });

    assert.deepEqual(related.map((entry) => entry.slug), ["kept"]);
  });

  /*
   * The defect this replaces: the old rule filtered for a *different* category
   * and took the first three in file order. With eight `decision` pages against
   * two `climate` and one `explanation`, those three were the only candidates —
   * so every decision page emitted the identical block.
   */
  it("no longer gives every decision page the same three links", () => {
    const decisionPages = answerPages.filter((page) => page.category === "decision");
    assert.ok(decisionPages.length > 3, "corpus still has enough decision pages for this to matter");

    const blocks = decisionPages.map((page) =>
      selectRelatedAnswers(page, answerPages, { isEligible: isIndexableAnswerSlug })
        .map((entry) => entry.slug)
        .join("|"));

    /*
     * Not `size > 1`: that passes when seven of eight pages still share one
     * block, which is the defect almost intact. Assert instead that no single
     * block is shared by more than a third of them.
     */
    const counts = new Map<string, number>();
    for (const block of blocks) counts.set(block, (counts.get(block) ?? 0) + 1);
    const largestShare = Math.max(...counts.values());

    assert.ok(
      largestShare <= Math.ceil(decisionPages.length / 3),
      `${largestShare} of ${decisionPages.length} decision pages share one related block`,
    );
  });

  it("only offers pages that are indexable", () => {
    for (const page of answerPages) {
      const related = selectRelatedAnswers(page, answerPages, { isEligible: isIndexableAnswerSlug });
      for (const entry of related) {
        assert.ok(isIndexableAnswerSlug(entry.slug), `${entry.slug} is linked but not indexable`);
      }
    }
  });
});

describe("answers citing a page", () => {
  const citing = (slug: string, hrefs: string[]) => ({ slug, supportingLinks: hrefs.map((href) => ({ href })) });

  it("returns the answers whose supporting links name the page, eligible ones only, in slug order", () => {
    const found = selectAnswersCiting(
      "/resources/guide",
      [citing("b", ["/resources/guide"]), citing("a", ["/signals", "/resources/guide"]), citing("c", ["/resources/other"]), citing("hidden", ["/resources/guide"])],
      { isEligible: (slug) => slug !== "hidden" },
    );
    assert.deepEqual(found.map((entry) => entry.slug), ["a", "b"]);
  });

  it("finds the hiring-freeze answer from the hiring-freeze guide", () => {
    const found = selectAnswersCiting("/resources/should-we-freeze-hiring-high-interest-rate-environment", answerPages, { isEligible: isIndexableAnswerSlug });
    assert.deepEqual(found.map((entry) => entry.slug), ["should-we-freeze-or-selectively-hire"]);
  });
});
