import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildAnswerSectionHeadings } from "../lib/seo/answerSectionHeadings";
import { answerPages } from "../app/answers/decisionPages";

describe("answer section headings", () => {
  it("names the page's audience, areas, and threshold focus", () => {
    const headings = buildAnswerSectionHeadings({
      audience: "CEO/CFO",
      mappedDecisionAreas: ["capital-raising", "burn-discipline"],
      thresholdFocus: "tightness",
    });

    assert.equal(headings.posture, "What this means for CEO/CFO");
    assert.equal(headings.rules, "Rules in force: capital raising and burn discipline");
    assert.equal(headings.threshold, "What would flip this answer: funding pressure");
    assert.equal(headings.next, "Next for capital raising and burn discipline");
  });

  it("reads one area without a conjunction and three with one", () => {
    assert.equal(
      buildAnswerSectionHeadings({ audience: "a", mappedDecisionAreas: ["hiring"], thresholdFocus: "risk" }).rules,
      "Rules in force: hiring",
    );
    assert.equal(
      buildAnswerSectionHeadings({
        audience: "a",
        mappedDecisionAreas: ["hiring", "product-tempo", "burn-discipline"],
        thresholdFocus: "both",
      }).rules,
      "Rules in force: hiring, product tempo and burn discipline",
    );
  });

  /*
   * The defect this replaces: every answer page rendered the same six `h2`s,
   * so the outline said the eleven pages were one template. A corpus where two
   * pages still share a full heading set would be that defect surviving.
   */
  it("gives every answer page a distinct set of headings", () => {
    const sets = answerPages.map((page) => JSON.stringify(buildAnswerSectionHeadings(page)));
    assert.equal(new Set(sets).size, answerPages.length);
  });

  it("keeps the button and provenance labels fixed, because they label the same thing everywhere", () => {
    for (const page of answerPages) {
      const headings = buildAnswerSectionHeadings(page);
      assert.equal(headings.copy, "Copy this answer");
      assert.equal(headings.citation, "Citation");
    }
  });
});
