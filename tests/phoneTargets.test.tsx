import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CorridorStrip } from "../app/about/corridorStrip";
import { CalendarReviewActions } from "../app/components/CalendarReviewActions";
import { ConfidenceRecordSection } from "../app/components/history/confidenceRecord";
import { PremiseOutcomeScatterChart } from "../app/components/history/premiseOutcomeScatterChart";
import { ThresholdLadder } from "../app/components/illustrations/ThresholdLadder";
import { GovernedAreas } from "../app/components/ui/governedAreas";
import { OrdinalMarker } from "../app/components/ui/ordinalMarker";
import { AdviceCorpusSection } from "../app/concepts/adviceCorpusSection";
import { AdvicePlane } from "../app/concepts/advicePlane";
import { FormulaReference } from "../app/trust/formulaReference";
import { loadPremiseTestBacktestModel } from "../lib/research/premiseBacktestModel";

/*
 * Taps and type on a phone (2026-11-12 phone audit, ui-ux-standards §II and §XXVIII).
 *
 * The audit measured, at 320px and 390px, where a tap lands (elementFromPoint) and how
 * large text is drawn (an SVG label's font size times its drawing's scale). These hold
 * what the fixes rest on that a render or a stylesheet can show.
 */
const css = (file: string) => readFileSync(file, "utf8");
const ruleBody = (source: string, selector: string) => {
  const start = source.indexOf(`${selector} {`);
  assert.ok(start >= 0, `${selector} is defined`);
  return source.slice(start, source.indexOf("}", start));
};

describe("tap areas on a phone", () => {
  it("keeps a link's 14px reach, and lets a stack lower only the reach upward", () => {
    const body = ruleBody(css("app/styles/controls.css"), ".weather-hit::after");
    /* Of two stacked links the later is painted over the earlier, so only its reach upward
       can cover the words above; the reach downward lies under whatever comes next. */
    assert.match(body, /inset: calc\(-1 \* var\(--weather-hit-up, 14px\)\) -4px -14px;/);
  });

  it("grows a small box to 44px and leaves the 36px chevrons at 8px", () => {
    const body = ruleBody(css("app/styles/controls.css"), ".weather-hit-box::after");
    const match = /inset: min\(-(\d+)px, calc\(50% - (\d+)px\)\);/.exec(body);
    assert.ok(match, "the reach is the larger of 8px and what 44px needs");
    const [floor, half] = [Number(match[1]), Number(match[2])];
    /* The ::after sits on the padding box: a 24px stepper with a 1px border is 22px inside. */
    const reach = (paddingBox: number) => Math.max(floor, half - paddingBox / 2);
    assert.equal(22 + 2 * reach(22), 44, "the 24px rate steppers on /operate/scenarios");
    assert.equal(reach(34), 8, "the 36px week chevrons keep their 8px");
  });

  it("sets the wrapped calendar links 24px apart, each reaching up only across the gap", () => {
    const html = renderToStaticMarkup(<CalendarReviewActions variant="compact" />);
    /* 18px rows of text: a 6px gap makes each row 24px, and a reach of 6px stops at the row above. */
    assert.match(html, /class="[^"]*\bgap-y-1\.5\b[^"]*\[--weather-hit-up:6px\]/);
  });

  it("keeps a score's area links from reaching up into the score's name", () => {
    const html = renderToStaticMarkup(<GovernedAreas metric="tightness" target="brief" />);
    assert.match(html, /data-governs="tightness"/);
    assert.match(html, /class="[^"]*\[--weather-hit-up:0px\]/, "on /signals a tap on 'Funding pressure' opened Hiring");
  });
});

describe("type on a phone", () => {
  it("sizes a chart's labels from --phone-label below sm", () => {
    const typography = css("app/styles/typography.css");
    const media = typography.indexOf("@media (width < 40rem)");
    assert.ok(media >= 0 && typography.indexOf(".weather-phone-labels text", media) > media);
    assert.match(ruleBody(typography, "  .weather-phone-labels text"), /font-size: var\(--phone-label\);/);
  });

  /* Each chart's drawn width on a 320px phone, measured on 2026-11-12: the column is 288px
     after the page gutters, and a chart in a card or with a max width is narrower. */
  const point = { slug: "s", title: "t", published: "2020-01", stance: "expand" as const, regime: "EXPANSION" as const, conditions: "Sunny", fundingPressure: 30, riskAppetite: 60 };
  const charts: Array<{ name: string; html: string; drawnAt320: number }> = [
    { name: "/about line strip", html: renderToStaticMarkup(<CorridorStrip changeLine={70} pauseLine={76} resumeLine={66} />), drawnAt320: 288 },
    { name: "/calibration reliability chart", html: renderToStaticMarkup(<ConfidenceRecordSection />), drawnAt320: 289 },
    { name: "/calibration scatter", html: renderToStaticMarkup(<PremiseOutcomeScatterChart model={loadPremiseTestBacktestModel()} />), drawnAt320: 256 },
    { name: "/concepts plane", html: renderToStaticMarkup(<AdvicePlane points={[point]} lines={{ fundingPressure: 70, riskAppetite: 50 }} />), drawnAt320: 288 },
    { name: "/trust quadrant", html: renderToStaticMarkup(<FormulaReference />), drawnAt320: 254 },
    { name: "threshold ladder", html: renderToStaticMarkup(<ThresholdLadder idPrefix="p1" min={0} max={100} current={44} trigger={76} reversal={66} signalLabel="Funding pressure" />), drawnAt320: 288 },
  ];

  for (const chart of charts) {
    it(`draws the ${chart.name}'s labels at 12px or more on a 320px phone`, () => {
      const svg = /<svg[^>]*class="[^"]*\bweather-phone-labels\b[^"]*"[^>]*>/.exec(chart.html)?.[0];
      assert.ok(svg, "the chart carries weather-phone-labels");
      const viewWidth = Number(/viewBox="[\d.-]+ [\d.-]+ ([\d.]+)/.exec(svg)?.[1]);
      const label = Number(/\[--phone-label:([\d.]+)px\]/.exec(svg)?.[1]);
      assert.ok(viewWidth > 0 && label > 0, "a viewBox and a phone label size");
      assert.ok((label * chart.drawnAt320) / viewWidth >= 11.995, `${label} units in ${viewWidth} drawn at ${chart.drawnAt320}px`);
    });
  }

  it("draws the corpus chart's phone drawing at 12px on a 320px phone", () => {
    const html = renderToStaticMarkup(<AdviceCorpusSection />);
    const start = html.search(/<svg viewBox="0 0 360 [^"]+" class="block h-auto w-full sm:hidden"/);
    assert.ok(start >= 0, "the phone drawing is 360 units wide");
    const phone = html.slice(start, html.indexOf("</svg>", start));
    const sizes = [...phone.matchAll(/font-size="([\d.]+)"/g)].map((match) => Number(match[1]));
    assert.ok(sizes.length > 0);
    assert.ok((Math.min(...sizes) * 288) / 360 >= 12, `smallest label ${Math.min(...sizes)} units`);
  });

  it("sets the list numerals at the 12px step on a phone", () => {
    assert.match(renderToStaticMarkup(<OrdinalMarker>{2}</OrdinalMarker>), /\bmax-sm:text-xs\b/);
  });
});
