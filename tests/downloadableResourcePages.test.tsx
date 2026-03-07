import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import CapitalPostureTemplatePage from "../app/resources/capital-posture-template/page";
import QuarterlyMemoExamplePage from "../app/resources/quarterly-capital-posture-memo-example/page";
import ReversalTriggerChecklistPage from "../app/resources/reversal-trigger-checklist/page";

describe("downloadable resource pages", () => {
  it("renders title, CTAs, and shared internal links for capital posture template", () => {
    const html = renderToStaticMarkup(<CapitalPostureTemplatePage />);

    assert.match(html, /Capital Posture Template/);
    assert.match(html, /href="\/downloads\/capital-posture-template.md"/);
    assert.match(html, /href="\/start\?intent=capital-posture-template-gated"/);
    assert.match(html, /Canonical pillar: Capital Discipline/);
    assert.match(html, /Board Framework page/);
  });

  it("renders title, CTAs, and shared internal links for reversal trigger checklist", () => {
    const html = renderToStaticMarkup(<ReversalTriggerChecklistPage />);

    assert.match(html, /Reversal Trigger Checklist/);
    assert.match(html, /href="\/downloads\/reversal-trigger-checklist.md"/);
    assert.match(html, /href="\/resources\/decision-shield-overview"/);
    assert.match(html, /Canonical pillar: Capital Discipline/);
    assert.match(html, /Board Framework page/);
  });

  it("renders title, CTAs, and shared internal links for quarterly memo example", () => {
    const html = renderToStaticMarkup(<QuarterlyMemoExamplePage />);

    assert.match(html, /Quarterly Capital Posture Memo Example/);
    assert.match(html, /href="\/downloads\/quarterly-capital-posture-memo-example.md"/);
    assert.match(html, /href="\/resources\/capital-posture-template"/);
    assert.match(html, /Canonical pillar: Capital Discipline/);
    assert.match(html, /Board Framework page/);
  });
});
