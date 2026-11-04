import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildOperatorStageCookie,
  lifecycleStageForOperatorStage,
  OPERATOR_STAGE_COOKIE,
  OPERATOR_STAGE_OPTIONS,
  operatorStageForLifecycleChoice,
  operatorStageForVariantMode,
  plannerStageForOperatorStage,
  readOperatorStageCookie,
} from "../lib/report/operatorStage";
import { parseOperatorContextFromCookies } from "../lib/report/operatorContext";
import { STAGE_PERSONA_OPTIONS } from "../app/components/StagePersonaSelector";

describe("operator stage: one vocabulary for every stage control", () => {
  it("the hero selector offers exactly the shared options", () => {
    assert.deepEqual(
      STAGE_PERSONA_OPTIONS.map((option) => option.key),
      OPERATOR_STAGE_OPTIONS.map((option) => option.key),
    );
    assert.deepEqual(
      OPERATOR_STAGE_OPTIONS.map((option) => option.key),
      ["seed", "series-a", "series-b", "bootstrapped"],
    );
  });

  it("reads the cookie the settings panel and the hero both write", () => {
    const cookie = buildOperatorStageCookie("series-b");
    assert.match(cookie, new RegExp(`^${OPERATOR_STAGE_COOKIE}=series-b; path=/; max-age=\\d+; SameSite=Lax$`));
    assert.equal(readOperatorStageCookie(`other=1; ${OPERATOR_STAGE_COOKIE}=series-b; theme=dark`), "series-b");
    assert.equal(parseOperatorContextFromCookies(`${OPERATOR_STAGE_COOKIE}=bootstrapped`).companyStage, "bootstrapped");
  });

  it("treats the values older builds wrote as unset rather than guessing", () => {
    // pre-seed / series-b-plus / public came from the old five-value settings
    // list; growth came from the deleted config route. None is a stage now.
    for (const legacy of ["pre-seed", "series-b-plus", "public", "growth", "", "SEED"]) {
      assert.equal(readOperatorStageCookie(`${OPERATOR_STAGE_COOKIE}=${legacy}`), null, legacy);
    }
    assert.equal(readOperatorStageCookie(null), null);
    assert.equal(readOperatorStageCookie("theme=dark"), null);
  });

  it("clears with a zero max-age", () => {
    assert.match(buildOperatorStageCookie(null), /max-age=0/);
  });

  it("folds legacy variant modes into Series B+ and defaults the rest", () => {
    assert.equal(operatorStageForVariantMode("growth"), "series-b");
    assert.equal(operatorStageForVariantMode("public"), "series-b");
    assert.equal(operatorStageForVariantMode("seed"), "seed");
    assert.equal(operatorStageForVariantMode(undefined), "series-a");
  });

  it("maps the funded stages into both engine stage types and back", () => {
    for (const stage of ["seed", "series-a", "series-b"] as const) {
      assert.equal(operatorStageForLifecycleChoice(lifecycleStageForOperatorStage(stage), null), stage);
      assert.ok(plannerStageForOperatorStage(stage));
    }
    assert.equal(plannerStageForOperatorStage("series-b"), "growth");
  });

  /* Bootstrapped says how a company is funded, not how far along it is. It read as
     MATURE, so a founder alone with no revenue was graded as a mature company. */
  it("does not read bootstrapped as a stage of maturity", () => {
    assert.equal(lifecycleStageForOperatorStage("bootstrapped"), "GROWTH");
    assert.equal(lifecycleStageForOperatorStage("bootstrapped", 40_000), "GROWTH");
    assert.equal(lifecycleStageForOperatorStage("bootstrapped", 0), "DISCOVERY");
    assert.equal(plannerStageForOperatorStage("bootstrapped"), "growth");
    assert.equal(plannerStageForOperatorStage("bootstrapped", 0), "seed");
    // Revenue of zero says nothing about a funded company's stage.
    assert.equal(lifecycleStageForOperatorStage("series-b", 0), "SCALE");
  });

  it("keeps a company's funding when a lifecycle is chosen", () => {
    for (const lifecycle of ["DISCOVERY", "GROWTH", "SCALE", "MATURE"] as const) {
      assert.equal(operatorStageForLifecycleChoice(lifecycle, "bootstrapped"), "bootstrapped");
    }
    // Mature wrote "bootstrapped" over a funded company's stage.
    assert.equal(operatorStageForLifecycleChoice("MATURE", "series-a"), "series-b");
    assert.equal(operatorStageForLifecycleChoice("MATURE", null), "series-b");
  });
});
