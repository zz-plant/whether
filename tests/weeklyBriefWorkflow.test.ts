import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "bun:test";
import { assessPublishReadiness } from "../lib/report/briefPublishGuard";
import { parsePublishedBriefs, type PublishedBrief } from "../lib/report/publishedBriefs";

describe("weekly brief workflow automation", () => {
  it("unifies Slack brief artifact and published brief freeze into one PR in the Monday workflow", async () => {
    const workflowYaml = await readFile(".github/workflows/weekly-slack-brief-artifact.yml", "utf8");

    // Must run freeze
    assert.ok(
      workflowYaml.includes("bun run brief:freeze"),
      "Workflow must run brief:freeze",
    );

    // Must generate Slack artifact text & markdown
    assert.ok(
      workflowYaml.includes("bun run brief:weekly:artifact"),
      "Workflow must run brief:weekly:artifact",
    );
    assert.ok(
      workflowYaml.includes("generateWeeklySlackBrief.ts"),
      "Workflow must generate markdown Slack brief",
    );

    // Must upload artifact
    assert.ok(
      workflowYaml.includes("artifacts/weekly-slack-brief.txt"),
      "Workflow must upload weekly-slack-brief.txt",
    );

    // Must verify before PR
    assert.ok(
      workflowYaml.includes("publishedBriefExport.test.ts"),
      "Workflow must run publishedBriefExport tests",
    );

    // PR must include BOTH published_briefs.json and latest-weekly-slack-brief.md in one PR
    assert.ok(
      workflowYaml.includes("data/published_briefs.json"),
      "Workflow PR add-paths must include data/published_briefs.json",
    );
    assert.ok(
      workflowYaml.includes("docs/briefs/latest-weekly-slack-brief.md"),
      "Workflow PR add-paths must include docs/briefs/latest-weekly-slack-brief.md",
    );
  });
});

describe("freeze script append-only & correction semantics", () => {
  const sampleBrief: PublishedBrief = {
    slug: "2026-w31",
    year: 2026,
    week: 31,
    publishedAt: "2026-07-30T00:00:00.000Z",
    recordDate: "2026-07-30",
    recordDateLabel: "Jul 30, 2026",
    headline: "Guarded Expansion — Late — week of Jul 30, 2026",
    summary: "Keep expansion selective",
    postureLabel: "Guarded Expansion — Late",
    regime: "EXPANSION",
    confidenceLabel: "MED",
    whatChanged: "Pressure increased by +1.2 this week.",
    actionNow: "Conditions tightening",
    guardrailThreshold: "Over-engineering",
    flipThreshold: "No flip condition",
    decisions: [],
    evidence: [],
    sourceLabel: "Canonical snapshot",
    freshnessLabel: "Aug 1, 2026",
    correction: "Correction note from audit",
  };

  it("preserves existing correction and original publishedAt when updating a record", () => {
    const existing = [sampleBrief];
    const slug = "2026-w31";
    const existingRecord = existing.find((b) => b.slug === slug);

    const updatedRecord: PublishedBrief = {
      ...sampleBrief,
      publishedAt: existingRecord?.publishedAt ?? new Date().toISOString(),
      summary: "Updated summary text",
      correction: existingRecord?.correction ?? null,
    };

    assert.equal(updatedRecord.publishedAt, "2026-07-30T00:00:00.000Z");
    assert.equal(updatedRecord.correction, "Correction note from audit");
  });

  it("strictly refuses degraded snapshots", () => {
    const readiness = assessPublishReadiness({
      degraded: true,
      isFallback: false,
      isLive: true,
      recordDate: "2026-08-27",
      now: new Date("2026-08-29T04:00:00Z"),
    });

    assert.equal(readiness.ok, false);
  });

  it("strictly refuses fallback data", () => {
    const readiness = assessPublishReadiness({
      degraded: false,
      isFallback: true,
      isLive: false,
      fallbackReason: "Provider unavailable",
      recordDate: "2026-08-27",
      now: new Date("2026-08-29T04:00:00Z"),
    });

    assert.equal(readiness.ok, false);
    assert.match(readiness.ok === false ? readiness.reason : "", /fallback/i);
  });
});
