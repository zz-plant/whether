/**
 * #1778: a plan that names several commitments is read clause by clause.
 *
 * Read as one sentence, "Hire 2 engineers at $15k a month each and sign a $120k annual AWS commit"
 * took the first cadence it found and the largest figure, and graded $120k a month for each
 * engineer, $2.88M. The fixture below is ten realistic plans, each with the commitments it should
 * yield; the regression block holds plans that must not split and must grade as they did before.
 */
import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import { buildShareText } from "../app/operate/components/decisionShieldUtils";
import {
  evaluateDecision,
  extractPlanCommitments,
  stressTestDecisionPlan,
  type DecisionCategory,
  type GradedPlan,
  type PlanStressTestResult,
} from "../lib/decisionShield";
import {
  parsePlanClauses,
  parsePlanCommitment,
  segmentPlanClauses,
  type ClauseDirection,
  type ParsedCommitment,
  type PlanDepartment,
} from "../lib/planCommitment";
import { buildLateCycleAssessmentFixture } from "./fixtures/reportFixtures";

type ExpectedClause = {
  text: string;
  direction: ClauseDirection;
  category: DecisionCategory | null;
  annualUsd: number | null;
  cadence: ParsedCommitment["cadence"];
  headcountDelta: number | null;
  department: PlanDepartment | null;
};

const clause = (
  text: string,
  direction: ClauseDirection,
  category: DecisionCategory | null,
  annualUsd: number | null,
  cadence: ParsedCommitment["cadence"],
  headcountDelta: number | null = null,
  department: PlanDepartment | null = null,
): ExpectedClause => ({ text, direction, category, annualUsd, cadence, headcountDelta, department });

const MULTI_CLAUSE_PLANS: { plan: string; clauses: ExpectedClause[] }[] = [
  {
    // The issue's own example: a pause, a vendor commit, a deferral.
    plan: "Pausing 2 EMEA SDR reqs and allocating $80k to an annual Datadog commit while deferring SOC-2 to Q3",
    clauses: [
      clause("Pausing 2 EMEA SDR reqs", "REDUCE", "HIRING", null, "ONE_OFF", -2, "sales"),
      clause("allocating $80k to an annual Datadog commit", "COMMIT", "PRICING", 80_000, "ANNUAL"),
      clause("deferring SOC-2 to Q3", "REDUCE", null, null, "ONE_OFF", null, "security"),
    ],
  },
  {
    // Monthly pay per head beside an annual cloud commit: each keeps its own cadence.
    plan: "Hire 2 engineers at $15k a month each and sign a $120k annual AWS commit",
    clauses: [
      clause("Hire 2 engineers at $15k a month each", "COMMIT", "HIRING", 360_000, "MONTHLY", 2, "engineering"),
      clause("sign a $120k annual AWS commit", "COMMIT", "INFRASTRUCTURE", 120_000, "ANNUAL"),
    ],
  },
  {
    // A semicolon, and a monthly lease capped at its six-month term.
    plan: "Hire 3 senior backend engineers @ $180k; lease a $6k/mo office in Austin for 6 months",
    clauses: [
      clause("Hire 3 senior backend engineers @ $180k", "COMMIT", "HIRING", 540_000, "ONE_OFF", 3, "engineering"),
      clause("lease a $6k/mo office in Austin for 6 months", "COMMIT", "INFRASTRUCTURE", 36_000, "MONTHLY"),
    ],
  },
  {
    // A salary range reads at its upper end, the conservative figure for a stress test.
    plan: "Add 2 enterprise AEs at $140k-160k each, plus spend $25k a month on GPU instances",
    clauses: [
      clause("Add 2 enterprise AEs at $140k-160k each", "COMMIT", "HIRING", 320_000, "ONE_OFF", 2, "sales"),
      clause("spend $25k a month on GPU instances", "COMMIT", "INFRASTRUCTURE", 300_000, "MONTHLY"),
    ],
  },
  {
    // An M suffix, and ", then".
    plan: "Sign a $1.2M three-year Snowflake vendor contract, then hire 1 data engineer at $190k",
    clauses: [
      clause("Sign a $1.2M three-year Snowflake vendor contract", "COMMIT", "PRICING", 1_200_000, "ONE_OFF"),
      clause("hire 1 data engineer at $190k", "COMMIT", "HIRING", 190_000, "ONE_OFF", 1, "data"),
    ],
  },
  {
    // Every part pauses or cuts.
    plan: "Freeze backfills for the support team, cut $8k/mo of unused SaaS seats and put the $400k rewrite on hold",
    clauses: [
      clause("Freeze backfills for the support team", "REDUCE", null, null, "ONE_OFF", null, "customer success"),
      clause("cut $8k/mo of unused SaaS seats", "REDUCE", "PRICING", 96_000, "MONTHLY"),
      clause("put the $400k rewrite on hold", "REDUCE", "ROADMAP", 400_000, "ONE_OFF"),
    ],
  },
  {
    // Money coming in beside money going out: the raise has no row, the hire does.
    plan: "Raise a $3M seed extension and hire 4 engineers at $160k each",
    clauses: [
      clause("Raise a $3M seed extension", "COMMIT", null, 3_000_000, "ONE_OFF"),
      clause("hire 4 engineers at $160k each", "COMMIT", "HIRING", 640_000, "ONE_OFF", 4, "engineering"),
    ],
  },
  {
    plan: "Expand into the UK with a $500k budget and hire 2 SDRs at $7k per month each",
    clauses: [
      clause("Expand into the UK with a $500k budget", "COMMIT", "GEOGRAPHIC_EXPANSION", 500_000, "ONE_OFF"),
      clause("hire 2 SDRs at $7k per month each", "COMMIT", "HIRING", 168_000, "MONTHLY", 2, "sales"),
    ],
  },
  {
    // A reversible hire for a stated term, and an annual database reservation.
    plan: "Bring on 2 contract-to-hire designers at $9k/mo each for 4 months while migrating to a $30k/yr reserved Postgres database",
    clauses: [
      clause("Bring on 2 contract-to-hire designers at $9k/mo each for 4 months", "COMMIT", "HIRING", 72_000, "MONTHLY", 2, "design"),
      clause("migrating to a $30k/yr reserved Postgres database", "COMMIT", "INFRASTRUCTURE", 30_000, "ANNUAL"),
    ],
  },
  {
    // A range written with an M suffix on the upper end only.
    plan: "Spend $1-1.5M on a v2 rewrite of the billing platform and add 3 engineers at $150k each to staff it",
    clauses: [
      clause("Spend $1-1.5M on a v2 rewrite of the billing platform", "COMMIT", "ROADMAP", 1_500_000, "ONE_OFF"),
      clause("add 3 engineers at $150k each to staff it", "COMMIT", "HIRING", 450_000, "ONE_OFF", 3, "engineering"),
    ],
  },
];

/** The item at `index`, or a failure that names the missing position. */
const at = <T>(list: readonly T[], index: number): T => {
  const item = list[index];
  if (item === undefined) throw new Error(`Expected an item at position ${index} of ${list.length}`);
  return item;
};

const planAt = (index: number) => at(MULTI_CLAUSE_PLANS, index).plan;

describe("extractPlanCommitments — ten multi-clause plans", () => {
  for (const { plan, clauses } of MULTI_CLAUSE_PLANS) {
    it(plan, () => {
      const extracted = extractPlanCommitments(plan).map((reading) => ({
        text: reading.text,
        direction: reading.direction,
        category: reading.category,
        annualUsd: reading.commitment.annualUsd,
        cadence: reading.commitment.cadence,
        headcountDelta: reading.headcountDelta,
        department: reading.department,
      }));
      assert.deepEqual(extracted, clauses);
    });
  }

  it("places each clause on the same row the decision matrix grades, so it can go straight to evaluateDecision", () => {
    const assessment = buildLateCycleAssessmentFixture();
    const vendor = at(extractPlanCommitments(planAt(0)), 1);
    const { category, action } = vendor;
    if (category === null || action === null) throw new Error("Expected the vendor clause to have a decision row");
    assert.equal(action, "DISCOUNT");
    const decision = evaluateDecision(assessment, { lifecycle: "GROWTH", category, action, context: vendor.text });
    assert.equal(decision.verdict, "RISKY");
  });
});

describe("segmentPlanClauses — what does not split", () => {
  it("keeps a list of parts of one commitment whole", () => {
    for (const plan of [
      "Hire 2 sales and marketing leads at $150k each",
      "Spend $80k and 2 people for the same project",
      "allocate $80k and $20k to the same project",
      "Hire 2 engineers and designers for the mobile app",
    ]) {
      assert.deepEqual(segmentPlanClauses(plan), [plan], plan);
    }
  });

  it("keeps an aside about runway or terms attached to the commitment it qualifies", () => {
    for (const plan of [
      "Pay $10k/mo while maintaining a 9-month runway",
      "hire 3 senior engineers, $540k budgeted",
      "Sign a 2-year $240k AWS commit, paid monthly",
      "Hire 3 engineers. Each at $180k.",
      "We want to hire 4 engineers. We have 12 months of runway.",
    ]) {
      assert.deepEqual(segmentPlanClauses(plan), [plan], plan);
    }
  });

  it("splits a bulleted list and drops the markers", () => {
    assert.deepEqual(segmentPlanClauses("- Hire 2 AEs at $140k each\n- Lease a $6k/mo office in Austin\n- Push the rewrite back to Q4"), [
      "Hire 2 AEs at $140k each",
      "Lease a $6k/mo office in Austin",
      "Push the rewrite back to Q4",
    ]);
    assert.equal(at(parsePlanClauses("- Hire 2 AEs\n- Push the rewrite back to Q4"), 1).direction, "REDUCE");
  });

  it("reads a price cut as a commitment, not a pause", () => {
    assert.equal(at(parsePlanClauses("Cut prices 20% with discounts for annual prepay"), 0).direction, "COMMIT");
  });
});

const graded = (result: PlanStressTestResult): GradedPlan => {
  if (result.verdict === null) throw new Error(`Expected a verdict: ${result.headline}`);
  return result;
};

describe("stressTestDecisionPlan — a plan of several commitments", () => {
  const assessment = buildLateCycleAssessmentFixture();
  const cash = { cashBalanceUsd: 4_000_000 };

  it("sizes each commitment with its own cadence, and the plan on their total", () => {
    const plan = graded(stressTestDecisionPlan(assessment, { planText: planAt(1), companyProfile: cash }));
    // One sentence read $120k a month for each engineer: $2.88M, dangerous on size.
    assert.equal(plan.totalAnnualUsd, 480_000);
    assert.equal(plan.verdict, "RISKY");
    assert.equal(plan.commitment.annualUsd, 360_000, "the primary commitment is the largest graded one");
    assert.equal(plan.sizingNote, "$480k across 2 commitments in the first year is 12% of $4M cash on hand, under the 25% line that would move the verdict.");
    assert.deepEqual(plan.commitments.map((reading) => reading.verdict), ["RISKY", "RISKY"]);
  });

  it("escalates on the combined cost when no single commitment would", () => {
    const plan = graded(stressTestDecisionPlan(assessment, { planText: planAt(4), companyProfile: cash }));
    assert.equal(plan.totalAnnualUsd, 1_390_000);
    assert.equal(plan.verdict, "DANGEROUS");
    assert.equal(plan.verdictDriver, "SIZE");
    assert.equal(plan.headline, "This plan is DANGEROUS at this size, not on Cloudy conditions alone.");
    assert.equal(at(plan.commitments, 1).verdict, "RISKY", "the hire alone stays where conditions put it");
  });

  it("grades the commitment and lists the pause and the deferral without counting them", () => {
    const plan = graded(stressTestDecisionPlan(assessment, { planText: planAt(0), companyProfile: cash }));
    assert.equal(plan.detectedCategory, "PRICING");
    assert.equal(plan.totalAnnualUsd, 80_000);
    assert.deepEqual(plan.commitments.map((reading) => reading.verdict), [null, "RISKY", null]);
    assert.match(at(plan.commitments, 0).headline, /pauses, defers or cuts/);
  });

  it("grades a hire beside a raise instead of declining the whole plan, and counts none of the raise", () => {
    const plan = graded(stressTestDecisionPlan(assessment, { planText: planAt(6), companyProfile: cash }));
    assert.equal(plan.detectedCategory, "HIRING");
    assert.equal(plan.totalAnnualUsd, 640_000);
    assert.match(at(plan.commitments, 0).headline, /brings money in/);
  });

  it("takes the harshest commitment's verdict, so a reversible hire does not soften the commitment beside it", () => {
    const plan = graded(stressTestDecisionPlan(assessment, { planText: planAt(8) }));
    assert.deepEqual(plan.commitments.map((reading) => reading.verdict), ["SAFE", "RISKY"]);
    assert.equal(plan.verdict, "RISKY");
    assert.equal(plan.detectedCategory, "INFRASTRUCTURE");
  });

  it("declines a plan that only pauses, defers or cuts, and still lists every part", () => {
    const plan = stressTestDecisionPlan(assessment, { planText: planAt(5), companyProfile: cash });
    assert.equal(plan.verdict, null);
    assert.match(plan.headline, /every part of this plan pauses, defers or cuts/);
    assert.equal(plan.commitments.length, 3);
  });

  it("applies the caller's category only to a clause the wording names no row for", () => {
    const plan = graded(
      stressTestDecisionPlan(assessment, { planText: "Hire 2 engineers and allocate $40k to tooling", category: "INFRASTRUCTURE" }),
    );
    assert.deepEqual(plan.commitments.map((reading) => reading.category), ["HIRING", "INFRASTRUCTURE"]);
  });

  it("puts every commitment in the share text", () => {
    const planText = planAt(0);
    const result = stressTestDecisionPlan(assessment, { planText, companyProfile: cash });
    const text = buildShareText(assessment, "GROWTH", "HIRING", "HIRE", evaluateDecision(assessment, { lifecycle: "GROWTH", category: "HIRING", action: "HIRE" }), {
      planMode: "natural_language",
      planText,
      stressTestResult: result,
    });
    assert.match(text, /Commitments in this plan:\n- Pausing 2 EMEA SDR reqs: paused or cut, not graded\n- allocating \$80k to an annual Datadog commit: RISKY \(\$80k a year\)\n- deferring SOC-2 to Q3: paused or cut, not graded/);
  });
});

/*
 * Plans that name one commitment parse and grade exactly as they did before clauses existed. The
 * expected values were read from the single-sentence parser on main before this change.
 */
describe("single-clause regression — unchanged", () => {
  const assessment = buildLateCycleAssessmentFixture();
  const cases: { plan: string; commitment: ParsedCommitment; verdict: GradedPlan["verdict"]; category: DecisionCategory; headline: string }[] = [
    {
      plan: "Hiring 3 senior engineers @ $180k",
      commitment: { headcount: 3, unitAmountUsd: 180_000, cadence: "ONE_OFF", annualUsd: 540_000, basis: "3 × $180k each → $540k in the first year" },
      verdict: "RISKY",
      category: "HIRING",
      headline: "Hire is considered RISKY in Cloudy conditions.",
    },
    {
      plan: "Hire 2 sales and marketing leads at $150k each",
      commitment: { headcount: 2, unitAmountUsd: 150_000, cadence: "ONE_OFF", annualUsd: 300_000, basis: "2 × $150k each → $300k in the first year" },
      verdict: "RISKY",
      category: "HIRING",
      headline: "Hire is considered RISKY in Cloudy conditions.",
    },
    {
      plan: "Spend $80k and 2 people for the same project",
      commitment: { headcount: 2, unitAmountUsd: 80_000, cadence: "ONE_OFF", annualUsd: 80_000, basis: "$80k, read as a first-year cost" },
      verdict: "RISKY",
      category: "HIRING",
      headline: "Hire is considered RISKY in Cloudy conditions.",
    },
    {
      plan: "Hire 3 engineers. Each at $180k.",
      commitment: { headcount: 3, unitAmountUsd: 180_000, cadence: "ONE_OFF", annualUsd: 540_000, basis: "3 × $180k each → $540k in the first year" },
      verdict: "RISKY",
      category: "HIRING",
      headline: "Hire is considered RISKY in Cloudy conditions.",
    },
    {
      plan: "We want to hire 4 engineers. We have 12 months of runway.",
      commitment: { headcount: 4, unitAmountUsd: null, cadence: "ONE_OFF", annualUsd: null, basis: null },
      verdict: "RISKY",
      category: "HIRING",
      headline: "Hire is considered RISKY in Cloudy conditions.",
    },
    {
      plan: "hire 3 senior engineers, $540k budgeted",
      commitment: { headcount: 3, unitAmountUsd: 540_000, cadence: "ONE_OFF", annualUsd: 540_000, basis: "$540k, read as a first-year cost" },
      verdict: "RISKY",
      category: "HIRING",
      headline: "Hire is considered RISKY in Cloudy conditions.",
    },
    {
      plan: "Lease a 5,000 sq ft office at $25k/mo for 3 years",
      commitment: { headcount: null, unitAmountUsd: 25_000, cadence: "MONTHLY", annualUsd: 300_000, basis: "$25k a month → $300k in the first year" },
      verdict: "RISKY",
      category: "INFRASTRUCTURE",
      headline: "Infra spend is considered RISKY in Cloudy conditions.",
    },
    {
      plan: "Hire a contractor for 3 months at $15k/mo",
      commitment: { headcount: null, unitAmountUsd: 15_000, cadence: "MONTHLY", annualUsd: 45_000, basis: "$15k a month for 3 months → $45k in the first year" },
      verdict: "RISKY",
      category: "HIRING",
      headline: "Hire is considered RISKY in Cloudy conditions.",
    },
    {
      plan: "Cut prices 20% with discounts for annual prepay",
      commitment: { headcount: null, unitAmountUsd: null, cadence: "ANNUAL", annualUsd: null, basis: null },
      verdict: "RISKY",
      category: "PRICING",
      headline: "Discount is considered RISKY in Cloudy conditions.",
    },
  ];

  for (const expected of cases) {
    it(expected.plan, () => {
      assert.deepEqual(segmentPlanClauses(expected.plan), [expected.plan]);
      assert.deepEqual(parsePlanCommitment(expected.plan), expected.commitment);
      const plan = graded(stressTestDecisionPlan(assessment, { planText: expected.plan, companyProfile: { cashBalanceUsd: 4_000_000 } }));
      assert.deepEqual(plan.commitment, expected.commitment);
      assert.equal(plan.totalAnnualUsd, expected.commitment.annualUsd);
      assert.equal(plan.verdict, expected.verdict);
      assert.equal(plan.detectedCategory, expected.category);
      assert.equal(plan.headline, expected.headline);
      assert.equal(plan.commitments.length, 1);
      assert.equal(at(plan.commitments, 0).text, expected.plan);
      assert.equal(at(plan.commitments, 0).verdict, plan.verdict);
    });
  }

  it("keeps an ungraded one-clause plan ungraded, with one entry", () => {
    const plan = stressTestDecisionPlan(assessment, { planText: "Pay $10k/mo while maintaining a 9-month runway" });
    assert.equal(plan.verdict, null);
    assert.equal(plan.commitments.length, 1);
    assert.equal(at(plan.commitments, 0).commitment.annualUsd, 120_000);
  });
});
