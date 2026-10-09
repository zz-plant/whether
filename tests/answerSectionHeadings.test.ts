import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildAnswerSectionHeadings } from "../lib/seo/answerSectionHeadings";
import { answerPages } from "../app/answers/decisionPages";

describe("answer section headings", () => {
  it("uses the page's own heading, areas, and threshold focus", () => {
    const headings = buildAnswerSectionHeadings({
      applyHeading: "When to start the raise",
      mappedDecisionAreas: ["capital-raising", "burn-discipline"],
      thresholdFocus: "tightness",
    });

    assert.equal(headings.posture, "When to start the raise");
    assert.equal(headings.rules, "Rules in force: fundraising and spending");
    assert.equal(headings.threshold, "What would change this answer: funding pressure");
    assert.equal(headings.next, "Next for fundraising and spending");
  });

  it("reads one area without a conjunction and three with one", () => {
    assert.equal(
      buildAnswerSectionHeadings({ applyHeading: "a", mappedDecisionAreas: ["hiring"], thresholdFocus: "risk" }).rules,
      "Rules in force: hiring",
    );
    assert.equal(
      buildAnswerSectionHeadings({
        applyHeading: "a",
        mappedDecisionAreas: ["hiring", "product-tempo", "burn-discipline"],
        thresholdFocus: "both",
      }).rules,
      "Rules in force: hiring, roadmap and spending",
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

  /* "What this means for {audience}" named who reads the section, not what it
     answers, and the review on 2026-10-09 read it as boilerplate. The heading is
     the page's own now, and it never names an audience. */
  it("heads the apply section with the answer's own question, never the audience", () => {
    for (const page of answerPages) {
      const { posture } = buildAnswerSectionHeadings(page);
      assert.doesNotMatch(posture, /^What this means for/);
      assert.ok(!posture.includes(page.audience), `${page.slug}: heading names the audience`);
    }
    assert.equal(new Set(answerPages.map((page) => page.applyHeading)).size, answerPages.length);
  });

  it("keeps the button and provenance labels fixed, because they label the same thing everywhere", () => {
    for (const page of answerPages) {
      const headings = buildAnswerSectionHeadings(page);
      assert.equal(headings.copy, "Copy this answer");
      assert.equal(headings.citation, "Citation");
    }
  });
});
