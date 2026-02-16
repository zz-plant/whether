import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getNextDirectionalIndex } from "../app/components/directionalFocus";

describe("getNextDirectionalIndex", () => {
  const rects = [
    { top: 0, left: 0, right: 100, bottom: 100 },
    { top: 0, left: 120, right: 220, bottom: 100 },
    { top: 120, left: 0, right: 100, bottom: 220 },
    { top: 120, left: 120, right: 220, bottom: 220 },
  ];

  it("moves right in a two-column row", () => {
    const result = getNextDirectionalIndex({
      currentIndex: 0,
      rects,
      direction: "right",
    });

    assert.equal(result, 1);
  });

  it("moves down to nearest candidate", () => {
    const result = getNextDirectionalIndex({
      currentIndex: 1,
      rects,
      direction: "down",
    });

    assert.equal(result, 3);
  });

  it("wraps when no candidate exists in direction", () => {
    const result = getNextDirectionalIndex({
      currentIndex: 1,
      rects,
      direction: "right",
      wrap: true,
    });

    assert.equal(result, 3);
  });

  it("wraps away from the current item when it shares the extreme edge", () => {
    const result = getNextDirectionalIndex({
      currentIndex: 1,
      rects: [
        { top: 0, left: 0, right: 100, bottom: 100 },
        { top: 0, left: 120, right: 220, bottom: 100 },
        { top: 120, left: 0, right: 100, bottom: 220 },
        { top: 120, left: 120, right: 220, bottom: 220 },
      ],
      direction: "right",
      wrap: true,
    });

    assert.equal(result, 3);
  });

  it("returns -1 when direction has no target and wrap is off", () => {
    const result = getNextDirectionalIndex({
      currentIndex: 0,
      rects,
      direction: "left",
      wrap: false,
    });

    assert.equal(result, -1);
  });
});
