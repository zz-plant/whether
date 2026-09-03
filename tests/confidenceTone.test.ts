import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  formatConfidencePlainLabel,
  resolveConfidenceTone,
} from "../lib/report/reportFormatting";

describe("resolveConfidenceTone", () => {
  it("maps each confidence code to its own tone", () => {
    assert.equal(resolveConfidenceTone("HIGH"), "positive");
    assert.equal(resolveConfidenceTone("MED"), "caution");
    assert.equal(resolveConfidenceTone("LOW"), "alert");
  });

  it("never reports the alert tone for a confidence that is not LOW", () => {
    // The regression this pins: /trust compared the *plain label* against "MED"
    // and "HIGH". Neither branch matched, so the trust page painted the alert
    // colour at every confidence level — most visibly at HIGH, where the page
    // is saying the call is safe to act on while showing an alarm dot.
    for (const code of ["HIGH", "MED"] as const) {
      assert.notEqual(
        resolveConfidenceTone(code),
        "alert",
        `${code} confidence must not resolve to the alert tone`,
      );
    }
  });

  it("keeps the plain label distinct from the code, which is why the tone takes the code", () => {
    // If these two ever coincided the original bug would look correct in
    // testing and stay broken in the product.
    for (const code of ["LOW", "MED", "HIGH"] as const) {
      assert.notEqual(formatConfidencePlainLabel(code), code);
    }
  });
});
