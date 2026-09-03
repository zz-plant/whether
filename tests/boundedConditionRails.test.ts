import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import { buildBoundedConditionRails } from "../lib/report/operatingCalls";

const scores = { tightness: 32, riskAppetite: 52 };

describe("buildBoundedConditionRails", () => {
  it("reads both lines out of the copy the surface prints", () => {
    const rails = buildBoundedConditionRails({
      guardrail: "Funding pressure rises above 76 or risk appetite falls below 44",
      clearsWhen: ["Funding pressure < 66", "Risk appetite > 54"],
      scores,
    });

    assert.deepEqual(rails, [
      {
        metric: "tightness",
        label: "Funding pressure",
        current: 32,
        guardrail: 76,
        clearsAt: 66,
        invert: false,
      },
      {
        metric: "riskAppetite",
        label: "Risk appetite",
        current: 52,
        guardrail: 44,
        clearsAt: 54,
        invert: true,
      },
    ]);
  });

  it("inverts the rail whose rule trips downward so both put trouble on the right", () => {
    const rails = buildBoundedConditionRails({
      guardrail: "Funding pressure rises above 76 or risk appetite falls below 44",
      scores,
    });

    assert.deepEqual(
      rails.map((rail) => rail.invert),
      [false, true],
      "a rule that trips high already draws trouble on the right; one that trips low has to be flipped",
    );
  });

  it("draws one rail per signal when a rule names the same signal twice", () => {
    const rails = buildBoundedConditionRails({
      guardrail: "Pause if funding pressure rises above 70 or funding pressure rises above 80.",
      scores,
    });

    assert.equal(rails.length, 1);
    assert.equal(rails[0].guardrail, 70, "the binding line is stated first");
  });

  it("renders no rail rather than one that contradicts the sentence beside it", () => {
    assert.deepEqual(
      buildBoundedConditionRails({ guardrail: "Pause at the bounded threshold.", scores }),
      [],
      "copy with no parseable line earns no graphic",
    );
    assert.deepEqual(
      buildBoundedConditionRails({ guardrail: undefined, scores }),
      [],
    );
    assert.deepEqual(
      buildBoundedConditionRails({
        guardrail: "Funding pressure rises above 76",
        scores: undefined,
      }),
      [],
      "without current scores there is nothing to place on the rail",
    );
  });

  it("keeps a rail whose rule states no clearing line", () => {
    const rails = buildBoundedConditionRails({
      guardrail: "Funding pressure rises above 76",
      clearsWhen: ["Risk appetite > 54"],
      scores,
    });

    assert.equal(rails.length, 1);
    assert.equal(rails[0].clearsAt, undefined, "the clears-when line is for a different signal");
  });
});
