import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportSection } from "../app/components/reportSection";

describe("ReportSection", () => {
  it("renders a static section header and body in split variant", () => {
    const html = renderToStaticMarkup(
      <ReportSection
        id="ops-weekly-plan"
        label="Start"
        title="Weekly plan"
        description="Review this before changing team pace."
        variant="split"
      >
        <p>Weekly approval boundary</p>
      </ReportSection>,
    );

    assert.match(html, /Weekly plan/);
    assert.match(html, /Weekly approval boundary/);
    assert.doesNotMatch(html, /aria-controls=/);
    assert.doesNotMatch(html, /type="button"/);
  });
});

