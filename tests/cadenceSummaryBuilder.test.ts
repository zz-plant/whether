import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateRegime } from "../lib/regimeEngine";
import { getRegimeOperatorLabel } from "../lib/regimeLabels";
import {
  buildQuarterlySummary,
  getQuarterLabel,
  getQuarterlyActionGuidance,
  type QuarterlySummary,
} from "../lib/summary/quarterlySummary";
import {
  buildYearlySummary,
  getYearLabel,
  getYearlyActionGuidance,
  type YearlySummary,
} from "../lib/summary/yearlySummary";

const assessment = evaluateRegime({
  source: "https://example.com/treasury",
  record_date: "2026-02-14",
  fetched_at: "2026-02-14T09:00:00.000Z",
  isLive: true,
  yields: {
    oneMonth: 5.2,
    twoYear: 4.8,
    tenYear: 4.5,
  },
});

const provenance = {
  sourceLabel: "US Treasury Daily Treasury Yield Curve Rates (via FRED)",
  sourceUrl: "https://fred.stlouisfed.org/series/DGS10",
  timestampLabel: "Feb 14, 2026, 09:00 AM",
  ageLabel: "2h",
  statusLabel: "Live",
};

const assertCadenceCopy = ({
  summary,
  expectedTitle,
  expectedSummary,
}: {
  summary: QuarterlySummary | YearlySummary;
  expectedTitle: string;
  expectedSummary: string;
}) => {
  const expectedCopy = [
    expectedTitle,
    expectedSummary,
    "",
    "Execution constraints:",
    ...assessment.constraints.map((item) => `• ${item}`),
    "",
    "Provenance:",
    `Source: ${provenance.sourceLabel} (${provenance.sourceUrl})`,
    `Timestamp: ${provenance.timestampLabel}`,
    `Data age: ${provenance.ageLabel}`,
    "",
    "Compliance stamp:",
    "- Internal use only",
    "- Governance artifact; not investment advice.",
    `- Source: ${provenance.sourceLabel} (${provenance.sourceUrl})`,
    `- Timestamp: ${provenance.timestampLabel}`,
    "- Confidence: Live",
    "- Uncertainty: Interpretive and probabilistic guidance; verify assumptions before acting.",
  ].join("\n");

  assert.equal(summary.copy, expectedCopy);
};

describe("cadence summaries", () => {
  it("buildQuarterlySummary keeps the quarterly output contract", () => {
    const summary = buildQuarterlySummary({
      assessment,
      provenance,
      recordDateLabel: "Feb 14, 2026",
      periodLabel: "Q1 2026",
    });

    const expectedSummary = `This quarter, operate in ${getRegimeOperatorLabel(assessment.regime)} mode: ${getQuarterlyActionGuidance(assessment.regime)}. ${assessment.description}`;

    assert.equal(summary.title, "Quarterly action summary — Q1 2026");
    assert.equal(summary.summary, expectedSummary);
    assert.equal(summary.recordDateLabel, "Feb 14, 2026");
    assertCadenceCopy({
      summary,
      expectedTitle: "Quarterly action summary — Q1 2026",
      expectedSummary,
    });
  });

  it("buildYearlySummary keeps the yearly output contract", () => {
    const summary = buildYearlySummary({
      assessment,
      provenance,
      periodLabel: "2026",
    });

    const expectedSummary = `This year, operate in ${getRegimeOperatorLabel(assessment.regime)} mode: ${getYearlyActionGuidance(assessment.regime)}. ${assessment.description}`;

    assert.equal(summary.title, "Yearly action summary — 2026");
    assert.equal(summary.summary, expectedSummary);
    assert.equal(summary.recordDateLabel, null);
    assertCadenceCopy({
      summary,
      expectedTitle: "Yearly action summary — 2026",
      expectedSummary,
    });
  });

  it("keeps period-label parsing cadence specific", () => {
    assert.equal(getQuarterLabel("2026-02-14"), "Q1 2026");
    assert.equal(getQuarterLabel("not-a-date"), null);
    assert.equal(getYearLabel("2026-02-14"), "2026");
    assert.equal(getYearLabel("not-a-date"), null);
  });
});
