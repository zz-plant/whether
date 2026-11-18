import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as nextNavigation from "next/navigation";

import { WhatWouldChangeSection } from "../app/components/home/WhatWouldChangeSection";
import { WhyConditionsSection } from "../app/components/home/WhyConditionsSection";
import { AreaTable } from "../app/components/ui/areaTable";
import { RuleRegionMap } from "../app/components/ui/ruleRegionMap";
import { AreaStateHistory } from "../app/operate/components/areaStateHistory";
import { PlanLinesForm } from "../app/operate/components/planLinesForm";
import { buildAreaRows } from "../app/operate/areaRows";
import { planLinesFromRules } from "../lib/alert/planLines";
import { buildCanonicalBoundedDecisionRules } from "../lib/report/boundedDecisionRules";
import { buildActionStripItems } from "../lib/report/operatingCalls";
import {
  buildAreaStateHistory,
  buildRuleChartModel,
  buildRuleRegions,
  compareOwnRule,
  describeRegionsAt,
  ruleFromStripItem,
} from "../lib/report/ruleRegions";

/* The section's client pieces mount no router; spread the real module, as every stub here does. */
const mockAny: any = mock;
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
}));

const week = { tightness: 90, riskAppetite: 44 };
const changeLines = { tightness: 70, riskAppetite: 50 };
const rules = buildCanonicalBoundedDecisionRules({ regime: "SCARCITY", thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 }, scores: week });
const model = buildRuleChartModel({
  rules,
  scores: week,
  leadArea: "hiring",
  notCounted: [{ metric: "riskAppetite", score: 33 }],
  changeLines,
  regime: "SCARCITY",
  rateMoves: [
    {
      key: "cut-1",
      tightness: 63,
      riskAppetite: 44,
      label: "After one Fed cut",
      name: "After one quarter-point Fed cut",
      how: "One quarter-point Fed cut would take the 1-month rate to 3.85% and funding pressure to 63, with everything else as this week.",
    },
    {
      key: "cut-2",
      tightness: 18,
      riskAppetite: 44,
      label: "After two",
      name: "After two quarter-point Fed cuts",
      how: "Two quarter-point Fed cuts would take the 1-month rate to 3.60% and funding pressure to 18, with everything else as this week.",
    },
  ],
  /* The engine's ramp, as `fundingPressureRateLookup` scans it: 180 points a point above 3.5%. */
  rateAtFundingPressure: { name: "1-month rate", at: (value) => (value > 0 && value < 90 ? Math.ceil((3.5 + (value - 0.5) / 180) * 100) / 100 : null) },
});
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const section = (ruleChart?: Parameters<typeof WhatWouldChangeSection>[0]["ruleChart"]) =>
  renderToStaticMarkup(
    <WhatWouldChangeSection
      ladders={[
        { metric: "tightness", label: "Funding pressure", value: 90, previous: 90, lines: [{ kind: "callChange", value: 70 }] },
        { metric: "riskAppetite", label: "Risk appetite", value: 44, previous: 55, lines: [{ kind: "callChange", value: 50 }] },
      ]}
      flipProximity={[
        {
          axis: "tightness",
          sentence: "Less than one quarter-point Fed cut turns conditions Stormy.",
          instrument: "That is the 1-month Treasury bill rate falling 0.21 percentage points.",
          scale: "The 1-month rate moved that far in about 1 month in 10 since 2012.",
        },
      ]}
      guardrail="Funding pressure is above 76. Funding pressure is 90 now."
      leadResume="Funding pressure falls below 66 and risk appetite is above 54"
      leadHeld
      reversalTrigger="Funding pressure falls 20 pts from 90 to 70 or below, or risk appetite rises 6 pts from 44 to clear 50."
      callChangeLines={changeLines}
      regime="SCARCITY"
      ruleChart={ruleChart}
      conditionsTrail={{ points: [{ tightness: 63, riskAppetite: 56, label: "Aug 31, 2026", month: "2026-08" }], caption: "Trail: month-ends, Aug 2026.", caveat: null }}
      feelsLike={{ regime: "SCARCITY", tightness: 90, riskAppetite: 33 }}
    />,
  );

describe("the conditions chart's rule layer on the brief", () => {
  it("opens on the lead rule: its regions shaded, its key, and the sentence beside it unchanged", () => {
    const html = section({ ...model, initialReading: null, query: { cadence: "weekly" } });
    assert.match(html, /data-rule-chooser/);
    assert.match(text(html), /Which area\?/);
    /* Links to each state, keeping the page's query: no form field on a page whose budget counts them. */
    assert.equal(html.match(/data-rule-area=/g)?.length, 5, "the five areas");
    assert.doesNotMatch(html, /<input/);
    /* No decision chosen: the lead area is current and the other areas' links choose theirs. */
    assert.match(html, /<a href="\/\?cadence=weekly&amp;decision=hiring#what-would-change"[^>]*aria-current="page"[^>]*data-rule-area="hiring"/);
    assert.match(html, /<a href="\/\?cadence=weekly&amp;decision=capital-raising#what-would-change"[^>]*data-rule-area="capital-raising"/);
    assert.match(html, /data-rule-region="pause"/);
    assert.match(html, /data-rule-region="resume"/);
    assert.match(text(html), /Hiring pauses restarts between them, nothing changes/);
    assert.match(html, />Restart when</, "the guidance's own label, as before");
    assert.match(text(html), /Restart when Funding pressure falls below 66 and risk appetite is above 54/);
    assert.match(html, /This week&#x27;s reading is where Hiring pauses\./, "the claim is in the figure's text alternative");
    assert.doesNotMatch(html, /region\b(?!=)/, "no drawing's name in the text a reader meets");
  });

  it("offers each reading as a link, this week's current, with the answer line empty until one is chosen", () => {
    const html = section({ ...model, initialReading: null, query: { cadence: "weekly" } });
    assert.match(text(html), /Which reading\? This week&#x27;s Startup-market inputs counted After one Fed cut After two/);
    assert.match(html, /<a href="\/\?cadence=weekly#what-would-change"[^>]*aria-current="page"[^>]*data-reading="this-week"/);
    assert.match(html, /<a href="\/\?cadence=weekly&amp;reading=counted#what-would-change"[^>]*>Startup-market inputs counted</);
    assert.match(html, /<a href="\/\?cadence=weekly&amp;reading=cut-2#what-would-change"[^>]*aria-label="After two quarter-point Fed cuts"[^>]*>After two</);
    assert.match(html, /data-reading-answer="" aria-live="polite"><\/p>/, "its line is empty until a reading is chosen");
    /* The counted reading is a choice here, so the chart does not draw it a second time as a glyph. */
    assert.doesNotMatch(html, /data-feels-like-point|Where it feels like/);
    /* One button, copying the link to this picture. */
    assert.match(html, /<button[^>]*aria-label="Copy link to this chart"[^>]*>Copy link<\/button>/);
  });

  it("labels the shown area's funding-pressure lines and the change line with the 1-month rate, and drops the bill's line from the fold", () => {
    const html = section({ ...model, initialReading: null });
    assert.match(text(html), /66 3\.87% 70 3\.89% 76 3\.92% ← 1-month rate/);
    assert.doesNotMatch(html, /data-change-line="tightness"/, "the 70 is the column's row");
    assert.match(html, /1-month rate: funding pressure 70 at 3\.89%, funding pressure 76 at 3\.92%, funding pressure 66 at 3\.87%\./);
    assert.match(text(html), /Less than one quarter-point Fed cut turns conditions Stormy\. The 1-month rate moved that far/);
    assert.doesNotMatch(html, /Treasury bill/);
    /* Without the rates, nothing is labelled and the fold keeps its line. */
    const plain = section({ ...model, fundingPressureRates: null, initialReading: null });
    assert.doesNotMatch(plain, /data-rate-ticks/);
    assert.match(plain, /data-change-line="tightness"/);
    assert.match(plain, /That is the 1-month Treasury bill rate falling 0\.21 percentage points\./);
  });

  it("marks each trail dot with its month, for the page's month cursor", () => {
    const html = section({ ...model, initialReading: null });
    assert.match(html, /<g data-month="2026-08"/);
    assert.match(html, /class="hidden in-data-\[month-active\]:inline"/);
  });

  it("shades a chosen area, prints its own side under its name, and its undrawn condition", () => {
    const html = section({ ...model, initialArea: "product-tempo", initialReading: null });
    assert.match(html, /aria-current="page"[^>]*data-rule-area="product-tempo"/);
    /* Roadmap is not paused at risk appetite 44 (not below 44), so its pause side is the one that can change it. */
    assert.match(text(html), /Roadmap pauses if Risk appetite falls below 44 or two weekly readings in a row come in weaker/);
    assert.doesNotMatch(html, />Restart when</);
    assert.match(html, /data-rule-note/);
    assert.match(text(html), /Not drawn: Roadmap also pauses if two weekly readings in a row come in weaker/);
    /* Roadmap is not on hold, so there is no restart to email about. */
    assert.doesNotMatch(html, /data-restart-email/);
  });

  it("offers the restart email under the key for an area on hold", () => {
    const html = section({ ...model, initialArea: "capital-raising", initialReading: null });
    assert.match(html, /<a[^>]*href="\/operate\?watch=capital-raising#ops-plan-lines"[^>]*>Email me when Fundraising restarts →<\/a>/);
  });

  it("plots a chosen reading as the dot, this week's hollow, and answers first under the chart", () => {
    const counted = section({ ...model, initialReading: "counted" });
    assert.match(counted, /aria-current="page"[^>]*data-reading="counted"/);
    assert.match(counted, /<a href="\/#what-would-change"[^>]*data-reading="this-week"/, "and this week's is a link back");
    assert.match(text(counted), /Startup-market inputs counted: Funding pressure 90 · Risk appetite 33/);
    assert.match(text(counted), /Roadmap would pause\. With startup-market inputs counted, risk appetite would be 33\./);
    /* This week's reading stays on the chart, hollow and named. */
    assert.match(text(counted), /This week&#x27;s reading 90 44/);
    /* The published guidance does not change. */
    assert.match(text(counted), /Restart when Funding pressure falls below 66 and risk appetite is above 54/);

    const cut = section({ ...model, initialReading: "cut-1" });
    assert.match(text(cut), /After one Fed cut: Funding pressure 63 · Risk appetite 44/);
    assert.match(text(cut), /Spending would restart\. Conditions would turn Stormy\. One quarter-point Fed cut would take the 1-month rate to 3\.85% and funding pressure to 63, with everything else as this week\./);
    assert.match(cut, /After one quarter-point Fed cut is between the two, where nothing changes\./);
    assert.match(text(cut), /Restart when Funding pressure falls below 66 and risk appetite is above 54/);
  });

  it("leaves the chart as it was for a caller without the layer", () => {
    const html = section();
    assert.doesNotMatch(html, /data-rule-chooser|data-rule-region|data-reading-choices|Copy link/);
    assert.match(html, />Restart when</);
  });

  it("links the boxed note in 'Why conditions are' to the chart, counted", () => {
    const html = renderToStaticMarkup(
      <WhyConditionsSection
        regime="SCARCITY"
        tightness={90}
        riskAppetite={44}
        changeLines={changeLines}
        notCounted={[{ metric: "riskAppetite", label: "startup-market inputs", score: 33, published: 44, line: "44" }]}
        warning={null}
        chartHref="/?reading=counted#what-would-change"
      />,
    );
    assert.match(html, /<a href="\/\?reading=counted#what-would-change"[^>]*data-counted-chart-link/);
    assert.match(text(html), /See it charted/);
  });
});

describe("the rules table on /operate", () => {
  const items = buildActionStripItems(rules, week);
  const stripRules = items.map(ruleFromStripItem);

  it("judges a pause by its crossed line, so Fundraising at 90 reads in effect, not at the line", () => {
    const rows = buildAreaRows(items, week);
    for (const area of ["hiring", "capital-raising", "burn-discipline", "expansion-bets"] as const) {
      assert.equal(rows.find((row) => row.area === area)?.pause?.state, "crossed", area);
    }
    assert.equal(rows.find((row) => row.area === "product-tempo")?.pause?.distance, "at the line");
  });

  it("draws each row's rule as a small chart in place of the proximity rail", () => {
    const rows = buildAreaRows(items, week).map((row) => {
      const rule = stripRules.find((candidate) => candidate.area === row.area)!;
      return {
        ...row,
        map: (
          <RuleRegionMap area={row.area} regions={buildRuleRegions(rule)} scores={week} changeLines={changeLines} label={describeRegionsAt(rule, week, "This week's reading")} />
        ),
      };
    });
    const html = renderToStaticMarkup(<AreaTable rows={rows} caption="Rules" bothSides />);
    assert.match(html, />On the chart</);
    assert.equal(html.match(/data-rule-region-map=/g)?.length, 5);
    assert.match(html, /<span class="sr-only">Fundraising pauses where Risk appetite &lt; 44 or Funding pressure &gt; 76/);
    assert.doesNotMatch(html, /rounded-full bg-\[color:var\(--border-faint\)\]/, "no rail beside a row that has a map");
    const plain = renderToStaticMarkup(<AreaTable rows={buildAreaRows(items, week)} caption="Rules" bothSides />);
    assert.match(plain, /rounded-full bg-\[color:var\(--border-faint\)\]/, "other callers keep the rail");
    assert.doesNotMatch(plain, /On the chart/);
  });

  it("draws each area by month-end, one link per month into the time machine", () => {
    const history = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(Date.UTC(2025, 8 + index + 1, 0));
      return { record_date: date.toISOString().slice(0, 10), tightness: index % 3 === 0 ? 90 : 60, riskAppetite: 56 };
    });
    const months = buildAreaStateHistory(stripRules, history);
    assert.equal(months.length, 12);
    const html = renderToStaticMarkup(<AreaStateHistory months={months} />);
    assert.match(text(html), /scored with today’s formula, against this week’s rules/);
    /* Every piece of a month's column names its month, for the page-wide active month. */
    const latest = months.at(-1)!.recordDate.slice(0, 7);
    assert.equal(html.match(new RegExp(`data-month="${latest}"`, "g"))?.length, 1 + 5 + 2 + 1, "head, five areas, two scores, the link");
    /* The months it prints are dates: the caption's two and each column's head. */
    assert.equal(html.match(new RegExp(`<time[^>]*dateTime="${latest}"`, "gi"))?.length, 2, "the caption's last month and its column head");
    const links = html.match(/<a href="\/operate\?month=\d+&amp;year=\d+#ops-monthly-action-summary"/g) ?? [];
    assert.ok(links.length > 0 && links.length <= 12, `${links.length} month links`);
    assert.equal(html.match(/data-area-state="crossed"/g)?.length, 4 * 4, "four paused months for the four areas on funding pressure");
    assert.match(text(html), /Hiring, Fundraising, Spending and New bets paused; Roadmap clear\. Funding pressure 90, risk appetite 56\./);
  });

  it("draws the same chart beside each area's numbers in the form, with no outline until a number moves", () => {
    const defaults = planLinesFromRules(rules);
    const html = renderToStaticMarkup(<PlanLinesForm defaults={defaults} reading={{ scores: week, changeLines }} />);
    assert.equal(html.match(/data-rule-region-map=/g)?.length, 5);
    /* Its own hatch ids, so the table's charts on the same page keep theirs. */
    assert.match(html, /id="plan-map-hiring-pause-hatch"/);
    assert.doesNotMatch(html, /id="rule-map-/);
    assert.doesNotMatch(html, /data-rule-outline/);
    assert.match(text(html), /Each chart runs risk appetite 0–100 across and funding pressure 0–100 down\. Our rule is shaded/);
    assert.match(html, /<span class="sr-only">Hiring pauses where Funding pressure &gt; 76 or Risk appetite &lt; 44/);
    /* The words, read aloud or on screen, never name the drawing's parts. */
    assert.doesNotMatch(text(html), /\b(outline|overlay|ghost|diff|regions?|mini-map|delta|toggle)\b/i);
    /* Without this week's reading the form is as it was. */
    const bare = renderToStaticMarkup(<PlanLinesForm defaults={defaults} />);
    assert.doesNotMatch(bare, /data-rule-region-map=|data-rule-map-key/);
  });

  it("outlines a reader's moved numbers dashed in the ink, over the published shading", () => {
    const hiring = planLinesFromRules(rules).find((line) => line.area === "hiring")!;
    const own = { ...hiring, resume: [{ ...hiring.resume[0]!, value: 60 }, hiring.resume[1]!] };
    const comparison = compareOwnRule({ published: hiring, own, scores: week });
    const html = renderToStaticMarkup(
      <RuleRegionMap area="hiring" regions={comparison.regions} outline={comparison.outline} scores={week} changeLines={changeLines} label={comparison.description} />,
    );
    const outline = html.match(/<g data-rule-outline="">(.*?)<\/g>/)?.[1] ?? "";
    assert.equal(outline.match(/<line /g)?.length, 2, "the moved restart box's two edges");
    assert.match(outline, /stroke="var\(--app-text\)"/);
    assert.match(outline, /stroke-dasharray="6 4"/);
    assert.doesNotMatch(outline, /--line-crossed|--line-clear/, "a reader's own lines take no line-state colour");
  });
});
