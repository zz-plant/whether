import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AreaGroups } from "../app/components/home/AreaGroups";
import { buildAreaGroups, type HomeAreaLineSlot, type HomeAreaRow } from "../lib/report/home/homeSectionModel";
import { describeScoreMoveBand } from "../lib/report/marketMoveScale";
import { describePastHolds } from "../lib/report/lastTimeCallChanged";
import { buildPlanLinesWatchHref, parsePlanLinesWatch } from "../lib/navigation/planningNavigation";
import type { TimeMachineRegimeEntry } from "../lib/timeMachine/timeMachineCache";

/*
 * Every area's rule, grouped by the condition that changes it (2026-11-03). The week of
 * Oct 6, 2026: funding pressure pinned at 90 held four areas, and the roadmap sat four
 * points above its pause line on risk appetite.
 */
const slot = (overrides: Partial<HomeAreaLineSlot>): HomeAreaLineSlot => ({
  line: "",
  distance: "",
  points: 10,
  met: false,
  metric: "tightness",
  ...overrides,
});

const heldRow = (area: HomeAreaRow["area"]): HomeAreaRow => ({
  area,
  rule: `Rule for ${area}`,
  pause: slot({ met: true, points: 14, value: 76, holdsAbove: true }),
  resume: slot({ points: 24, value: 66, holdsAbove: false }),
  changed: "Pause still applies; no change since Sep 30.",
  changedKind: "held",
});

const ROWS: HomeAreaRow[] = [
  heldRow("hiring"),
  {
    area: "product-tempo",
    rule: "Ship what is committed",
    pause: slot({ points: 4, value: 44, holdsAbove: false, metric: "riskAppetite" }),
    changed: "Restart condition no longer holds: risk appetite fell below 54.",
    changedKind: "resumeLost",
  },
  heldRow("capital-raising"),
  heldRow("burn-discipline"),
  heldRow("expansion-bets"),
];

const SCORES = { tightness: 90, riskAppetite: 48 };

describe("buildAreaGroups", () => {
  const groups = buildAreaGroups(ROWS, SCORES);

  it("says a shared restart condition once, over the four areas it holds", () => {
    assert.equal(groups.length, 2);
    const [held, near] = groups;
    assert.equal(held?.status, "On hold");
    assert.deepEqual(held?.areas.map((entry) => entry.label), ["Hiring", "Fundraising", "Spending", "New bets"]);
    assert.equal(held?.condition, "Restarts when funding pressure falls below 66.");
    assert.equal(near?.status, "Close to pausing");
    assert.equal(near?.condition, "Pauses if risk appetite falls below 44.");
  });

  it("puts today's score and the size of the move beside each condition", () => {
    const [held, near] = groups;
    const band = describeScoreMoveBand("tightness", 24);
    assert.ok(band, "the record sizes a 24-point move");
    assert.equal(held?.distance, `It is 90 today, ${band} away.`);
    assert.match(near?.distance ?? "", /^It is 48 today, .+ away\.$/);
  });

  it("keeps a pause or a lift with the area it moved, and drops what the group already says", () => {
    const [held, near] = groups;
    assert.ok(held?.areas.every((entry) => entry.changed === undefined), "\"Pause still applies\" is the group's heading");
    /* A restart condition lost on an area not on hold lifts nothing: it sat under "Not on
       hold: Roadmap" and read as a contradiction. */
    assert.equal(near?.areas.at(0)?.changed, undefined);
    const [paused] = buildAreaGroups(
      [{ ...heldRow("hiring"), changed: "Pause now applies: funding pressure rose above 76.", changedKind: "paused" }],
      SCORES,
    );
    assert.equal(paused?.areas.at(0)?.changed, "Pause now applies: funding pressure rose above 76.");
  });

  it("says which way the score went since the comparison reading, against the condition", () => {
    const trend = (tightness: number) =>
      buildAreaGroups(ROWS, SCORES, { comparison: { scores: { tightness, riskAppetite: 48 }, since: "since Oct 19" } }).at(0)?.distance ?? "";
    assert.match(trend(90), /, unchanged since Oct 19\.$/);
    assert.match(trend(94), /, 4 points closer since Oct 19\.$/, "falling toward a restart below 66");
    assert.match(trend(89), /, 1 point farther since Oct 19\.$/);
    assert.doesNotMatch(buildAreaGroups(ROWS, SCORES).at(0)?.distance ?? "", /closer|farther|unchanged/, "nothing compared, no direction");
  });

  it("gives a held group its record, and none to a group that is not held", () => {
    const [held, near] = buildAreaGroups(ROWS, SCORES, { record: RECORD });
    assert.equal(held?.history, "It rose above 76 in May 2014. The last time, in Jun 2012, it took 5 months to fall below 66.");
    assert.equal(near?.history, null);
  });

  it("at the line, gives the score without a move to size", () => {
    const [group] = buildAreaGroups(
      [{ area: "hiring", rule: "Hold", pause: slot({ points: 0, value: 76, holdsAbove: true }) }],
      { tightness: 76, riskAppetite: 50 },
    );
    assert.equal(group?.distance, "It is 76 today.");
  });

  it("is empty when no area states a pause", () => {
    assert.deepEqual(buildAreaGroups([{ area: "hiring", rule: "Hold" }], SCORES), []);
  });
});

/* Thirty month-ends from Jan 2012 at funding pressure 50, with a hold from Jun 2012 that
   lifts in Nov 2012, and another that starts in May 2014 and is still running. */
const entry = (index: number, tightness: number): TimeMachineRegimeEntry => {
  const month = (index % 12) + 1;
  const year = 2012 + Math.floor(index / 12);
  return { year, month, recordDate: `${year}-${String(month).padStart(2, "0")}-28`, regime: "SCARCITY", summary: "", tightness, riskAppetite: 50 };
};
const series = (values: (index: number) => number, length = 30) => Array.from({ length }, (_, index) => entry(index, values(index)));
const RECORD = series((index) => (index >= 5 && index < 10 ? 80 : index >= 28 ? 80 : 50));
const LINES = { metric: "tightness" as const, pause: { value: 76, holdsAbove: true }, restart: { value: 66, holdsAbove: false } };

describe("describePastHolds", () => {
  it("counts the one earlier hold and names when this one began", () => {
    assert.equal(
      describePastHolds({ series: RECORD, ...LINES }),
      "It rose above 76 in May 2014. The last time, in Jun 2012, it took 5 months to fall below 66.",
    );
  });

  it("says a first hold is a first", () => {
    assert.equal(
      describePastHolds({ series: series((index) => (index >= 28 ? 80 : 50)), ...LINES }),
      "It rose above 76 in May 2014, for the first time since the record began in 2012.",
    );
  });

  it("leaves out a hold already running in the record's first month, whose start it lacks", () => {
    const text = describePastHolds({ series: series((index) => (index < 4 ? 80 : index >= 28 ? 80 : 50)), ...LINES });
    assert.equal(text, "It rose above 76 in May 2014, for the first time since the record began in 2012.");
  });

  it("gives a range and the middle once there are three", () => {
    const holds = new Set([2, 3, 6, 7, 8, 9, 12, 13, 14, 15, 16, 17, 18]);
    assert.equal(
      describePastHolds({ series: series((index) => (holds.has(index) ? 80 : 50)), ...LINES }),
      "The 3 earlier times, it took 2 to 7 months to fall below 66; half took 4 months or fewer.",
    );
  });

  it("is null for a short record", () => {
    assert.equal(describePastHolds({ series: RECORD.slice(0, 12), ...LINES }), null);
  });
});

describe("a link to the email when a hold lifts", () => {
  it("ticks only the areas it names", () => {
    const href = buildPlanLinesWatchHref(["hiring", "capital-raising"]);
    assert.equal(href, "/operate?watch=hiring,capital-raising#ops-plan-lines");
    assert.deepEqual(parsePlanLinesWatch({ watch: "hiring,capital-raising,payroll,hiring" }), ["hiring", "capital-raising"]);
    assert.deepEqual(parsePlanLinesWatch(undefined), []);
  });
});

describe("AreaGroups", () => {
  const html = renderToStaticMarkup(<AreaGroups groups={buildAreaGroups(ROWS, SCORES)} />);

  it("names a held group with the crossed-line glyph and the word, in the line ink", () => {
    assert.match(html, /<h3 class="[^"]*text-line-crossed-fg[^"]*"><svg[^>]*lucide-pause[\s\S]*?<\/svg><span>On hold: Hiring, Fundraising, Spending and New bets<\/span><\/h3>/);
    assert.doesNotMatch(html, /warning/i);
    assert.doesNotMatch(html, /border-l-\d|border-l-semantic/, "no side stripe");
  });

  it("prints each area's action under its group, with the anchor the distance ladder links to", () => {
    for (const area of ["hiring", "product-tempo", "capital-raising", "burn-discipline", "expansion-bets"]) {
      assert.equal((html.match(new RegExp(`id="area-${area}"`, "g")) ?? []).length, 1, area);
    }
    assert.match(html, /<span class="[^"]*">Roadmap\.<\/span> Ship what is committed\./);
    assert.equal((html.match(/Restarts when funding pressure falls below 66/g) ?? []).length, 1, "the shared condition, once");
  });

  it("offers the restart email on a held group only, live briefs only", () => {
    const live = renderToStaticMarkup(<AreaGroups groups={buildAreaGroups(ROWS, SCORES)} alerts />);
    assert.equal((live.match(/Email me when/g) ?? []).length, 1);
    assert.match(live, /href="\/operate\?watch=hiring,capital-raising,burn-discipline,expansion-bets#ops-plan-lines"[^>]*>Email me when they restart →/);
    assert.doesNotMatch(html, /Email me when/);
  });

  it("makes each name the control that opens its detail, under its own rule", () => {
    const opened = renderToStaticMarkup(
      <AreaGroups groups={buildAreaGroups(ROWS, SCORES)} selected="hiring" onToggle={() => {}} detail={(area) => <p data-detail>{area}</p>} />,
    );
    assert.equal((opened.match(/<button type="button" aria-expanded=/g) ?? []).length, 5);
    assert.match(opened, /aria-expanded="true" aria-controls="area-hiring-detail"[^>]*>Hiring<svg/);
    assert.ok(opened.indexOf("data-detail") > opened.indexOf("Rule for hiring"), "under the rule");
    assert.equal((opened.match(/data-detail/g) ?? []).length, 1, "one area open");
    /* The glyph and the rule answer a tap too: the button's ::after spans the row's
       header, which holds both, and not the detail under it, whose links must work. */
    const row = opened.slice(opened.indexOf('id="area-hiring"'), opened.indexOf('id="area-capital-raising"'));
    const header = row.slice(row.indexOf('<div class="col-span-2 grid grid-cols-subgrid group relative">'), row.indexOf("data-detail"));
    assert.match(header, /^<div class="col-span-2 grid grid-cols-subgrid group relative"><svg[^>]*data-concept-icon="area"/, "the glyph is inside the header");
    assert.match(header, /<button[^>]*class="[^"]*after:absolute after:inset-0[^"]*"/);
    assert.ok(header.indexOf("Rule for hiring") > 0 && header.indexOf("Rule for hiring") < header.lastIndexOf("</div>"), "and so is the rule");
    assert.doesNotMatch(header, /weather-hit/, "a positioned button would pin the ::after to itself");
  });

  it("draws each name as a control, not as a defined term", () => {
    // The dotted underline is the defined-term mark on the card; on the names it read
    // as a definition, and the runway test behind each one went unopened.
    const html = renderToStaticMarkup(<AreaGroups groups={buildAreaGroups(ROWS, SCORES)} onToggle={() => {}} />);
    const buttons = html.match(/<button type="button" aria-expanded=[^>]*>/g) ?? [];
    assert.equal(buttons.length, 5);
    for (const button of buttons) {
      assert.match(button, /\brounded-lg border border-\[color:var\(--border-strong\)\]/, "the control radius and border");
      assert.doesNotMatch(button, /decoration-dotted/);
      // `.weather-button` moves on hover and :active; a transform would make the button
      // the row-wide ::after's containing block mid-press.
      assert.doesNotMatch(button, /weather-button/);
    }
  });

  it("renders nothing with no groups", () => {
    assert.equal(renderToStaticMarkup(<AreaGroups groups={[]} />), "");
  });
});
