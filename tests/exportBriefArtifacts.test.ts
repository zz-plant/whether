import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildExportBriefArtifacts } from "../lib/export/exportBriefArtifacts";
import { assessment, treasury, sensors, macros } from "./factories/exportFixtures";

/**
 * Every artifact the export panel copies. These were twenty inline `useMemo`
 * calls inside a 940-line client component, and the component is rendered only
 * once its planning step is opened — so nothing here was reachable from a test.
 */
const build = (overrides: Partial<Parameters<typeof buildExportBriefArtifacts>[0]> = {}) =>
  buildExportBriefArtifacts({ assessment, treasury, sensors, macroSeries: macros, ...overrides });

describe("buildExportBriefArtifacts", () => {
  it("produces every copyable artifact with content", () => {
    const artifacts = build();

    const textArtifacts = [
      "briefing",
      "weeklyOperatorPlainText",
      "weeklyOperatorCardText",
      "citation",
      "markdownBrief",
      "wikiBrief",
      "boardBrief",
      "boardNote",
      "callSnapshot",
      "agentPayload",
      "agentPrompt",
      "slideBullets",
      "constraintHeadlines",
      "weeklyOperatorSlackBlocks",
    ] as const;

    for (const key of textArtifacts) {
      const value = artifacts[key];
      assert.equal(typeof value, "string", `${key} should be a string`);
      assert.ok(value.trim().length > 0, `${key} should not be empty`);
    }

    assert.ok(artifacts.stakeholderBriefs, "stakeholder briefs should be built");
    assert.ok(artifacts.weeklyOperatorPayload, "the shared payload should be built");
  });

  it("resolves the week-ending date from the record date", () => {
    assert.match(build().weekEndingDate, /^\d{4}-\d{2}-\d{2}$/);
  });

  it("emits one markdown artifact, since Jira and Linear paste the same bytes", () => {
    const artifacts = build();

    assert.match(artifacts.markdownBrief, /^## Whether Weekly Brief/m);
    assert.match(artifacts.wikiBrief, /^h2\. Whether Weekly Brief/m);
    assert.notEqual(artifacts.markdownBrief, artifacts.wikiBrief);
  });

  it("reports a live snapshot as live and a fallback snapshot as degraded", () => {
    assert.equal(build().fallbackActive, false);
    assert.match(build().boardNote, /TRUST: LIVE/);

    const degraded = build({
      treasury: { ...treasury, fallback_at: "2026-03-05T00:00:00.000Z", fallback_reason: "upstream 403" },
    });
    assert.equal(degraded.fallbackActive, true);
    assert.match(degraded.boardNote, /TRUST: FALLBACK SNAPSHOT/);
    assert.match(degraded.boardNote, /upstream 403/);
  });

  it("carries the operator's team note into the weekly brief", () => {
    const withNote = build({ customTeamNote: "  Hiring freeze holds through Q2.  " });

    assert.match(withNote.weeklyOperatorPlainText, /Hiring freeze holds through Q2\./);
  });

  it("prefers modeled decision copy over engine defaults in the board note", () => {
    const modeled = build({
      decisionModel: {
        postureWithStageLabel: "Sunny — Late",
        confidenceLabel: "HIGH",
        confidencePercent: 82,
        decisionShiftSummary: "Pressure eased by 2.1 this week.",
        guardrailThreshold: "Funding pressure rises above 76",
      },
    });

    assert.match(modeled.boardNote, /POSTURE: Sunny — Late · HIGH confidence \(82%\)/);
    assert.match(modeled.boardNote, /CHANGED: Pressure eased by 2\.1 this week\./);
    assert.match(modeled.boardNote, /GUARDRAIL: Funding pressure rises above 76/);
  });
});
