import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ProjectPaybackChart } from "../app/operate/components/projectPaybackChart";
import {
  buildCanonicalBoundedDecisionRules,
  ROADMAP_PAYBACK_BAR_MONTHS,
  TIGHT_RUNWAY_PAYBACK_BAR_MONTHS,
} from "../lib/report/boundedDecisionRules";
import {
  buildEngineeringPaybackLines,
  buildProjectPayback,
  buildProjectPaybacks,
  describePaybackBar,
  paybackChartMonths,
  resolvePaybackBar,
  type ProjectPaybackContext,
  type SizedProjectPayback,
} from "../lib/report/projectPayback";
import { formatRunwayPlanCompactBlock, buildRunwayPlan } from "../lib/report/runwayPlanner";
import { getRegimePublicLabel } from "../lib/regimePresentation";

/*
 * Engineering work against the payback bar, in the runway planner. The bar is
 * never the planner's own: each case below is a rule the brief already prints,
 * and the first describe holds the chart's numbers to those rules' sentences.
 */

const sized = (payback: ReturnType<typeof buildProjectPayback>): SizedProjectPayback => {
  assert.equal(payback.status, "sized", JSON.stringify(payback));
  if (payback.status !== "sized") throw new Error("unreachable");
  return payback;
};

const cloudy = "VOLATILE" as const;

const context = (overrides: Partial<ProjectPaybackContext> = {}): ProjectPaybackContext => ({
  regime: cloudy,
  runwayMonths: 18,
  netMonthlyBurnUsd: 250_000,
  engineerWeekCostUsd: 4_500,
  ...overrides,
});

const importer = { name: "Self-serve importer", weeksToShip: 6, engineers: 2, hoursSavedPerMonth: 160, hourlyCostUsd: 80 };

describe("the payback bar is the published rules' bar", () => {
  it("draws the roadmap bar at the number the Product tempo rule's sentence says", () => {
    const rules = buildCanonicalBoundedDecisionRules({
      regime: cloudy,
      thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
      scores: { tightness: 72, riskAppetite: 45 },
    });
    const tempo = rules.find((rule) => rule.area === "product-tempo");
    assert.match(tempo?.recommendation ?? "", /pays back in more than a year/);
    assert.equal(ROADMAP_PAYBACK_BAR_MONTHS, 12, "the rule says a year; the chart must draw twelve months");
  });

  it("takes the bar from runway first, then conditions", () => {
    assert.deepEqual(resolvePaybackBar(cloudy, "critical"), { kind: "cash-gate" });
    assert.deepEqual(resolvePaybackBar("EXPANSION", "critical"), { kind: "cash-gate" });
    assert.deepEqual(resolvePaybackBar(cloudy, "tight"), { kind: "months", months: TIGHT_RUNWAY_PAYBACK_BAR_MONTHS, basis: "tight-runway" });
    assert.deepEqual(resolvePaybackBar("EXPANSION", "tight"), { kind: "months", months: TIGHT_RUNWAY_PAYBACK_BAR_MONTHS, basis: "tight-runway" });
    for (const regime of ["VOLATILE", "DEFENSIVE", "SCARCITY"] as const) {
      for (const band of ["balanced", "abundant"] as const) {
        assert.deepEqual(resolvePaybackBar(regime, band), { kind: "months", months: ROADMAP_PAYBACK_BAR_MONTHS, basis: "roadmap" });
      }
    }
    assert.deepEqual(resolvePaybackBar("EXPANSION", "balanced"), { kind: "none" });
  });

  it("names the rule that sets the bar", () => {
    assert.equal(
      describePaybackBar(resolvePaybackBar(cloudy, "balanced"), cloudy),
      `In ${getRegimePublicLabel(cloudy)} conditions, the roadmap rule slows anything that pays back in more than a year.`,
    );
    assert.equal(
      describePaybackBar(resolvePaybackBar(cloudy, "tight"), cloudy),
      "With 6–12 months of runway, every new commitment needs a payback inside 6 months.",
    );
    assert.match(describePaybackBar({ kind: "cash-gate" }, cloudy), /hold every new commitment/);
    assert.match(describePaybackBar({ kind: "none" }, "EXPANSION"), /set no payback bar on roadmap work/);
  });
});

describe("a project's payback", () => {
  it("costs engineer time, credits hours at their cost, and dates the break-even", () => {
    const payback = sized(buildProjectPayback(importer, 0, context()));
    assert.equal(payback.buildCostUsd, 54_000);
    assert.equal(payback.monthlySavingUsd, 12_800);
    assert.ok(Math.abs(payback.shipMonth - 6 / (52 / 12)) < 1e-9);
    assert.ok(Math.abs((payback.breakEvenMonth ?? 0) - (payback.shipMonth + 54_000 / 12_800)) < 1e-9);
    assert.equal(payback.verdict, "clears");
    assert.equal(
      payback.sentence,
      "Self-serve importer: 6 weeks with 2 engineers, $54k of engineer time, to save $13k a month. It breaks even in month 6: inside the 12-month bar. Once it ships, it adds 0.9 months of runway.",
    );
  });

  it("says a project past the roadmap bar is slowed until Sunny, and when it lands after the cash", () => {
    const settings = { name: "Settings redesign", weeksToShip: 8, engineers: 2, hoursSavedPerMonth: 20, hourlyCostUsd: 45 };
    const payback = sized(buildProjectPayback(settings, 1, context()));
    assert.equal(payback.verdict, "misses");
    assert.equal(payback.afterCashOut, true);
    assert.match(
      payback.sentence,
      new RegExp(`breaks even in month 82, after your cash runs out: past the 12-month bar, so the roadmap rule slows it until conditions turn ${getRegimePublicLabel("EXPANSION")}\\.`),
    );
  });

  it("holds a tight runway to six months, and names what lifts it", () => {
    const project = { weeksToShip: 4, engineers: 2, hoursSavedPerMonth: 100, hourlyCostUsd: 60 };
    const payback = sized(buildProjectPayback(project, 0, context({ runwayMonths: 10, netMonthlyBurnUsd: 100_000 })));
    assert.equal(payback.verdict, "misses");
    assert.match(payback.sentence, /^Project 1: /, "an unnamed row is named by its place");
    assert.match(payback.sentence, /past the 6-month bar your runway sets, which lifts once runway clears 12 months or a round is signed\./);
  });

  it("says when shipping the work moves runway into a band with a different bar", () => {
    const project = { name: "Vendor cut", weeksToShip: 2, engineers: 1, otherMonthlySavingsUsd: 10_000 };
    const payback = sized(buildProjectPayback(project, 0, context({ runwayMonths: 11.5, netMonthlyBurnUsd: 50_000 })));
    assert.equal(payback.verdict, "clears");
    assert.equal(payback.runwayEffect.kind, "extends");
    assert.match(payback.sentence, /That takes runway to 14\.3 months, where the bar is 12 months\.$/);
  });

  it("holds every project under six months of cash, whatever it pays back", () => {
    const payback = sized(buildProjectPayback(importer, 0, context({ runwayMonths: 4 })));
    assert.equal(payback.verdict, "held");
    assert.match(payback.sentence, /with under six months of cash, the rules hold it with every other new commitment\./);
  });

  it("checks Sunny work against the runway alone", () => {
    const payback = sized(buildProjectPayback(importer, 0, context({ regime: "EXPANSION" })));
    assert.equal(payback.verdict, "no-bar");
    assert.match(payback.sentence, /the rules set no bar on roadmap work in Sunny conditions\./);
  });

  it("says when the saving covers net burn, and adds nothing when the work ships after the cash runs out", () => {
    const covers = sized(buildProjectPayback(importer, 0, context({ netMonthlyBurnUsd: 10_000 })));
    assert.equal(covers.runwayEffect.kind, "covers-burn");
    assert.match(covers.sentence, /Once it ships, the saving covers your net burn\.$/);

    const late = sized(buildProjectPayback({ ...importer, weeksToShip: 40 }, 0, context({ runwayMonths: 6.5 })));
    assert.equal(late.runwayEffect.kind, "ships-after-cash-out");
    assert.match(late.sentence, /after your cash runs out/);
    assert.doesNotMatch(late.sentence, /of runway|covers your net burn/);
  });

  it("gives work that saves nothing no payback, rather than an infinite one", () => {
    const payback = sized(buildProjectPayback({ name: "Keyboard shortcuts", weeksToShip: 3, engineers: 1, otherMonthlySavingsUsd: 0 }, 0, context()));
    assert.equal(payback.breakEvenMonth, null);
    assert.equal(payback.verdict, "no-saving");
    assert.equal(
      payback.sentence,
      "Keyboard shortcuts: 3 weeks with 1 engineer, $14k of engineer time. It saves no cash a month, so it has no payback to check: argue it on revenue or retention instead.",
    );
  });

  it("says what a half-filled row still needs instead of sizing it", () => {
    assert.deepEqual(buildProjectPayback({}, 2, context({ engineerWeekCostUsd: undefined })), {
      status: "incomplete",
      name: "Project 3",
      missing: ["what an engineer-week costs", "weeks to ship", "engineers on it", "what it saves a month"],
    });
    const hoursWithoutRate = buildProjectPayback({ weeksToShip: 2, engineers: 1, hoursSavedPerMonth: 40 }, 0, context());
    assert.deepEqual(hoursWithoutRate.status === "incomplete" ? hoursWithoutRate.missing : null, ["what one of those hours costs"]);
  });
});

describe("what the planner copies and draws", () => {
  it("carries the bar and each sized project, and nothing until one is sized", () => {
    const bar = resolvePaybackBar(cloudy, "balanced");
    assert.equal(buildEngineeringPaybackLines(buildProjectPaybacks([{}], context()), bar, cloudy), null);
    const lines = buildEngineeringPaybackLines(buildProjectPaybacks([importer, {}], context()), bar, cloudy);
    assert.equal(lines?.projects.length, 1);

    const plan = buildRunwayPlan({
      runway: 18,
      burn: 400_000,
      revenue: 150_000,
      growthRate: 3,
      sector: "b2b-saas",
      stage: "series-a",
      regime: cloudy,
      posture: "TRANSITION",
    });
    const block = formatRunwayPlanCompactBlock(plan, null, lines);
    assert.match(block, /\nEngineering work against the payback bar:\n• In .+ conditions, the roadmap rule slows anything that pays back in more than a year\.\n• Self-serve importer: /);
    assert.doesNotMatch(formatRunwayPlanCompactBlock(plan, null, null), /Engineering work/);
  });

  it("runs the chart far enough to show the bar, the cash-out month and every break-even, in six-month steps", () => {
    const bar = resolvePaybackBar(cloudy, "balanced");
    assert.equal(paybackChartMonths([], bar, 7), 12);
    assert.equal(paybackChartMonths(buildProjectPaybacks([importer], context()), bar, 18), 18);
    const long = buildProjectPaybacks([{ name: "Rewrite", weeksToShip: 20, engineers: 4, hoursSavedPerMonth: 10, hourlyCostUsd: 50 }], context());
    assert.equal(paybackChartMonths(long, bar, 18), 36, "capped at three years");
  });

  it("draws each row's break-even filled only when it clears, with the bar and the cash-out line across", () => {
    const bar = resolvePaybackBar(cloudy, "balanced");
    const settings = { name: "Settings redesign", weeksToShip: 8, engineers: 2, hoursSavedPerMonth: 20, hourlyCostUsd: 45 };
    const errors = { name: "Error handling", weeksToShip: 10, engineers: 1, hoursSavedPerMonth: 60, hourlyCostUsd: 45 };
    const paybacks = buildProjectPaybacks([importer, errors, settings, {}], context());
    const html = renderToStaticMarkup(
      <ProjectPaybackChart projects={paybacks} bar={bar} runwayMonths={18} months={paybackChartMonths(paybacks, bar, 18)} />,
    );
    const strips = [...html.matchAll(/data-project-strip="([^"]+)" data-verdict="([a-z-]+)"/g)].map((match) => [match[1], match[2]]);
    assert.deepEqual(strips, [
      ["Self-serve importer", "clears"],
      ["Error handling", "misses"],
      ["Settings redesign", "misses"],
    ], "one strip per sized row; the half-filled one is left to the sentences");
    assert.deepEqual([...html.matchAll(/data-filled="(true|false)"/g)].map((match) => match[1]), ["true", "false"]);
    assert.match(html, /data-break-even-beyond="81\.\d\d"/, "a break-even past the scale is an arrow at its edge");
    assert.match(html, /data-payback-bar="12"/);
    assert.match(html, /data-cash-out="18"/);
    assert.match(html, /12-month bar, the roadmap rule/);
    assert.match(html, /cash runs out, month 18/);
    assert.equal(renderToStaticMarkup(<ProjectPaybackChart projects={[]} bar={bar} runwayMonths={18} months={18} />), "");
  });
});
