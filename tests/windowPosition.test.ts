import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import { describeWindowPosition } from "../lib/report/windowPosition";

describe("describeWindowPosition", () => {
  const window = [31, 35, 40, 44, 48, 52, 56, 60, 63, 65, 66, 67];
  const label = "since Sep 2024";

  it("places a reading by how many of the window sit below it", () => {
    assert.equal(describeWindowPosition(33, window, label), "Bottom quarter since Sep 2024");
    assert.equal(describeWindowPosition(45, window, label), "Lower half since Sep 2024");
    assert.equal(describeWindowPosition(58, window, label), "Upper half since Sep 2024");
    assert.equal(describeWindowPosition(66, window, label), "Top quarter since Sep 2024");
  });

  it("says so when the reading falls outside the window", () => {
    // A weekly score can sit outside the month-end series it is drawn over;
    // that is the one case where the shape alone would mislead.
    assert.equal(describeWindowPosition(28, window, label), "Below every reading since Sep 2024");
    assert.equal(describeWindowPosition(70, window, label), "Above every reading since Sep 2024");
  });

  it("renders nothing rather than a rank against too few readings", () => {
    assert.equal(describeWindowPosition(33, [31, 40, 67], label), null);
    assert.equal(describeWindowPosition(Number.NaN, window, label), null);
  });
});
