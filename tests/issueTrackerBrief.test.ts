import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildExportStamp,
  buildGuardrailTagBlocks,
  buildIssueTrackerMarkdownBrief,
} from "../lib/export/issueTrackerBrief";
import { assessment, treasury, sensors, macros } from "./factories/exportFixtures";
import type { ActionStripItem } from "../lib/report/operatingCalls";

/**
 * These two builders lived inside `exportBriefPanel.tsx`, a 940-line client
 * component, so nothing exercised them without rendering the panel. They feed
 * three copy buttons an operator pastes into Jira, Linear, and Confluence.
 */
describe("buildIssueTrackerMarkdownBrief", () => {
  it("renders the markdown form with headings, bullets and a plain source line", () => {
    const brief = buildIssueTrackerMarkdownBrief(assessment, treasury, sensors, macros);

    assert.match(brief, /^## Whether Weekly Brief — 2026-03-04$/m);
    assert.match(brief, /^\*\*Conditions:\*\* /m);
    assert.match(brief, /^### This week's guidance$/m);
    assert.match(brief, /^### What changed this week$/m);
    // The page's order: the guidance, then what moved. The brief reads the same way.
    assert.ok(brief.indexOf("This week's guidance") < brief.indexOf("What changed this week"));
    assert.match(brief, /^- Chicago Fed National Financial Conditions Index: /m);
    assert.match(brief, /^Source: https:\/\/fred\.stlouisfed\.org · 2026-03-04 · Confidence: /m);
    // Markdown must not carry wiki markup.
    assert.doesNotMatch(brief, /^h2\. /m);
    assert.doesNotMatch(brief, /\[https:[^\]]*\|/);
  });

  it("renders the wiki form with wiki headings, bullets and a linked source", () => {
    const brief = buildIssueTrackerMarkdownBrief(assessment, treasury, sensors, macros, undefined, "wiki");

    assert.match(brief, /^h2\. Whether Weekly Brief — 2026-03-04$/m);
    assert.match(brief, /^\*Conditions:\* /m);
    assert.match(brief, /^h3\. This week's guidance$/m);
    assert.match(brief, /^\* Chicago Fed National Financial Conditions Index: /m);
    assert.match(brief, /^Source: \[https:\/\/fred\.stlouisfed\.org\|https:\/\/fred\.stlouisfed\.org\]$/m);
    assert.doesNotMatch(brief, /^## /m);
  });

  it("carries both composite scores and the rate inputs behind them", () => {
    const brief = buildIssueTrackerMarkdownBrief(assessment, treasury, sensors, macros);

    // Each score with the line it is judged against and the distance to it.
    assert.match(brief, /Funding pressure 12 of 100 \(money is easy to raise\) · change line 70 · 58 pts below/);
    assert.match(brief, /Risk appetite 68 of 100 \(investors are selective about risk\) · change line 50 · 18 pts above/);
    // The series is named in words, never as the engine's "(1M)".
    assert.match(brief, /Short-term borrowing rate:\*\* 3\.75% \(read from the 1-month Treasury bill\)/);
    assert.doesNotMatch(brief, /\(1M\)/);
    assert.match(brief, /Recession warning gauge \(10-year minus 2-year rate\):\*\* 0\.55%/);
  });

  it("prints the modeled label and never the engine key beside it", () => {
    const brief = buildIssueTrackerMarkdownBrief(assessment, treasury, sensors, macros, {
      postureWithStageLabel: "Sunny — Late",
    });

    assert.match(brief, /\*\*Conditions:\*\* Sunny — Late \(money is cheap and available\)/);
    // A ticket is read by a whole team; the engine key is for the JSON routes.
    assert.doesNotMatch(brief, /Regime:|EXPANSION/);
    assert.match(brief, /Confidence: High \(how far the scores sit/);
  });

  it("stamps the reading's published confidence, not the engine's code", () => {
    // The fixture's engine code says MEDIUM; its scores are 58 and 18 points
    // out (81 on the tightness scale), which publishes as High.
    const far = buildIssueTrackerMarkdownBrief(assessment, treasury, sensors, macros);
    assert.match(far, /Confidence: High \(how far the scores sit from the line where conditions change\)/);
    assert.doesNotMatch(far, /MEDIUM/);

    // Two points under the risk line is nine on the tightness scale: Medium.
    const nearLine = { ...assessment, scores: { ...assessment.scores, riskAppetite: 48 } };
    const near = buildIssueTrackerMarkdownBrief(nearLine, treasury, sensors, macros);
    assert.match(near, /Confidence: Medium \(how far the scores sit/);
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

describe("buildGuardrailTagBlocks", () => {
  const items: ActionStripItem[] = [
    {
      lever: "hiring-stance",
      label: "Hiring posture",
      ownerLabel: "VP Eng",
      areaActionNow: "Hold speculative hiring.",
      triggerThreshold: "Pause net-new hiring above 56.",
      reversalCondition: "Resume below 46.",
    },
    {
      lever: "investment-pace",
      label: "Investment pace",
      ownerLabel: "CEO",
      areaActionNow: "Keep expansion bets reversible.",
      triggerThreshold: "Pause expansion spend above 70.",
      reversalCondition: "Resume below 60.",
    },
  ];

  it("builds one block per business area, each carrying posture, pause trigger and flip condition", () => {
    const blocks = buildGuardrailTagBlocks({
      actionStripItems: items,
      postureLabel: "Cloudy",
      recordDate: "2026-03-04",
      flipWatchSentence: "0.15% flatter on the 10Y−2Y curve would change conditions.",
    });

    assert.equal(blocks.length, 2);
    for (const block of blocks) {
      assert.match(block.markdown, /\*\*Conditions:\*\* Cloudy/);
      assert.match(block.markdown, /\*\*Action now:\*\* /);
      assert.match(block.markdown, /\*\*Pause if:\*\* /);
      assert.match(block.markdown, /\*\*Resume when:\*\* /);
      assert.match(block.markdown, /Week of 2026-03-04/);
    }
    assert.match(blocks[0].markdown, /Hold speculative hiring\./);
    // The area heads the block, so the lines under it carry only their condition.
    assert.match(blocks[0].markdown, /^\*\*Hiring\*\*$/m);
    assert.match(blocks[0].markdown, /\*\*Pause if:\*\* Net-new hiring above 56$/m);
    assert.doesNotMatch(blocks[0].markdown, /Pause if:\*\* Pause|Resume when:\*\* Resume/);
    assert.match(blocks[1].markdown, /Keep expansion bets reversible\./);
  });

  it("carries the flip watch sentence when one is given", () => {
    const blocks = buildGuardrailTagBlocks({
      actionStripItems: items,
      postureLabel: "Cloudy",
      recordDate: "2026-03-04",
      flipWatchSentence: "0.15% flatter on the 10Y−2Y curve would change conditions.",
    });

    assert.ok(blocks.every((block) => block.markdown.includes("0.15% flatter on the 10Y−2Y curve would change conditions.")));
  });

  it("omits the flip watch line when no axis is reachable", () => {
    const blocks = buildGuardrailTagBlocks({
      actionStripItems: items,
      postureLabel: "Cloudy",
      recordDate: "2026-03-04",
    });

    assert.ok(blocks.every((block) => !block.markdown.includes("would change conditions")));
  });

  it("returns no blocks for an empty action strip", () => {
    assert.deepEqual(
      buildGuardrailTagBlocks({ actionStripItems: [], postureLabel: "Cloudy", recordDate: "2026-03-04" }),
      [],
    );
  });
});
