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
  it("renders Weekly Brief as the anchor and the remaining routes as support paths", () => {
    const html = renderToStaticMarkup(
      <ReportPageNavigation
        pageLinks={reportPageLinks}
        pageTitle="Weekly Brief"
        currentPath="/"
      />,
    );

    assert.match(html, /Anchor route/);
    assert.match(html, /Support paths/);
    assert.match(html, /Start from Weekly Brief/);
    assert.match(html, /Surface 1 of 5/);

    assert.match(html, /Weekly Brief/);
    assert.match(html, /Evidence/);
    assert.match(html, /Evidence for this week&#x27;s call: drivers, thresholds, freshness, and replay\./);
    assert.match(html, /Route \/signals/);

    assert.match(html, /Planning/);
    assert.match(html, /Planning for this week&#x27;s hiring, spending, roadmap, finance, and share-ready plan\./);
  });

  it("keeps current path highlighting with aria-current page", () => {
    const html = renderToStaticMarkup(
      <ReportPageNavigation
        pageLinks={reportPageLinks}
        pageTitle="Evidence"
        currentPath="/signals"
      />,
    );

    assert.match(html, /aria-current="page"[^>]*href="\/signals"/);
  });

  it("renders mobile section links instead of a section count only", () => {
    const html = renderToStaticMarkup(
      <ReportMobileNavigation
        pageLinks={reportPageLinks}
        pageTitle="Evidence"
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

    assert.match(html, /Return to Weekly Brief/);
    assert.match(html, /2 of 5/);
    assert.match(html, /Jump straight to the part of Evidence on \/signals you need\./);
    assert.match(html, /href="#current-scores"/);
    assert.match(html, /href="#thresholds"/);
    assert.match(html, /\+1 more section below\./);
    assert.match(html, /Support paths/);
    assert.match(html, /Route \/operations/);
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
