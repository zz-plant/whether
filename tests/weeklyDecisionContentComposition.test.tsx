import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WeeklyDecisionContent } from "../app/components/weekly-card/decision-content/WeeklyDecisionContent";

describe("WeeklyDecisionContent composition boundaries", () => {
  it("keeps each section in the expected lane", () => {
    const html = renderToStaticMarkup(
      <WeeklyDecisionContent
        modePanel={<div>mode-panel</div>}
        influenceSection={<div>influence-section</div>}
        diagnosticsSection={<div>diagnostics-section</div>}
        matrixSection={<div>matrix-section</div>}
        actionStripSection={<div>action-strip-section</div>}
        asideContent={<div>aside-content</div>}
      />,
    );

    assert.ok(html.indexOf("mode-panel") < html.indexOf("influence-section"));
    assert.ok(html.indexOf("influence-section") < html.indexOf("diagnostics-section"));
    assert.ok(html.indexOf("diagnostics-section") < html.indexOf("matrix-section"));
    assert.ok(html.indexOf("matrix-section") < html.indexOf("action-strip-section"));
    assert.match(html, /aside-content/);
  });
});
