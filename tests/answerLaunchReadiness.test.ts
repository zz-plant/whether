import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { scoreAnswerLaunchReadiness, summarizeAnswerLaunchReadiness } from "../lib/seo/answerLaunchReadiness";

describe("answer launch readiness", () => {
  it("scores all configured answer pages as launch-eligible", () => {
    const records = scoreAnswerLaunchReadiness();
    const summary = summarizeAnswerLaunchReadiness(records);

    assert.ok(summary.total > 0);
    assert.equal(summary.blocked, 0, `unexpected blocked answer pages: ${JSON.stringify(summary.blockedSlugs)}`);
  });
});
