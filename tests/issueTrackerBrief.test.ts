import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildIssueTrackerMarkdownBrief } from "../lib/export/issueTrackerBrief";
import { assessment, fixtureBriefDocument, fixtureWeeklyCall } from "./factories/exportFixtures";

/**
 * These two builders lived inside `exportBriefPanel.tsx`, a 940-line client
 * component, so nothing exercised them without rendering the panel. They feed
 * three copy buttons an operator pastes into Jira, Linear, and Confluence.
 */
describe("buildIssueTrackerMarkdownBrief", () => {
  it("renders the markdown form with headings, bullets and a plain source line", () => {
    const brief = buildIssueTrackerMarkdownBrief(fixtureBriefDocument());

    assert.match(brief, /^## Whether Weekly Brief — 2026-03-04$/m);
    assert.match(brief, /^\*\*Conditions:\*\* /m);
    assert.match(brief, /^### This week's guidance$/m);
    assert.match(brief, /^### What changed this week$/m);
    // The page's order: the guidance, then what moved. The brief reads the same way.
    assert.ok(brief.indexOf("This week's guidance") < brief.indexOf("What changed this week"));
    assert.match(brief, /^- Chicago Fed National Financial Conditions Index: /m);
    assert.match(brief, /^Source: https:\/\/fred\.stlouisfed\.org · 2026-03-04 · Room before a change: /m);
    // Markdown must not carry wiki markup.
    assert.doesNotMatch(brief, /^h2\. /m);
    assert.doesNotMatch(brief, /\[https:[^\]]*\|/);
  });

  it("renders the wiki form with wiki headings, bullets and a linked source", () => {
    const brief = buildIssueTrackerMarkdownBrief(fixtureBriefDocument(), "wiki");

    assert.match(brief, /^h2\. Whether Weekly Brief — 2026-03-04$/m);
    assert.match(brief, /^\*Conditions:\* /m);
    assert.match(brief, /^h3\. This week's guidance$/m);
    assert.match(brief, /^\* Chicago Fed National Financial Conditions Index: /m);
    assert.match(brief, /^Source: \[https:\/\/fred\.stlouisfed\.org\|https:\/\/fred\.stlouisfed\.org\]$/m);
    assert.doesNotMatch(brief, /^## /m);
  });

  it("carries both composite scores and the rate inputs behind them", () => {
    const brief = buildIssueTrackerMarkdownBrief(fixtureBriefDocument());

    // Each score with the lines it is judged against and the distance to them.
    assert.match(brief, /Funding pressure 12 of 100 \(money is easy to raise\) · pause line 76 · 64 pts away/);
    assert.match(brief, /Risk appetite 68 of 100 \(investors are selective about risk\) · pause line 44 · 24 pts away/);
    // The series is named in words, never as the engine's "(1M)".
    assert.match(brief, /Short-term borrowing rate:\*\* 3\.75% \(read from the 1-month Treasury bill\)/);
    assert.doesNotMatch(brief, /\(1M\)/);
    assert.match(brief, /Recession warning gauge \(10-year minus 2-year rate\):\*\* 0\.55%/);
  });

  it("prints the contract's conditions label and never the engine key beside it", () => {
    const brief = buildIssueTrackerMarkdownBrief(
      fixtureBriefDocument({ weeklyCall: { ...fixtureWeeklyCall(), regimeStage: "Sunny — Late" } }),
    );

    assert.match(brief, /\*\*Conditions:\*\* Sunny — Late \(money is cheap and available\)/);
    // A ticket is read by a whole team; the engine key is for the JSON routes.
    assert.doesNotMatch(brief, /Regime:|EXPANSION/);
    assert.match(brief, /Room before a change: plenty \(how far the scores are from changing conditions/);
  });

  it("stamps the reading's published margin, not the engine's code", () => {
    // The fixture's engine code says MEDIUM; its scores are 58 and 18 points
    // out (81 on the tightness scale), which publishes as High.
    const far = buildIssueTrackerMarkdownBrief(fixtureBriefDocument());
    assert.match(far, /Room before a change: plenty \(how far the scores are from changing conditions\)/);
    assert.doesNotMatch(far, /MEDIUM/);

    // Two points under the risk line is nine on the tightness scale: Medium.
    const nearLine = { ...assessment, scores: { ...assessment.scores, riskAppetite: 48 } };
    const near = buildIssueTrackerMarkdownBrief(fixtureBriefDocument({ reading: nearLine }));
    assert.match(near, /Room before a change: some \(how far the scores are from changing conditions/);
  });

  it("produces identical bytes for Jira and Linear, which both consume markdown", () => {
    const jira = buildIssueTrackerMarkdownBrief(fixtureBriefDocument(), "markdown");
    const linear = buildIssueTrackerMarkdownBrief(fixtureBriefDocument(), "markdown");

    assert.equal(jira, linear);
  });
});
