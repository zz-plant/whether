import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportSection } from "../app/components/reportSection";

describe("ReportSection", () => {
  it("renders unified sections with generated heading labels", () => {
    const html = renderToStaticMarkup(
      <ReportSection
        id="trust-snapshot"
        title="System status"
        description="Current operating state."
      >
        <p>All systems operational</p>
      </ReportSection>,
    );

    assert.match(html, /id="trust-snapshot"/);
    assert.match(html, /aria-labelledby="section-trust-snapshot-heading"/);
    assert.match(html, /id="section-trust-snapshot-heading"/);
    assert.match(html, /System status/);
    assert.match(html, /All systems operational/);
  });

  it("names a section whose header the step above states without a second heading", () => {
    const html = renderToStaticMarkup(
      <ReportSection id="rules" title="Rules before you commit" variant="split" hideHeader>
        <p>Body</p>
      </ReportSection>,
    );
    assert.match(html, /<section id="rules"[^>]*aria-label="Rules before you commit"/);
    assert.doesNotMatch(html, /<h[1-6]/, "the step's heading is the only one");
    assert.doesNotMatch(html, /aria-labelledby=/);
  });

  it("renders a static section header and body in split variant", () => {
    const html = renderToStaticMarkup(
      <ReportSection
        id="ops-weekly-plan"
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
    /* The title names the section; no small label sits over it (2026-10-09). */
    assert.doesNotMatch(html, /type-eyebrow/);
  });
});
