import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { describeInputMovement } from "../lib/report/inputMovement";

describe("describeInputMovement", () => {
  it("calls inputs steady only when neither moved a notable amount", () => {
    assert.equal(describeInputMovement(0, 0), "steady inputs");
    assert.equal(describeInputMovement(2.9, -2.9), "steady inputs");
  });

  it("reads a rising funding pressure and a falling risk appetite as tightening", () => {
    // The 2026-09-15 read: +14 / -14 under a hero line that said "steady inputs".
    assert.equal(describeInputMovement(14, -14), "tightening inputs");
    assert.equal(describeInputMovement(5, 0), "tightening inputs");
    assert.equal(describeInputMovement(0, -4), "tightening inputs");
  });

  it("reads the opposite moves as easing", () => {
    assert.equal(describeInputMovement(-6, 3), "easing inputs");
    assert.equal(describeInputMovement(-3, 0), "easing inputs");
    assert.equal(describeInputMovement(1, 8), "easing inputs");
  });

  it("calls a disagreement between the two inputs mixed", () => {
    assert.equal(describeInputMovement(6, 6), "mixed inputs");
    assert.equal(describeInputMovement(-5, -5), "mixed inputs");
  });
});
