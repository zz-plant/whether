import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { buildOperatingStanceLine } from "../lib/report/homeBrief/decisionNarrative";

/*
 * The card's call is read by founders, finance leads and operators at every
 * stage, and most often by someone who did not read last week's (2026-10-14).
 * Every branch has to be true for them: no change from a bar the reader is
 * assumed to have set, no approval process, and no one business model.
 */
const REGIMES = ["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"] as const;
const WEEKS = [
  { severityDelta: 1, directionLabel: "deteriorating" as const },
  { severityDelta: -1, directionLabel: "improving" as const },
  { severityDelta: 0, directionLabel: undefined },
];

const everyCall = REGIMES.flatMap((currentRegime) => WEEKS.map((week) => buildOperatingStanceLine({ ...week, currentRegime })));

describe("the card's call assumes no prior visit, process or business model", () => {
  it("states a rule rather than a change from last week", () => {
    for (const call of everyCall) assert.doesNotMatch(call, /^(Tighten|Hold|Loosen|Ease|Keep approvals)\b/, call);
  });

  it("assumes no approval process and no software or subscription business", () => {
    for (const call of everyCall) assert.doesNotMatch(call, /approv|retention|renewal|release|rolled back|ship\b|lanes/i, call);
  });

  it("is no longer than the longest call it replaced (101 characters)", () => {
    for (const call of everyCall) assert.ok(call.length <= 101, `${call.length}: ${call}`);
  });

  it("tells a held or late week to keep the reader's current plan, not last week's", () => {
    // "Keep last week's plan" assumed the reader saw last week's (2026-10-14).
    for (const path of ["lib/report/reportCopy.ts", "lib/report/trustStatus.ts", "lib/report/boundedDecisionRules.ts", "lib/playbook.ts", "lib/report/operatingCalls.ts"]) {
      assert.doesNotMatch(readFileSync(path, "utf8"), /last week's plan/i, path);
    }
  });
});
