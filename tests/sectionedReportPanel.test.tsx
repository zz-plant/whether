import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SectionedReportPanel } from "../app/operations/components/sectionedReportPanel";

describe("SectionedReportPanel", () => {
  it("renders a static section header and body without nested disclosure controls", () => {
    const html = renderToStaticMarkup(
      <SectionedReportPanel
        id="ops-weekly-plan"
        label="Start"
        title="Weekly plan"
        description="Review this before changing team pace."
      >
        <p>Weekly approval boundary</p>
      </SectionedReportPanel>,
    );

    assert.match(html, /Weekly plan/);
    assert.match(html, /Weekly approval boundary/);
    assert.doesNotMatch(html, /aria-controls=/);
    assert.doesNotMatch(html, /type="button"/);
  });
});
