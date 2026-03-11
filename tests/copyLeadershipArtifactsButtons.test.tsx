import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CopyLeadershipArtifactsButtons } from "../app/components/copyLeadershipArtifactsButtons";

describe("CopyLeadershipArtifactsButtons", () => {
  it("prioritizes weekly brief, playbook, and evidence actions in order with mobile-safe touch targets", () => {
    const html = renderToStaticMarkup(
      <CopyLeadershipArtifactsButtons
        weeklyOperatorBrief="brief"
        boardSummary="board"
        citation="citation"
      />,
    );

    const copyIndex = html.indexOf("Copy Weekly Operator Brief");
    const playbookIndex = html.indexOf("View action playbook");
    const evidenceIndex = html.indexOf("Inspect evidence");
    const moreActionsIndex = html.indexOf("More artifact actions");

    assert.ok(copyIndex >= 0);
    assert.ok(playbookIndex > copyIndex);
    assert.ok(evidenceIndex > playbookIndex);
    assert.ok(moreActionsIndex > evidenceIndex);
    assert.match(html, /min-h-\[44px\]/);
    assert.match(html, /href="\/operations"/);
    assert.match(html, /href="\/signals"/);
  });
});
