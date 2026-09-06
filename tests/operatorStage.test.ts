import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildOperatorStageCookie,
  lifecycleStageForOperatorStage,
  OPERATOR_STAGE_COOKIE,
  OPERATOR_STAGE_OPTIONS,
  operatorStageForLifecycleStage,
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

  it("maps into both engine stage types and back without loss", () => {
    for (const option of OPERATOR_STAGE_OPTIONS) {
      const lifecycle = lifecycleStageForOperatorStage[option.key];
      assert.equal(operatorStageForLifecycleStage[lifecycle], option.key);
      assert.ok(plannerStageForOperatorStage[option.key]);
    }
    assert.equal(lifecycleStageForOperatorStage.bootstrapped, "MATURE");
    assert.equal(plannerStageForOperatorStage["series-b"], "growth");
  });
});
