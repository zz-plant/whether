import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { featuredAnswerPages } from "../app/answers/selectors";
import { answerPages } from "../app/answers/decisionPages";
import { getResourceArticleDecisionAreas } from "../lib/resourceArticles";

describe("canonical content selectors", () => {
  it("keeps featured answer pages sourced from canonical answer registry", () => {
    assert.ok(featuredAnswerPages.length >= 8);
    assert.deepEqual(
      featuredAnswerPages.slice(0, 3).map((page) => page.slug),
      [
        "should-startups-hire-engineers-right-now",
        "should-startups-slow-roadmap-expansion",
        "is-it-risk-on-or-risk-off-for-startups",
      ],
    );

    for (const page of featuredAnswerPages) {
      assert.ok(answerPages.some((candidate) => candidate.slug === page.slug));
    }
  });

  it("maps resource article intents to bounded decision areas", () => {
    const vpProductAreas = getResourceArticleDecisionAreas({
      slug: "platform-rewrites-during-capital-tightening-risk-analysis",
      title: "t",
      description: "d",
      keyword: "k",
      cluster: "pain",
      intent: "vp-product",
      format: "guide",
      boardSummary: [],
      sections: [],
      faqs: [],
      toolLink: { href: "/resources/capital-posture-template", label: "Tool" },
    });

    assert.ok(vpProductAreas.includes("product-tempo"));
    assert.ok(vpProductAreas.includes("expansion-bets"));
  });
});
