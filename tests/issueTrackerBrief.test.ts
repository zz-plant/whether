import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildExportStamp,
  buildIssueTrackerMarkdownBrief,
} from "../lib/export/issueTrackerBrief";
import { assessment, treasury, sensors, macros } from "./factories/exportFixtures";

/**
 * These two builders lived inside `exportBriefPanel.tsx`, a 940-line client
 * component, so nothing exercised them without rendering the panel. They feed
 * three copy buttons an operator pastes into Jira, Linear, and Confluence.
 */
describe("buildIssueTrackerMarkdownBrief", () => {
  it("renders the markdown form with headings, bullets and a plain source line", () => {
    const brief = buildIssueTrackerMarkdownBrief(assessment, treasury, sensors, macros);

    assert.match(brief, /^## Whether Weekly Brief — 2026-03-04$/m);
    assert.match(brief, /^\*\*Posture:\*\* /m);
    assert.match(brief, /^### Macro signals$/m);
    assert.match(brief, /^### Bounded decision$/m);
    assert.match(brief, /^- Chicago Fed National Financial Conditions Index: /m);
    assert.match(brief, /^Source: https:\/\/fred\.stlouisfed\.org$/m);
    // Markdown must not carry wiki markup.
    assert.doesNotMatch(brief, /^h2\. /m);
    assert.doesNotMatch(brief, /\[https:[^\]]*\|/);
  });

  it("renders the wiki form with wiki headings, bullets and a linked source", () => {
    const brief = buildIssueTrackerMarkdownBrief(assessment, treasury, sensors, macros, undefined, "wiki");

    assert.match(brief, /^h2\. Whether Weekly Brief — 2026-03-04$/m);
    assert.match(brief, /^\*Posture:\* /m);
    assert.match(brief, /^h3\. Macro signals$/m);
    assert.match(brief, /^\* Chicago Fed National Financial Conditions Index: /m);
    assert.match(brief, /^Source: \[https:\/\/fred\.stlouisfed\.org\|https:\/\/fred\.stlouisfed\.org\]$/m);
    assert.doesNotMatch(brief, /^## /m);
  });

  it("carries both composite scores and the rate inputs behind them", () => {
    const brief = buildIssueTrackerMarkdownBrief(assessment, treasury, sensors, macros);

    assert.match(brief, /Funding pressure:\*\* 12/);
    assert.match(brief, /Risk appetite:\*\* 68/);
    assert.match(brief, /Base rate:\*\* 3\.75% \(1M\)/);
    assert.match(brief, /Curve slope:\*\* 0\.55%/);
  });

  it("prefers the modeled posture label over the raw regime name", () => {
    const brief = buildIssueTrackerMarkdownBrief(assessment, treasury, sensors, macros, {
      postureWithStageLabel: "Sunny — Late",
      confidenceLabel: "HIGH",
    });

    assert.match(brief, /\*\*Posture:\*\* Sunny — Late/);
    assert.match(brief, /\*\*Regime:\*\* EXPANSION/);
    assert.match(brief, /HIGH confidence/);
  });

  it("stamps score-based confidence when no confidence label is modeled", () => {
    const brief = buildIssueTrackerMarkdownBrief(assessment, treasury, sensors, macros);

    assert.match(brief, /Score-based posture confidence/);
  });

  it("produces identical bytes for Jira and Linear, which both consume markdown", () => {
    const jira = buildIssueTrackerMarkdownBrief(assessment, treasury, sensors, macros, undefined, "markdown");
    const linear = buildIssueTrackerMarkdownBrief(assessment, treasury, sensors, macros, undefined, "markdown");

    assert.equal(jira, linear);
  });
});

describe("buildExportStamp", () => {
  it("stamps the source, the record date, and the confidence it was given", () => {
    const stamp = buildExportStamp(treasury, "HIGH confidence").join("\n");

    assert.match(stamp, /https:\/\/fred\.stlouisfed\.org/);
    assert.match(stamp, /2026-03-04/);
    assert.match(stamp, /HIGH confidence/);
  });
});
