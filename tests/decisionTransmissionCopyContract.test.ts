import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildHomeMetadata } from "../lib/report/homeMetadata";
import { buildHomeStructuredData } from "../lib/report/home/structuredData";
import { homeDecisionFaqItems } from "../lib/report/decisionTransmissionCopy";
import { buildSlackBrief } from "../lib/export/briefBuilders";
import { buildAssessmentFixture } from "./fixtures/reportFixtures";
import { fixtureBriefDocument } from "./factories/exportFixtures";

const assessment = buildAssessmentFixture();

const homeStructuredDataFixture = {
  headline: "Whether Weekly Brief — Jun 17, 2026",
  description: "Keep expansion selective and gate discretionary spend.",
  datePublishedIso: "2026-06-17",
  dateModifiedIso: "2026-06-22T17:05:00.000Z",
  postureLabel: "Guarded Expansion — Late",
  regimeLabel: "Guarded",
  confidenceLabel: "MED",
};

describe("decision transmission copy contract", () => {
  /* The description used to open "Weekly forecast", on a site whose /about and
     llms.txt both say it is not a forecast. It names the three parts of a rule
     instead, which is what a reader gets. */
  it("keeps homepage metadata on the action and its two lines, and off forecasting", async () => {
    const metadata = await buildHomeMetadata();
    const description = metadata.description ?? "";

    assert.match(description, /what to do now/i);
    assert.match(description, /the line that pauses it/i);
    assert.match(description, /the line that resumes it/i);
    assert.doesNotMatch(description, /forecast/i);
  });

  it("keeps export briefs explicit about action now, the margin, and change-course conditions", () => {
    const brief = buildSlackBrief(fixtureBriefDocument({ reading: assessment }));

    assert.match(brief, /• Guidance:/);
    assert.match(brief, /Why this could be wrong:/);
    assert.match(brief, /• Margin: (clear of|within reach of|close to) the line/);
    assert.match(brief, /• What would show it: "Conditions change if" above/);
    assert.match(brief, /• Resume when:/);
    assert.match(brief, /• Conditions change if:/);
  });

  it("keeps FAQ structured data aligned with the rendered weekly decision FAQ prompts", () => {
    const graph = buildHomeStructuredData(homeStructuredDataFixture)["@graph"];
    const faqNode = graph.find((node) => node["@type"] === "FAQPage");
    const questions = faqNode?.mainEntity;

    assert.ok(faqNode);
    assert.ok(Array.isArray(questions));
    assert.equal(questions.length, homeDecisionFaqItems.length);
    assert.deepEqual(
      questions.map((item) => item.name),
      homeDecisionFaqItems.map((item) => item.question),
    );
  });

  /*
   * The homepage published `datePublished: "Jun 17, 2026"` — a display label in a
   * field schema.org defines as ISO 8601, which consumers drop. The page whose
   * whole premise is *this week* therefore carried no machine-readable recency.
   * Assert the format, not just the presence: a label passed here would satisfy
   * "is a non-empty string" and fail every consumer.
   */
  it("dates the weekly brief node in ISO 8601 so the weekly cadence is machine-readable", () => {
    const graph = buildHomeStructuredData(homeStructuredDataFixture)["@graph"];
    const briefNode = graph.find((node) => {
      const type = node["@type"];
      return Array.isArray(type) && type.includes("Article");
    });

    assert.ok(briefNode, "weekly brief Article node is present in the graph");
    assert.equal(briefNode?.datePublished, "2026-06-17");
    assert.equal(briefNode?.dateModified, "2026-06-22T17:05:00.000Z");
    assert.ok(briefNode?.author, "Discover and News both require a named author");
    assert.ok(briefNode?.publisher, "publisher is required alongside the author");
  });

  /*
   * These nodes are the site's only Organization and WebSite anchors, and they
   * were assembled on every request and never rendered — app/page.tsx read none
   * of it. Pin their presence so the graph cannot silently shrink back.
   */
  it("anchors the site entity graph on the homepage", () => {
    const graph = buildHomeStructuredData(homeStructuredDataFixture)["@graph"];
    const types = graph.flatMap((node) => {
      const type = node["@type"];
      return Array.isArray(type) ? type : [type];
    });

    for (const required of ["Organization", "WebSite", "CollectionPage", "FAQPage", "BreadcrumbList"]) {
      assert.ok(types.includes(required), `${required} node is present in the homepage graph`);
    }
  });
});
