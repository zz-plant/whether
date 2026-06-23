import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  actionButtonVariantClassNames,
  buildExplainerBriefContent,
  resolveCopyActionLabel,
} from "../app/components/copyLeadershipArtifactsButtons";

describe("CopyLeadershipArtifactsButtons", () => {
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
      "disabled:text-slate-400",
      "touch-manipulation",
    ];

    for (const variant of ["primary", "secondary", "confirm", "danger"] as const) {
      const className = actionButtonVariantClassNames[variant];
      for (const token of requiredInteractionTokens) {
        assert.match(className, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      }
    }
  });

  it("keeps the explainer brief aligned to the public decision contract", () => {
    const brief = buildExplainerBriefContent({
      boardSummary: "Board summary",
      weeklyOperatorBrief: "Operator brief",
      citation: "Citation",
    });

    assert.match(brief, /Posture = the weekly forecast for operating conditions\./);
    assert.match(brief, /Do now = what to do this week\./);
    assert.match(brief, /Pause if = the condition to watch for that would pause the plan/);
    assert.match(brief, /Re-open when = what must improve before conditions clear\./);
    assert.doesNotMatch(brief, /stop line|reopen line/i);
  });
});
