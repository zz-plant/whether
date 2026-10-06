import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as nextNavigation from "next/navigation";

const mockAny: any = mock;

/* The month picker reaches the router through next/navigation, which
   renderToStaticMarkup never mounts. Spread rather than replaced: `mock.module`
   patches the registry process-wide (see recordRoutesReadingOrder). */
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

const { buildSignalsPageModel, focusLabelByTab } = await import("../app/signals/evidencePageModel");
const { signalsEvidenceSections } = await import("../app/signals/components/evidencePageBody");

/*
 * /signals opened on "What this means now", the brief's call restated under
 * the shell's own stamp, and its charts disclosure opened by default: about
 * 2,000px of charts before the month picker, the reference cycle and the line
 * settings. It leads with the delta now, and every instrument is a closed
 * question.
 */
const model = await buildSignalsPageModel();
const html = renderToStaticMarkup(
  <>{signalsEvidenceSections({ model, focusLabelByTab, tightnessTrend: [], riskAppetiteTrend: [] })}</>,
);
const instruments = html.slice(html.indexOf('id="instruments"'));

describe("/signals leads with the delta and folds its instruments", () => {
  it("opens on what changed, with no restated call", () => {
    assert.ok(html.indexOf('id="what-changed"') < html.indexOf('id="call-lines"'));
    assert.ok(html.indexOf('id="call-lines"') < html.indexOf('id="instruments"'));
    assert.doesNotMatch(html, /What this means now|id="decision-summary"/);
    assert.ok(!model.sectionLinks.some((link) => link.href === "#decision-summary"));
  });

  it("titles every instrument with its question, and opens none of them", () => {
    for (const question of [
      "What are interest rates doing?",
      "How have the two scores moved this year?",
      "What would the call be with different lines?",
      "What did the brief say in an earlier month?",
      "Which past cycle looks most like this one?",
      "Which habits from the zero-rate years still shape your company?",
    ]) {
      assert.ok(instruments.includes(question), question);
    }
    const details = instruments.match(/<details[^>]*>/g) ?? [];
    assert.ok(details.length >= 5, "the instruments are disclosures");
    assert.deepEqual(details.filter((tag) => /\sopen(=|\s|>)/.test(tag)), [], "none opens by default");
  });
});
