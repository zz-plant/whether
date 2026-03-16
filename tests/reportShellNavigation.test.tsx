import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportPageNavigation } from "../app/components/reportShellNavigation";
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
});
