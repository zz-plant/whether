import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  actionButtonVariantClassNames,
  CopyLeadershipArtifactsButtons,
  resolveCopyActionLabel,
} from "../app/components/copyLeadershipArtifactsButtons";

describe("CopyLeadershipArtifactsButtons", () => {
  it("renders share and export actions in the artifact rail", () => {
    const html = renderToStaticMarkup(
      <CopyLeadershipArtifactsButtons
        boardSnippet="snippet"
        weeklyCallSnapshot="snapshot"
        weeklyOperatorBrief="brief"
        boardSummary="board"
        citation="citation"
      />,
    );

    const shareIndex = html.indexOf("Share brief");
    const snapshotIndex = html.indexOf("Copy weekly call snapshot");
    const boardSnippetIndex = html.indexOf("Copy board snippet");

    assert.ok(shareIndex >= 0);
    assert.ok(snapshotIndex >= 0);
    assert.ok(boardSnippetIndex >= 0);
  });

  it("maps copy states and preserves focus/disabled/touch button utility classes", () => {
    assert.equal(resolveCopyActionLabel("idle", "Copy"), "Copy");
    assert.equal(resolveCopyActionLabel("copying", "Copy"), "Copying");
    assert.equal(resolveCopyActionLabel("copied", "Copy"), "Copied");
    assert.equal(resolveCopyActionLabel("error", "Copy"), "Retry copy");

    const requiredInteractionTokens = [
      "focus-visible:outline",
      "focus-visible:outline-2",
      "focus-visible:outline-offset-2",
      "disabled:cursor-not-allowed",
      "disabled:border-slate-800",
      "disabled:text-slate-500",
      "touch-manipulation",
    ];

    for (const variant of ["primary", "secondary", "confirm", "danger"] as const) {
      const className = actionButtonVariantClassNames[variant];
      for (const token of requiredInteractionTokens) {
        assert.match(className, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      }
    }
  });
});
