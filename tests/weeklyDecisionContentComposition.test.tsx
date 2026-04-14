import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WeeklyDecisionContent } from "../app/components/weekly-card/decision-content/WeeklyDecisionContent";

describe("WeeklyDecisionContent composition boundaries", () => {
  it("keeps the role-first brief ahead of the action strip", () => {
    const html = renderToStaticMarkup(
      <WeeklyDecisionContent
        modePanel={<div>mode-panel</div>}
        actionStripSection={<div>action-strip-section</div>}
      />,
    );

    assert.ok(html.indexOf("mode-panel") < html.indexOf("action-strip-section"));
    assert.doesNotMatch(html, /aside-content/);
  });
});
