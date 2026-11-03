import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { stressTestDecisionPlan, type DecisionCategory, type LifecycleStage } from "../lib/decisionShield";
import { macroSeries } from "../lib/macroSnapshot";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import {
  buildCanonicalBoundedDecisionRules,
  buildScopedVariantDecisionAdjustment,
  decisionAreaCorporateTransmission,
  startupVariantModes,
} from "../lib/report/boundedDecisionRules";
import type { RunwayBand } from "../lib/report/operatorRunway";
import { snapshotData } from "../lib/snapshot";
import type { RegimeKey } from "../lib/types";

/*
 * The guidance is agnostic to company size (2026-11-03). It is read by a founder
 * working alone and by a company with a board, a finance lead and managers, and it
 * cannot tell which. So the guidance names the decision, never the org chart: no
 * second signer, no approval chain, no team to protect. A role that exists gets its
 * own opt-in tool (the board slide, the investor update, the portfolio note), and
 * those can name it.
 *
 * Until this test, under six months of runway every stage led with "put a second
 * signoff on every discretionary commitment", which a founder without a cofounder
 * cannot do, and the stress test answered a one-person hire with "cap permanent
 * hiring to 50% of the planned reqs".
 *
 * Every sentence here is rendered, not read from source: the stage rules at every
 * runway band, the area rules in every set of conditions, the stress test's
 * alternatives for every category and stage, and every pinned brief format.
 */
const PRESUMES_A_ROLE = /\b(sign-?offs?|second signer|approvals|structured review|teams?|reqs|managers?|direct reports|staff|the people)\b/i;

/** Every string leaf of a value, so object keys never count as copy. */
const sentences = (value: unknown): string[] => {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(sentences);
  if (value && typeof value === "object") return Object.values(value).flatMap(sentences);
  return [];
};

const assertAgnostic = (where: string, value: unknown) => {
  for (const sentence of sentences(value)) {
    assert.doesNotMatch(sentence, PRESUMES_A_ROLE, `${where}: "${sentence}"`);
  }
};

const assessment = buildOperatingSnapshot({ treasury: snapshotData, macroSeries }).assessment;
const REGIMES: RegimeKey[] = ["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"];
const BANDS: Array<RunwayBand | undefined> = [undefined, "critical", "tight", "balanced", "abundant"];

describe("guidance that holds at any company size", () => {
  it("names no role in the stage rules, at any runway band", () => {
    for (const { mode } of startupVariantModes) {
      for (const runwayBand of BANDS) {
        assertAgnostic(
          `${mode} at ${runwayBand ?? "no"} band`,
          buildScopedVariantDecisionAdjustment({ mode, thresholds: assessment.thresholds, scores: assessment.scores, runwayBand }),
        );
      }
    }
  });

  it("names no role in the area rules or the reasons beside them, in any conditions", () => {
    assertAgnostic("area reasons", decisionAreaCorporateTransmission);
    for (const regime of REGIMES) {
      assertAgnostic(regime, buildCanonicalBoundedDecisionRules({ regime, thresholds: assessment.thresholds, scores: assessment.scores }));
    }
  });

  it("names no role in the stress test's verdicts or its reversible alternatives", () => {
    const categories: DecisionCategory[] = ["HIRING", "ROADMAP", "PRICING", "INFRASTRUCTURE", "M_AND_A", "GEOGRAPHIC_EXPANSION", "RESTRUCTURING"];
    const stages: LifecycleStage[] = ["DISCOVERY", "GROWTH", "SCALE", "MATURE"];
    for (const category of categories) {
      for (const lifecycle of stages) {
        const result = stressTestDecisionPlan(assessment, { planText: "Hire 1 contractor at $90k", category, lifecycle });
        assertAgnostic(`${category} at ${lifecycle}`, result);
      }
    }
  });

  it("names no role in any pinned brief format", () => {
    assertAgnostic("pinned formats", JSON.parse(readFileSync(new URL("./fixtures/briefFormats.golden.json", import.meta.url), "utf8")));
  });
});
