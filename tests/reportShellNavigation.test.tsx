import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PageFlowNav } from "../app/components/pageFlowNav";
import { ReportSectionNavigation } from "../app/components/reportShellNavigation";

describe("Report section navigation", () => {
  it("renders in-page section links as the lightweight index", () => {
    const html = renderToStaticMarkup(
      <ReportSectionNavigation
        sectionLinks={[
          { href: "#decision-summary", label: "Decision summary" },
          { href: "#current-scores", label: "Current scores" },
          { href: "#advanced-controls", label: "Advanced controls" },
        ]}
      />,
    );

    assert.match(html, /href="#current-scores"/);
    assert.match(html, /Current scores/);
    assert.match(html, /Advanced controls/);
  });
});

describe("PageFlowNav", () => {
  it("keeps section cards as actual in-page links", () => {
    const html = renderToStaticMarkup(
      <PageFlowNav
        eyebrow="Scroll path"
        title="Move through the weekly brief"
        description="Decision transmission path"
        items={[
          { href: "#audit-this-call", label: "Audit", summary: "Check the call." },
          { href: "#decision-utilities", label: "Validate", summary: "Run utilities." },
        ]}
      />, 
    );

    assert.match(html, /href="#audit-this-call"/);
    assert.match(html, /href="#decision-utilities"/);
    assert.match(html, /2 sections/);
  });
});
