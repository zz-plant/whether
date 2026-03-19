import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PageFlowNav } from "../app/components/pageFlowNav";
import {
  ReportMobileNavigation,
  ReportPageNavigation,
} from "../app/components/reportShellNavigation";
import { reportPageLinks } from "../lib/report/reportNavigation";

describe("Report shell page navigation", () => {
  it("renders grouped labels and route descriptions for core routes", () => {
    const html = renderToStaticMarkup(
      <ReportPageNavigation
        pageLinks={reportPageLinks}
        pageTitle="Start"
        currentPath="/"
      />,
    );

    assert.match(html, />Now</);
    assert.match(html, />Workflows</);
    assert.match(html, />Reference</);

    assert.match(html, /Weekly Brief/);
    assert.match(html, /Current posture, bounded call, and share-ready artifact\./);

    assert.match(html, /Signals/);
    assert.match(html, /Deep evidence appendix for drivers, thresholds, and freshness behind the weekly brief\./);

    assert.match(html, /Operations/);
    assert.match(html, /Detailed execution guardrails once the weekly plan needs deeper review\./);
  });

  it("keeps current path highlighting with aria-current page", () => {
    const html = renderToStaticMarkup(
      <ReportPageNavigation
        pageLinks={reportPageLinks}
        pageTitle="Signals"
        currentPath="/signals"
      />,
    );

    assert.match(html, /aria-current="page"[^>]*href="\/signals"/);
  });

  it("renders mobile section links instead of a section count only", () => {
    const html = renderToStaticMarkup(
      <ReportMobileNavigation
        pageLinks={reportPageLinks}
        pageTitle="Signals"
        currentPath="/signals"
        sectionLinks={[
          { href: "#current-scores", label: "Current scores" },
          { href: "#thresholds", label: "Thresholds" },
          { href: "#evidence-priorities", label: "Top drivers" },
          { href: "#historical-replay", label: "Replay" },
          { href: "#decision-summary", label: "Decision" },
        ]}
      />, 
    );

    assert.match(html, /Jump straight to the part of Signals you need\./);
    assert.match(html, /href="#current-scores"/);
    assert.match(html, /href="#thresholds"/);
    assert.match(html, /\+1 more section below\./);
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
    assert.match(html, /Jump to section/);
  });
});
