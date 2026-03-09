import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCompanyAdjustedRules } from "../lib/report/companyProfile";
import type { BoundedDecisionRule } from "../lib/report/boundedDecisionRules";
import type { RegimeAssessment } from "../lib/regimeEngine";

const assessment = {
  regime: "DEFENSIVE",
  policyAssessment: { posture: "TRANSITION" },
} as RegimeAssessment;

const postureRules: BoundedDecisionRule[] = [
  {
    area: "capital-raising",
    recommendation: "Base capital rule.",
    doNow: ["Base capital do-now."],
    avoidNow: ["Base capital avoid-now."],
    scope: "",
    pauseTrigger: "Pause base capital.",
    resumeTrigger: "Resume base capital.",
    rationale: "",
  },
  {
    area: "burn-discipline",
    recommendation: "Base burn rule.",
    doNow: ["Base burn do-now."],
    avoidNow: ["Base burn avoid-now."],
    scope: "",
    pauseTrigger: "Pause base burn.",
    resumeTrigger: "Resume base burn.",
    rationale: "",
  },
  {
    area: "hiring",
    recommendation: "Base hiring rule.",
    doNow: ["Base hiring do-now."],
    avoidNow: ["Base hiring avoid-now."],
    scope: "",
    pauseTrigger: "Pause base hiring.",
    resumeTrigger: "Resume base hiring.",
    rationale: "",
  },
];

describe("company-profile adjusted rules", () => {
  it("differentiates same posture recommendations by company stage", () => {
    const seedRules = buildCompanyAdjustedRules({
      assessment,
      postureRules,
      profile: { stage: "seed", runwayBand: "under-12m" },
    });
    const seriesBRules = buildCompanyAdjustedRules({
      assessment,
      postureRules,
      profile: { stage: "series-b", runwayBand: "12-18m" },
    });
    const lateStageRules = buildCompanyAdjustedRules({
      assessment,
      postureRules,
      profile: { stage: "late-stage", runwayBand: "18m-plus" },
    });

    const seedHiring = seedRules.find((rule) => rule.area === "hiring");
    const seriesBHiring = seriesBRules.find((rule) => rule.area === "hiring");
    const lateBurn = lateStageRules.find((rule) => rule.area === "burn-discipline");

    assert.ok(seedHiring?.pauseTrigger.includes("team growth exceeds 20 people"));
    assert.ok(seedHiring?.resumeTrigger.includes("Reverse when two consecutive weeks of on-time delivery"));
    assert.ok(!seriesBHiring?.pauseTrigger.includes("team growth exceeds 20 people"));
    assert.ok(lateBurn?.pauseTrigger.includes("quarterly margin trajectory weakens"));
    assert.ok(lateBurn?.resumeTrigger.includes("Reverse when margin trajectory stabilizes"));
  });

  it("falls back to defaults when profile fields are explicitly undefined", () => {
    const rules = buildCompanyAdjustedRules({
      assessment,
      postureRules,
      profile: { stage: undefined, sector: undefined, runwayBand: undefined },
    });

    const capitalRule = rules.find((rule) => rule.area === "capital-raising");

    assert.ok(capitalRule);
    assert.ok(capitalRule?.recommendation.includes("Runway constraint:"));
  });

});
