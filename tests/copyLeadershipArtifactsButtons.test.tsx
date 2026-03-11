import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CopyLeadershipArtifactsButtons } from "../app/components/copyLeadershipArtifactsButtons";

describe("CopyLeadershipArtifactsButtons", () => {
  it("prioritizes meeting pack, weekly brief, playbook, and evidence actions in order with mobile-safe touch targets", () => {
    const html = renderToStaticMarkup(
      <CopyLeadershipArtifactsButtons
        weeklyOperatorBrief="brief"
        boardSummary="board"
        citation="citation"
      />,
    );

    const meetingPackIndex = html.indexOf("Copy Meeting Pack");
    const copyIndex = html.indexOf("Copy Weekly Operator Brief");
    const playbookIndex = html.indexOf("View action playbook");
    const evidenceIndex = html.indexOf("Inspect evidence");
    const moreActionsIndex = html.indexOf("Share for meeting/Slack");

    assert.ok(meetingPackIndex >= 0);
    assert.ok(copyIndex > meetingPackIndex);
    assert.ok(playbookIndex > copyIndex);
    assert.ok(evidenceIndex > playbookIndex);
    assert.ok(moreActionsIndex > evidenceIndex);
    assert.match(html, /min-h-\[44px\]/);
    assert.match(html, /href="\/operations"/);
    assert.match(html, /href="\/signals"/);
  });
});
