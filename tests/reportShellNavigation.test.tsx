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
    assert.match(html, />Operate</);
    assert.match(html, />Reference</);

    assert.match(html, /Start/);
    assert.match(html, /Live posture call, confidence, and immediate operator actions\./);

    assert.match(html, /Signals/);
    assert.match(html, /Inspect drivers, thresholds, and historical signal context\./);

    assert.match(html, /Operations/);
    assert.match(html, /Apply hiring, spend, and cadence guardrails to execution\./);
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
