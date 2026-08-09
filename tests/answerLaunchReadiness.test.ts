import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { answerPages } from "../app/answers/decisionPages";
import { scoreAnswerLaunchReadiness, summarizeAnswerLaunchReadiness, type AnswerLaunchReadinessLiveInputs } from "../lib/seo/answerLaunchReadiness";
import { buildWeeklyBriefSnapshot } from "../lib/report/weeklyBriefSnapshot";
import { buildReportDataFixture } from "./fixtures/reportFixtures";

const buildLiveInputs = ({
  degraded = false,
  provenanceStatusLabel = "Live (high confidence)",
  reportEvidenceItems = [
    {
      key: "tightness" as const,
      title: "Cash availability moved above the operating threshold",
      supportingBullets: ["Tightness rose 2 points week over week."],
      confidenceLabel: "HIGH",
      directionLabel: "Tightening" as const,
      immediateImplication: "Stage irreversible spend until tightness clears the reversal threshold.",
    },
  ],
}: {
  degraded?: boolean;
  provenanceStatusLabel?: string;
  reportEvidenceItems?: ReturnType<typeof buildReportDataFixture>["reportEvidenceItems"];
} = {}): AnswerLaunchReadinessLiveInputs => {
  const fetchedAt = new Date().toISOString();
  const reportData = buildReportDataFixture({
    fetchedAtLabel: "0h",
    reportEvidenceItems,
    treasury: {
      fetched_at: fetchedAt,
      source: "https://fred.stlouisfed.org/series/DGS10",
    },
    macroSeries: [
      {
        id: "BBB_CREDIT_SPREAD",
        label: "BBB credit spread",
        value: 180,
        unit: "bps",
        explanation: "Credit spreads proxy capital tightness for operating posture.",
        sourceLabel: "Federal Reserve Economic Data (FRED)",
        sourceUrl: "https://fred.stlouisfed.org/series/BAMLC0A4CBBB",
        formulaUrl: "https://fred.stlouisfed.org/series/BAMLC0A4CBBB",
        record_date: "2026-03-01",
        fetched_at: fetchedAt,
        isLive: true,
      },
    ],
    treasuryProvenance: {
      sourceLabel: "Federal Reserve Economic Data (FRED)",
      sourceUrl: "https://fred.stlouisfed.org/series/DGS10",
      recordDateLabel: "Mar 1, 2026",
      timestampLabel: "Mar 1, 2026 00:00 UTC",
      ageLabel: "0h",
      statusLabel: provenanceStatusLabel,
    },
  });

  return {
    reportData,
    degraded,
    snapshot: buildWeeklyBriefSnapshot({ reportData, degraded }),
  };
};

describe("answer launch readiness", () => {
  it("scores pages with the live evidence, provenance, and mapped decision-rule payload", async () => {
    const [page] = answerPages;
    const records = await scoreAnswerLaunchReadiness([page], buildLiveInputs());
    const summary = summarizeAnswerLaunchReadiness(records);

    assert.equal(summary.total, 1);
    assert.equal(summary.blocked, 0, `unexpected blocked answer pages: ${JSON.stringify(summary.blockedSlugs)}`);
    assert.equal(records[0]?.qualityGates.gates.trust.passed, true);
    assert.equal(records[0]?.qualityGates.gates["decision-completeness"].details?.evidenceCount, 1);
  });

  it("blocks launch readiness when live provenance is degraded", async () => {
    const [page] = answerPages;
    const records = await scoreAnswerLaunchReadiness(
      [page],
      buildLiveInputs({ degraded: true, provenanceStatusLabel: "Cached (medium confidence)" }),
    );

    assert.equal(records[0]?.eligible, false);
    assert.ok(records[0]?.reasons.includes("fallback-snapshot"));
    assert.ok(records[0]?.reasons.includes("provenance-missing-or-degraded"));
    assert.equal(records[0]?.qualityGates.gates.trust.passed, false);
  });

  it("blocks launch readiness when the live report has no evidence items", async () => {
    const [page] = answerPages;
    const records = await scoreAnswerLaunchReadiness([page], buildLiveInputs({ reportEvidenceItems: [] }));

    assert.equal(records[0]?.eligible, false);
    assert.ok(records[0]?.reasons.includes("decision-evidence-missing"));
    assert.ok(records[0]?.reasons.includes("decision-value-below-minimum"));
    assert.equal(records[0]?.qualityGates.gates["decision-completeness"].details?.evidenceCount, 0);
  });
});
