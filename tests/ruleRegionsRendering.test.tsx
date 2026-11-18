import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as nextNavigation from "next/navigation";

import { WhatWouldChangeSection } from "../app/components/home/WhatWouldChangeSection";
import { WhyConditionsSection } from "../app/components/home/WhyConditionsSection";
import { AreaTable } from "../app/components/ui/areaTable";
import { RuleRegionMap } from "../app/components/ui/ruleRegionMap";
import { AreaStateHistory } from "../app/operate/components/areaStateHistory";
import { buildAreaRows } from "../app/operate/areaRows";
import { buildCanonicalBoundedDecisionRules } from "../lib/report/boundedDecisionRules";
import { buildActionStripItems } from "../lib/report/operatingCalls";
import {
  buildAreaStateHistory,
  buildRuleChartModel,
  buildRuleRegions,
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
const model = buildRuleChartModel({ rules, scores: week, leadArea: "hiring", notCounted: [{ metric: "riskAppetite", score: 33 }], changeLines });
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const section = (ruleChart?: Parameters<typeof WhatWouldChangeSection>[0]["ruleChart"]) =>
  renderToStaticMarkup(
    <WhatWouldChangeSection
      ladders={[
        { metric: "tightness", label: "Funding pressure", value: 90, previous: 90, lines: [{ kind: "callChange", value: 70 }] },
        { metric: "riskAppetite", label: "Risk appetite", value: 44, previous: 55, lines: [{ kind: "callChange", value: 50 }] },
      ]}
      flipProximity={[]}
      guardrail="Funding pressure is above 76. Funding pressure is 90 now."
      leadResume="Funding pressure falls below 66 and risk appetite is above 54"
      leadHeld
      reversalTrigger="Funding pressure falls 20 pts from 90 to 70 or below, or risk appetite rises 6 pts from 44 to clear 50."
      callChangeLines={changeLines}
      regime="SCARCITY"
      ruleChart={ruleChart}
    />,
  );

describe("the conditions chart's rule layer on the brief", () => {
  it("opens on the lead rule: its regions shaded, its key, and the sentence beside it unchanged", () => {
    const html = section({ ...model, initialCounted: false, query: { cadence: "weekly" } });
    assert.match(html, /data-rule-chooser/);
    /* Links to each state, keeping the page's query: no form field on a page whose budget counts them. */
    assert.equal(html.match(/data-rule-area=/g)?.length, 5, "the five areas");
    assert.doesNotMatch(html, /<input/);
    assert.match(html, /<a href="\/\?cadence=weekly#what-would-change"[^>]*aria-current="page"[^>]*data-rule-area="hiring"/, "the lead area, with no key of its own");
    assert.match(html, /<a href="\/\?cadence=weekly&amp;rule=capital-raising#what-would-change"[^>]*data-rule-area="capital-raising"/);
    assert.match(html, /<a href="\/\?cadence=weekly&amp;counted=1#what-would-change"[^>]*>Count startup-market inputs</);
    assert.match(html, /data-rule-region="pause"/);
    assert.match(html, /data-rule-region="resume"/);
    assert.match(text(html), /Hiring pauses restarts between them, nothing changes/);
    assert.match(html, />Restart when</, "the guidance's own label, as before");
    assert.match(text(html), /Restart when Funding pressure falls below 66 and risk appetite is above 54/);
    assert.match(html, /This week&#x27;s reading is in the pause region\./, "the claim is in the figure's text alternative");
    /* The switch is offered, off, and the published reading is the dot. */
    assert.match(html, /Count startup-market inputs/);
    assert.match(html, /data-counted-difference="" aria-live="polite"><\/p>/, "its line is empty until it is on");
    assert.doesNotMatch(html, /Counted: /);
  });

  it("shades a chosen area, prints its own side under its name, and its undrawn condition", () => {
    const html = section({ ...model, initialArea: "product-tempo", initialCounted: false });
    assert.match(html, /aria-current="page"[^>]*data-rule-area="product-tempo"/);
    /* Roadmap is not paused at risk appetite 44 (not below 44), so its pause side is the one that can change it. */
    assert.match(text(html), /Roadmap pauses if Risk appetite falls below 44 or two weekly readings in a row come in weaker/);
    assert.doesNotMatch(html, />Restart when</);
    assert.match(html, /data-rule-note/);
    assert.match(text(html), /Not drawn: Roadmap also pauses if two weekly readings in a row come in weaker/);
  });

  it("counted, plots the left-out reading as the dot and names what it would move", () => {
    const html = section({ ...model, initialCounted: true });
    assert.match(html, /aria-current="page"[^>]*>Count startup-market inputs</, "the switch is on");
    assert.match(html, /<a href="\/#what-would-change"[^>]*>As published</, "and its other side is a link back");
    assert.match(text(html), /Counted: Funding pressure 90 · Risk appetite 33/);
    assert.match(text(html), /With startup-market inputs counted, Roadmap would pause\./);
    /* The published reading stays on the chart, hollow and named. */
    assert.match(text(html), /Published reading 90 44/);
    /* The published guidance does not change. */
    assert.match(text(html), /Restart when Funding pressure falls below 66 and risk appetite is above 54/);
  });

  it("leaves the chart as it was for a caller without the layer", () => {
    const html = section();
    assert.doesNotMatch(html, /data-rule-chooser|data-rule-region|Count startup-market inputs/);
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
        chartHref="/?counted=1#what-would-change"
      />,
    );
    assert.match(html, /<a href="\/\?counted=1#what-would-change"[^>]*data-counted-chart-link/);
    assert.match(text(html), /See it on the conditions chart/);
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
    assert.match(text(html), /scored with today’s formula, against this week’s lines/);
    const links = html.match(/<a href="\/operate\?month=\d+&amp;year=\d+#ops-monthly-action-summary"/g) ?? [];
    assert.ok(links.length > 0 && links.length <= 12, `${links.length} month links`);
    assert.equal(html.match(/data-area-state="crossed"/g)?.length, 4 * 4, "four paused months for the four areas on funding pressure");
    assert.match(text(html), /Hiring, Fundraising, Spending and New bets paused; Roadmap clear\. Funding pressure 90, risk appetite 56\./);
  });
});
