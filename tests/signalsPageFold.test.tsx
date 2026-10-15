import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as nextNavigation from "next/navigation";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";

serveUnreachableUpstreams();

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

/* The two month-end series the page passes the score strip; empty above, so
   the trends question is checked with them here. */
const TREND = (values: number[]) => values.map((value, index) => ({ label: `M${index + 1}`, value }));
const withTrends = renderToStaticMarkup(
  <>
    {signalsEvidenceSections({
      model,
      focusLabelByTab,
      tightnessTrend: TREND([90, 70, 63]),
      riskAppetiteTrend: TREND([62, 60, 56]),
    })}
  </>,
);
/** The answer printed right after a question, inside the same summary or trigger. */
const summaryAnswer = (markup: string, question: string) => {
  const start = markup.indexOf(question);
  assert.ok(start >= 0, question);
  const tail = markup.slice(start + question.length);
  const match = tail.match(/^\s*<span class="font-normal text-slate-400" data-instrument-answer="true">([^<]+)</);
  return match?.[1];
};

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
      /* Was "What would the call be with different lines?": "the call" is
         retired reader vocabulary (lib/report/AGENTS.md). Changed on purpose. */
      "What would conditions be with different lines?",
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

/*
 * Six of the seven closed questions said only what was behind them; the
 * reference cycle alone printed its answer. Each now carries its answer, and
 * each answer is checked against what its own panel draws when opened, which
 * is the point: a summary that disagreed with the chart under it would cost
 * more than no summary (ui-ux-standards §XV).
 */
describe("/signals answers each closed question in its summary", () => {
  it("rates: this week's 1-month rate, which the opened panel prints too", () => {
    const answer = summaryAnswer(withTrends, "What are interest rates doing?");
    const oneMonth = model.treasury.yields.oneMonth;
    assert.ok(typeof oneMonth === "number");
    assert.ok(answer?.startsWith(`1-month rate ${oneMonth.toFixed(2)}%`), answer);
    const panel = withTrends.slice(withTrends.indexOf('id="signal-diagnostics"'), withTrends.indexOf('id="curve-context"'));
    assert.match(panel, new RegExp(`Latest: [^<]*1M (<!-- -->)?${oneMonth.toFixed(2).replace(".", "\\.")}%`), "the panel prints the rate the summary quotes");
  });

  it("inversion: yes or no, from the counts the chart's caption prints", () => {
    const answer = summaryAnswer(withTrends, "Has the yield curve inverted in the last year?") ?? "";
    const caption = withTrends.match(/10Y−2Y has been inverted\s*(?:<!-- -->)?\s*(\d+)\s*(?:<!-- -->)? of (?:<!-- -->)?(\d+)(?:<!-- -->)? months, 2Y−3M (?:<!-- -->)?(\d+)/);
    assert.ok(caption, "the caption prints the counts");
    const [, longCount, months, shortCount] = caption;
    if (longCount === "0" && shortCount === "0") {
      assert.ok(answer.startsWith("No:"), answer);
    } else {
      assert.ok(answer.startsWith("Yes:"), answer);
      for (const count of [longCount, shortCount].filter((value) => value !== "0")) {
        assert.ok(answer.includes(`${count} of ${months} months`), answer);
      }
    }
  });

  it("score trends: the move each cell prints, from the same window", () => {
    assert.equal(
      summaryAnswer(withTrends, "How have the two scores moved this year?"),
      "Funding pressure down 27 to 63, risk appetite down 6 to 56 (2 months to M3)",
    );
    const cells = withTrends.slice(withTrends.indexOf('id="trends"'));
    assert.match(cells, /63<\/span>/);
    assert.match(cells, /-27(<!-- -->)? over (<!-- -->)?2(<!-- -->)? mo/);
    assert.equal(summaryAnswer(html, "How have the two scores moved this year?"), undefined, "no series, no answer");
  });

  it("lines: the lines in force, in the words of the panel's defaults line", () => {
    const { thresholds } = model.assessment;
    assert.equal(
      summaryAnswer(withTrends, "What would conditions be with different lines?"),
      `Lines now: rate ${thresholds.baseRateTightness}% · funding pressure ${thresholds.tightnessRegime} · risk appetite ${thresholds.riskAppetiteRegime}`,
    );
  });

  /* The summary is the one place the count prints: the timeline under it carried a
     "Changes in conditions" card with the same sentence until 2026-10-14. */
  it("past months: the change count, printed once", () => {
    const answer = summaryAnswer(withTrends, "What did the brief say in an earlier month?");
    assert.ok(answer && /^(No change|\d+ changes?) across the last \d+ months$/.test(answer), answer);
    const timeline = withTrends.slice(withTrends.indexOf('id="regime-timeline"'));
    assert.ok(!timeline.includes(answer), "the timeline under it does not repeat it");
  });

  it("the reference cycle and the zero-rate habits name what the table holds", () => {
    assert.ok(summaryAnswer(withTrends, "Which past cycle looks most like this one?"));
    const habits = summaryAnswer(withTrends, "Which habits from the zero-rate years still shape your company?") ?? "";
    const fossil = withTrends.slice(withTrends.indexOf('id="fossil-record"'));
    const domains = [...fossil.matchAll(/<td class="py-3 pr-3 font-semibold[^"]*">([^<]+)<\/td>/g)].map((match) => match[1]);
    assert.ok(domains.length > 0);
    for (const domain of domains) assert.ok(habits.toLowerCase().includes(domain.toLowerCase()), domain);
  });
});

describe("/signals what-changed table and rails", () => {
  it("gives the short-term rate a reason like every other row, not a bare dash", () => {
    const row = html.slice(html.indexOf('data-signal="baseRate"'), html.indexOf("</tr>", html.indexOf('data-signal="baseRate"')));
    assert.match(row, /Rates are the biggest single input to funding pressure/);
    assert.doesNotMatch(row, /<td[^>]*><span class="text-slate-500">—<\/span><\/td>\s*$/);
  });

  it("caps each rail at the wide track its labels are laid out for", () => {
    const callLines = html.slice(html.indexOf('id="call-lines"'), html.indexOf('id="instruments"'));
    assert.match(callLines, /md:grid-cols-\[repeat\(2,minmax\(0,28rem\)\)\]/);
    assert.doesNotMatch(callLines, /md:grid-cols-2\b/);
  });
});
