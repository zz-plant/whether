import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { composeArticleSections, ResourceArticlePage } from "../app/resources/components/resourceArticlePage";
import type { ResourceArticle } from "../lib/resourceArticles";

const baseArticle: ResourceArticle = {
  slug: "should-we-freeze-hiring-high-interest-rate-environment",
  publishedAt: "2026-03-03",
  updatedAt: "2026-09-22",
  title: "Test title",
  description: "Test description",
  keyword: "test keyword",
  cluster: "pain",
  intent: "cfo",
  format: "guide",
  boardSummary: ["Summary item"],
  sections: [
    {
      heading: "Anchor Stable Heading",
      paragraphs: ["A paragraph."],
    },
  ],
  faqs: [{ question: "Q?", answer: "A." }],
  toolLink: { href: "/resources/capital-posture-template", label: "Tool" },
};

describe("resource article page dating and links", () => {
  it("prints the date the title's freshness marker names", () => {
    const html = renderToStaticMarkup(<ResourceArticlePage article={baseArticle} />);
    assert.match(html, /Updated <time dateTime="2026-09-22">Sep 22, 2026<\/time>/);
  });

  it("links the answers that carry this week's guidance on the same question", () => {
    const html = renderToStaticMarkup(
      <ResourceArticlePage
        article={baseArticle}
        decisionArtifact={{
          decisionShiftSummary: "Nothing changed.",
          postureSummary: "Conditions are Freezing.",
          mappedRules: [],
          freshnessLabel: "Oct 8, 2026",
          recordDateLabel: "Oct 6, 2026",
          weeklyAnswers: [{ href: "/answers/should-we-freeze-or-selectively-hire", title: "Should we freeze hiring this week?" }],
        }}
      />,
    );
    assert.match(html, /href="\/answers\/should-we-freeze-or-selectively-hire"[^>]*>Should we freeze hiring this week\?<\/a>/);
  });
});

describe("resource article page section composition", () => {
  it("defaults to article-only sections when includeSharedDeepDive is not set", () => {
    const sections = composeArticleSections(baseArticle);

    assert.equal(sections.length, 1);
    assert.equal(sections[0]?.heading, "Anchor Stable Heading");
  });

  it("includes shared deep-dive sections only when includeSharedDeepDive is true", () => {
    const sections = composeArticleSections({ ...baseArticle, includeSharedDeepDive: true });

    assert.ok(sections.length > baseArticle.sections.length);
    assert.equal(sections[0]?.heading, "Anchor Stable Heading");
    assert.ok(sections.some((section) => section.heading === "Implementation operating cadence (weeks 1-12)"));
  });

  it("keeps section anchor generation stable in both modes", () => {
    const withoutSharedHtml = renderToStaticMarkup(<ResourceArticlePage article={baseArticle} />);
    const withSharedHtml = renderToStaticMarkup(
      <ResourceArticlePage article={{ ...baseArticle, includeSharedDeepDive: true }} />,
    );

    assert.match(withoutSharedHtml, /id="anchor-stable-heading"/);
    assert.match(withSharedHtml, /id="anchor-stable-heading"/);
  });

  it("renders imported iframe embeds from raw snippets with safe defaults", () => {
    const html = renderToStaticMarkup(
      <ResourceArticlePage
        article={{
          ...baseArticle,
          sections: [
            {
              heading: "Imported embed section",
              paragraphs: ["Watch the operating review."],
              embeds: [
                {
                  kind: "iframe",
                  provider: "Loom",
                  caption: "Shareable walkthrough",
                  html: '<iframe src="https://www.loom.com/embed/abc123" title="Weekly walkthrough" allow="autoplay"></iframe><script>alert(1)</script>',
                },
              ],
            },
          ],
        }}
      />,
    );

    assert.match(html, /src="https:\/\/www\.loom\.com\/embed\/abc123"/);
    assert.match(html, /title="Weekly walkthrough"/);
    assert.match(html, /sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox allow-presentation"/);
    assert.match(html, /Loom embed · Shareable walkthrough/);
    assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  });
});
