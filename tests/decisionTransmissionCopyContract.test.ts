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

    assert.match(decisionTransmissionSummaryLine, /what to do now/i);
    assert.match(decisionTransmissionSummaryLine, /what would flip/i);
    assert.match(decisionTransmissionSummaryLine, /flip the call/i);
    assert.match(metadata.description ?? "", /what to do now/i);
    assert.match(metadata.description ?? "", /what would flip/i);
    assert.match(metadata.description ?? "", /flip the call/i);
  });

  it("keeps export briefs explicit about action now, confidence, and change-course conditions", () => {
    const brief = buildSlackBrief(assessment, treasury, sensors, macros);

    assert.match(brief, /• Action now:/);
    assert.match(brief, /Decision transmission check:/);
    assert.match(brief, /• Confidence:/);
    assert.match(brief, /• Change-course trigger:/);
    assert.match(brief, /• Change course if:/);
  });

  it("keeps FAQ structured data aligned with the rendered weekly decision FAQ prompts", () => {
    const structured = buildHomeStructuredData() as {
      "@graph": Array<{ "@type": string; mainEntity?: Array<{ name: string }> }>;
    };
    const faqNode = structured["@graph"].find((node) => node["@type"] === "FAQPage");

    assert.ok(faqNode);
    assert.equal(faqNode?.mainEntity?.length, homeDecisionFaqItems.length);
    assert.deepEqual(
      faqNode?.mainEntity?.map((item) => item.name),
      homeDecisionFaqItems.map((item) => item.question),
    );
  });
});
