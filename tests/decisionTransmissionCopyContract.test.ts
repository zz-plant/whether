import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildHomeMetadata } from "../lib/report/homeMetadata";
import { buildHomeStructuredData } from "../lib/report/home/structuredData";
import { decisionTransmissionSummaryLine, homeDecisionFaqItems } from "../lib/report/decisionTransmissionCopy";
import { buildSlackBrief } from "../lib/export/briefBuilders";
import { buildAssessmentFixture, buildTreasuryFixture } from "./fixtures/reportFixtures";
import type { MacroSeriesReading, SensorReading } from "../lib/types";

const assessment = buildAssessmentFixture();
const treasury = buildTreasuryFixture();

const homeStructuredDataFixture = {
  headline: "Whether Weekly Brief — Jun 17, 2026",
  description: "Keep expansion selective and gate discretionary spend.",
  datePublishedIso: "2026-06-17",
  dateModifiedIso: "2026-06-22T17:05:00.000Z",
  postureLabel: "Guarded Expansion — Late",
  regimeLabel: "Guarded",
  confidenceLabel: "MED",
};

const sensors: SensorReading[] = [
  {
    id: "BASE_RATE",
    label: "Base rate",
    value: 4.2,
    unit: "%",
    explanation: "",
    category: "Rates",
    group: { id: "Rates", label: "Rates", description: "Rates" },
    availableTimeWindows: ["1M"],
    sourceLabel: "FRED",
    sourceUrl: "https://fred.stlouisfed.org",
    formulaUrl: "",
    record_date: "2026-03-06",
    fetched_at: "2026-03-06T00:00:00.000Z",
    isLive: true,
  },
  {
    id: "CURVE_SLOPE",
    label: "Curve slope",
    value: -0.2,
    unit: "%",
    explanation: "",
    category: "Rates",
    group: { id: "Rates", label: "Rates", description: "Rates" },
    availableTimeWindows: ["1M"],
    sourceLabel: "FRED",
    sourceUrl: "https://fred.stlouisfed.org",
    formulaUrl: "",
    record_date: "2026-03-06",
    fetched_at: "2026-03-06T00:00:00.000Z",
    isLive: true,
  },
];

const macros: MacroSeriesReading[] = [{
  id: "CHICAGO_FCI",
  label: "Chicago Fed National Financial Conditions Index",
  value: -0.32,
  unit: "index",
  explanation: "",
  sourceLabel: "FRED",
  sourceUrl: "https://fred.stlouisfed.org/series/NFCI",
  formulaUrl: "",
  record_date: "2026-03-06",
  fetched_at: "2026-03-06T00:00:00.000Z",
  isLive: true,
}];

describe("decision transmission copy contract", () => {
  it("keeps homepage summary and metadata focused on action, confidence, and flip framing", async () => {
    const metadata = await buildHomeMetadata();

    assert.match(decisionTransmissionSummaryLine, /forecast/i);
    assert.match(decisionTransmissionSummaryLine, /conditions shift/i);
    assert.match(decisionTransmissionSummaryLine, /conditions shift/i);
    assert.match(metadata.description ?? "", /forecast/i);
    assert.match(metadata.description ?? "", /conditions shift/i);
    assert.match(metadata.description ?? "", /conditions shift/i);
  });

  it("keeps export briefs explicit about action now, confidence, and change-course conditions", () => {
    const brief = buildSlackBrief(assessment, treasury, sensors, macros);

    assert.match(brief, /• Do now:/);
    assert.match(brief, /Decision transmission check:/);
    assert.match(brief, /• Confidence:/);
    assert.match(brief, /• Change-course trigger:/);
    assert.match(brief, /• Re-open when:/);
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
