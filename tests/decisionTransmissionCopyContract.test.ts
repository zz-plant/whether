import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildHomeMetadata } from "../lib/report/homeMetadata";
import { buildHomeStructuredData, withHomeQuestions } from "../lib/report/home/structuredData";
import { HOME_SECTIONS } from "../lib/report/home/homeSectionModel";
import { buildSlackBrief } from "../lib/export/briefBuilders";
import { buildAssessmentFixture } from "./fixtures/reportFixtures";
import { fixtureBriefDocument } from "./factories/exportFixtures";

const assessment = buildAssessmentFixture();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const homeStructuredDataFixture = {
  headline: "Whether Weekly Brief — Jun 17, 2026",
  description: "Keep expansion selective and gate discretionary spend.",
  datePublishedIso: "2026-06-17",
  dateModifiedIso: "2026-06-22T17:05:00.000Z",
  regimeLabel: "Freezing",
  regime: "SCARCITY",
  scores: { tightness: 90.4, riskAppetite: 44 },
  confidenceLabel: "MED",
};

describe("decision transmission copy contract", () => {
  /* The description used to open "Weekly forecast", on a site whose /about and
     llms.txt both say it is not a forecast. It names the three parts of a rule
     instead, which is what a reader gets. */
  it("keeps homepage metadata on the action and its two lines, and off forecasting", async () => {
    const metadata = await buildHomeMetadata();
    const description = metadata.description ?? "";

    assert.match(description, /the action to take now/i);
    assert.match(description, /the line that pauses it/i);
    assert.match(description, /the line that resumes it/i);
    assert.doesNotMatch(description, /forecast/i);
  });

  it("keeps export briefs explicit about action now, the margin, and change-course conditions", () => {
    const brief = buildSlackBrief(fixtureBriefDocument({ reading: assessment }));

    /* The guidance is the post's first line, answer first (2026-11-25). */
    assert.match(brief, /^\*This week \([^)]+\): .+\*$/m);
    assert.match(brief, /Why this could be wrong:/);
    assert.match(brief, /• Room before a change: (plenty|some|little)\b/);
    assert.match(brief, /• How you'd know: watch "Conditions change if" above/);
    assert.match(brief, /• Conditions change if:/);
    // The lead area's restart line prints while it is on hold, the one week it can change anything.
    assert.doesNotMatch(brief, /• Restart when:/, "hiring is not on hold at funding pressure 72");
    const held = buildAssessmentFixture({ scores: { tightness: 90 } });
    assert.match(buildSlackBrief(fixtureBriefDocument({ reading: held })), /• Restart when:/);
  });

  /*
   * The graph carried an FAQPage of three questions the page never printed ("What should
   * we do differently right now?"). The questions it marks up now are the page's own
   * headings, with the sentence under each as the answer (`withHomeQuestions`); the render
   * test in tests/homeQuestionMarkup.test.tsx holds them to the page.
   */
  it("marks up the page's own questions under the page node, and no FAQ it does not print", () => {
    const questions = [{ id: HOME_SECTIONS.areas.id, question: HOME_SECTIONS.areas.heading, answer: "Hiring, Fundraising, Spending and New bets." }];
    const graph = withHomeQuestions(buildHomeStructuredData(homeStructuredDataFixture), questions)["@graph"];
    assert.ok(!graph.some((node) => node["@type"] === "FAQPage"));
    const page = graph.find((node) => node["@type"] === "CollectionPage");
    assert.deepEqual(page?.hasPart, [
      {
        "@type": "Question",
        "@id": "https://whether.work/#what-it-changes",
        url: "https://whether.work/#what-it-changes",
        name: "What’s on hold?",
        answerCount: 1,
        acceptedAnswer: { "@type": "Answer", text: "Hiring, Fundraising, Spending and New bets." },
      },
    ]);
  });

  it("names this week's reading as the site does, with both scores on their 0-100 scale", () => {
    const graph = buildHomeStructuredData(homeStructuredDataFixture)["@graph"];
    const page = graph.find((node) => node["@type"] === "CollectionPage");
    const dataset = page?.mainEntity;
    assert.ok(isRecord(dataset));
    assert.equal(dataset.name, "This week's reading: funding pressure and risk appetite");
    assert.doesNotMatch(String(dataset.description), /yield curve snapshot/i);
    assert.equal(dataset.isAccessibleForFree, true);
    assert.equal(dataset.measurementTechnique, "https://whether.work/about#method");
    assert.equal(dataset.temporalCoverage, "2026-06-17");
    const measured = Array.isArray(dataset.variableMeasured) ? dataset.variableMeasured.filter(isRecord) : [];
    assert.deepEqual(
      measured.slice(0, 2).map(({ name, value, minValue, maxValue, unitText, propertyID }) => ({ name, value, minValue, maxValue, unitText, propertyID })),
      [
        { name: "Funding pressure", value: 90, minValue: 0, maxValue: 100, unitText: "points", propertyID: "https://whether.work/about#term-funding-pressure" },
        { name: "Risk appetite", value: 44, minValue: 0, maxValue: 100, unitText: "points", propertyID: "https://whether.work/about#term-risk-appetite" },
      ],
    );
    assert.deepEqual(measured[2], {
      "@type": "PropertyValue",
      name: "Conditions",
      value: "Freezing",
      propertyID: "https://whether.work/about#term-freezing",
      description: "Money is expensive and hard to raise.",
    });
    const distribution = Array.isArray(dataset.distribution) ? dataset.distribution.filter(isRecord) : [];
    assert.ok(distribution.some((entry) => entry.contentUrl === "https://whether.work/api/agent?cadence=weekly"));
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

    for (const required of ["Organization", "WebSite", "CollectionPage", "BreadcrumbList"]) {
      assert.ok(types.includes(required), `${required} node is present in the homepage graph`);
    }
  });
});
