import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as nextNavigation from "next/navigation";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";
import { summarizeConditionRuns, summarizeInversionMonths } from "../lib/report/evidenceInstrumentSummaries";

serveUnreachableUpstreams();

const mockAny: any = mock;

/* The month picker reaches the router through next/navigation, which
   renderToStaticMarkup never mounts. Spread rather than replaced: `mock.module`
   patches the registry process-wide. */
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

const { buildSignalsPageModel, focusLabelByTab } = await import("../app/signals/evidencePageModel");
const { signalsEvidenceSections } = await import("../app/signals/components/evidencePageBody");

/*
 * Each closed question on /signals draws its answer beside it at text height,
 * from the values the answer is built from, and each opened panel holds the
 * months a reader can point at and open. What holds that together: a summary
 * carries no link (a control inside a control), its picture is hidden from
 * assistive tech because the sentence carries the meaning, the picture agrees
 * with the sentence, and the months in the panels are real links to the time
 * machine with what they read in their names.
 */
const model = await buildSignalsPageModel();
const TREND = (values: number[]) =>
  values.map((value, index) => ({ label: ["Aug 2026", "Sep 2026", "Oct 2026"][index] ?? "", value }));
const html = renderToStaticMarkup(
  <>
    {signalsEvidenceSections({
      model,
      focusLabelByTab,
      tightnessTrend: TREND([90, 70, 63]),
      riskAppetiteTrend: TREND([62, 60, 56]),
      searchParams: { focus: "growth" },
    })}
  </>,
);
const summaries = [...html.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/g)].map((match) => match[1] ?? "");
const between = (from: string, to: string) => html.slice(html.indexOf(from), to ? html.indexOf(to) : undefined);

describe("the pictures beside the closed questions", () => {
  it("hold no link and are hidden from assistive tech, the sentence beside them carrying the meaning", () => {
    const withPreview = summaries.filter((summary) => summary.includes("data-instrument-preview"));
    assert.equal(withPreview.length, 4, "rates, the curve, the two scores and past months");
    for (const summary of summaries) assert.doesNotMatch(summary, /<a\b/, "no link inside a summary");
    for (const summary of withPreview) {
      assert.match(summary, /<span aria-hidden="true"[^>]*data-instrument-preview/);
      assert.match(summary, /data-instrument-answer/, "the answer is still printed");
    }
  });

  it("draws the inversion strips in the answer's order, filled in as many months as it counts", () => {
    const summary = summarizeInversionMonths(model.yieldCurveSeries);
    const preview = summaries.find((entry) => entry.includes('data-preview="inversion"')) ?? "";
    const strips = [...preview.matchAll(/data-spread="(\w+)">([\s\S]*?)<\/span><\/span>/g)].map((match) => ({
      key: match[1],
      filled: (match[2]?.match(/data-inverted=""/g) ?? []).length,
    }));
    assert.deepEqual(
      strips.map((strip) => strip.key),
      summary.order,
    );
    const counts = { spread10Y2Y: summary.inverted10Y2Y, spread2Y3M: summary.inverted2Y3M };
    for (const strip of strips) {
      const expected = strip.key === "spread10Y2Y" ? counts.spread10Y2Y : strip.key === "spread2Y3M" ? counts.spread2Y3M : undefined;
      assert.equal(strip.filled, expected, strip.key);
    }
  });

  it("draws one cell per month-end the conditions answer counts across, each with its conditions", () => {
    const preview = summaries.find((entry) => entry.includes('data-preview="conditions"')) ?? "";
    const cells = [...preview.matchAll(/data-regime="(\w+)" class="record-week-cell/g)].map((match) => match[1]);
    assert.equal(cells.length, summarizeConditionRuns(model.regimeSeries).months);
    assert.deepEqual(cells, model.regimeSeries.map((entry) => entry.regime));
  });

  it("states the scale beside the two score lines and the rates line", () => {
    const scores = summaries.find((entry) => entry.includes("How have the two scores moved this year?")) ?? "";
    assert.match(scores, />0–100</);
    const rates = summaries.find((entry) => entry.includes("What are interest rates doing?")) ?? "";
    assert.match(rates, /\d+(<!-- -->)? mo · \d\.\d{2}–\d\.\d{2}%/);
  });
});

describe("the months in the opened panels", () => {
  it("links each month on the inversion row to the time machine, with the panel open and the reader's settings kept", () => {
    const panel = between('id="curve-context"', 'id="trends"');
    const links = [...panel.matchAll(/<a href="([^"]+)" aria-label="([^"]+)"/g)];
    assert.ok(links.length > 0);
    for (const [, href, label] of links) {
      assert.match(href ?? "", /^\/signals\?focus=growth&amp;curve=1&amp;month=\d+&amp;year=\d{4}#curve-context$/);
      assert.match(label ?? "", /^[A-Z][a-z]{2} \d{4}: Recession warning gauge|^[A-Z][a-z]{2} \d{4}: 2-year minus 3-month/);
    }
  });

  it("links each month-end score on the trends row, its two scores in its name", () => {
    const panel = between('id="trends"', 'id="advanced-controls"');
    assert.match(panel, /href="\/signals\?focus=growth&amp;trends=1&amp;month=10&amp;year=2026#trends" aria-label="Oct 2026: Funding pressure 63, risk appetite 56"/);
  });

  it("links each month-end on the rates row, its four rates in its name", () => {
    const panel = between('id="signal-diagnostics"', 'id="curve-context"');
    assert.match(panel, /aria-label="[A-Z][a-z]{2} \d{4}: 1-month \d\.\d{2}%, 3-month [\d.]+%, 2-year [\d.]+%, 10-year [\d.]+%"/);
    assert.match(panel, /href="\/signals\?focus=growth&amp;rates=1&amp;month=\d+&amp;year=\d{4}#signal-diagnostics"/);
  });

  it("names the month under the pointer or the keyboard on the conditions timeline, its runs filled and patterned", () => {
    const timeline = between('id="regime-timeline"', 'id="analog-pattern"');
    const first = model.regimeSeries[0];
    assert.ok(first);
    assert.match(timeline, new RegExp(`href="/signals\\?focus=growth&amp;month=${first.month}&amp;year=${first.year}"`));
    assert.match(timeline, /group-hover\/month:flex group-focus-visible\/month:flex/);
    assert.match(timeline, /data-regime="\w+" class="record-week-cell block h-full w-full"/);
  });
});
