import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { featuredAnswerPages } from "../app/answers/selectors";
import { answerPages } from "../app/answers/decisionPages";
import { getResourceArticleDecisionAreas } from "../lib/resourceArticles";
import { indexableAnswerSlugs } from "../lib/seo/indexationPolicy";

describe("canonical content selectors", () => {
  it("keeps featured answer pages sourced from canonical answer registry", () => {
    assert.ok(featuredAnswerPages.length >= 6);
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

  it("lists every indexable answer on the hub, not only the ordered ones", () => {
    const listed = new Set(featuredAnswerPages.map((page) => page.slug));
    for (const slug of indexableAnswerSlugs) {
      assert.ok(listed.has(slug), `${slug} is in the sitemap but not on /resolve`);
    }
    assert.equal(new Set(featuredAnswerPages.map((page) => page.slug)).size, featuredAnswerPages.length);
  });

  it("maps resource article intents to bounded decision areas", () => {
    const boardAreas = getResourceArticleDecisionAreas({
      slug: "how-much-runway-do-we-need-tightening-market",
      title: "t",
      description: "d",
      keyword: "k",
      cluster: "pain",
      intent: "board",
      format: "guide",
      boardSummary: [],
      sections: [],
      faqs: [],
      toolLink: { href: "/resources/capital-posture-template", label: "Tool" },
    });

    assert.ok(boardAreas.includes("capital-raising"));
    assert.ok(boardAreas.includes("expansion-bets"));
  });
});
