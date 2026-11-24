import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { placePopover } from "../lib/navigation/popoverPlacement";

/*
 * The phone's nav popovers ran off the screen when CSS anchor positioning found no area
 * that fit (2026-11-24): the section jumper reached x=476 on a 390px phone, and WebKit put
 * the History tab's page list at 158–430. These hold the clamp with the rectangles measured
 * on that day.
 */

const phone = { width: 390, height: 812 };
const rect = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
});

describe("placePopover", () => {
  it("keeps the masthead section list inside a phone screen", () => {
    const trigger = rect(188, 2, 82, 44);
    const { top, left } = placePopover(trigger, { width: 288, height: 312 }, phone, { side: "below" });
    assert.equal(top, 52);
    assert.equal(left, 390 - 288 - 8);
  });

  it("opens the History tab's pages above the bar, centred on the tab and inside the screen", () => {
    const tab = rect(156, 760, 78, 52);
    const { top, left } = placePopover(tab, { width: 272, height: 150 }, phone, { side: "above", align: "center" });
    assert.equal(top, 760 - 6 - 150);
    assert.equal(left, Math.round(195 - 136));
  });

  it("holds the margin at the first and last tab", () => {
    const first = placePopover(rect(8, 760, 74, 52), { width: 272, height: 150 }, phone, {
      side: "above",
      align: "center",
    });
    assert.equal(first.left, 8);
    const last = placePopover(rect(308, 760, 74, 52), { width: 272, height: 150 }, phone, {
      side: "above",
      align: "center",
    });
    assert.equal(last.left, 390 - 272 - 8);
  });

  it("flips to the side that fits, and pins to the margin when neither does", () => {
    const nearFoot = rect(200, 700, 40, 40);
    assert.equal(placePopover(nearFoot, { width: 200, height: 200 }, phone, { side: "below" }).top, 700 - 6 - 200);
    const nearHead = rect(200, 10, 40, 40);
    assert.equal(placePopover(nearHead, { width: 200, height: 200 }, phone, { side: "above" }).top, 56);
    const tall = placePopover(rect(200, 400, 40, 40), { width: 200, height: 900 }, phone, { side: "below" });
    assert.equal(tall.top, 8);
  });

  it("starts at the trigger when there is room", () => {
    const { left } = placePopover(rect(215, 2, 160, 44), { width: 232, height: 138 }, { width: 1280, height: 900 }, {
      side: "below",
    });
    assert.equal(left, 215);
  });
});
