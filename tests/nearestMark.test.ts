import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  boxAround,
  clearOfFinger,
  holdsPoint,
  nearestMark,
  openMarkLabel,
  placeMarkWords,
  type MarkBox,
} from "../lib/ui/nearestMark";

/*
 * A tap on a drawing whose marks are narrower than a finger (2026-11-25, ui-ux-standards
 * §II): on touch the whole drawing is the target, the tap chooses the nearest mark, and
 * its words sit on screen clear of the finger with a link that opens it. The islands
 * (`app/components/ui/markReadout.tsx`, `app/components/history/historyReadout.tsx`)
 * read the DOM and hand these functions viewport boxes; this suite has no DOM, so the
 * geometry is held here.
 */

const box = (left: number, top: number, width: number, height: number): MarkBox => ({ left, top, right: left + width, bottom: top + height });

/* A row of bars as the one-month-move drawing lays them out on a phone: 9px columns, 1px apart, 44px tall. */
const bars = Array.from({ length: 6 }, (_unused, index) => box(100 + index * 10, 200, 9, 44));

/* A year × month grid as /history draws it on a phone: 26px cells, 44px rows, the newest year on top. */
const grid = Array.from({ length: 3 * 12 }, (_unused, index) => box(60 + (index % 12) * 26, 300 + Math.floor(index / 12) * 44, 26, 44));

describe("the mark a tap means", () => {
  it("is none when the drawing draws no mark", () => {
    assert.equal(nearestMark({ x: 10, y: 10 }, []), null);
    assert.equal(nearestMark({ x: 10, y: 10 }, [box(0, 0, 0, 0)]), null, "a mark not drawn at this width is not a mark");
  });

  it("is the mark under the finger", () => {
    assert.equal(nearestMark({ x: 134, y: 220 }, bars), 3);
    assert.equal(nearestMark({ x: 60 + 4 * 26 + 13, y: 300 + 44 + 20 }, grid), 16, "May of the second year");
  });

  it("on one row, is read by x alone, so a tap above or below the bars picks the bar under it", () => {
    assert.equal(nearestMark({ x: 125, y: 150 }, bars), 2);
    assert.equal(nearestMark({ x: 125, y: 400 }, bars), 2);
    assert.equal(nearestMark({ x: 40, y: 900 }, bars), 0, "past the first bar, the first bar");
    assert.equal(nearestMark({ x: 400, y: 0 }, bars), 5, "past the last, the last");
  });

  it("on one row of marks of different heights, still by x: the bars of a histogram all stand on one baseline", () => {
    const histogram = [box(0, 140, 10, 60), box(12, 190, 10, 10), box(24, 170, 10, 30)];
    assert.equal(nearestMark({ x: 17, y: 150 }, histogram), 1, "above a short bar, that bar, not the tall one beside it");
  });

  it("between two bars, is the nearer edge, then the earlier bar on an exact tie", () => {
    /* Bar 1 ends at 119, bar 2 starts at 120: x 119.4 is in the gap, nearer bar 1. */
    assert.equal(nearestMark({ x: 119.4, y: 210 }, bars), 1);
    assert.equal(nearestMark({ x: 119.6, y: 210 }, bars), 2);
    /* Two boxes the same distance from the tap and the same distance from their centres: the first wins. */
    assert.equal(nearestMark({ x: 50, y: 0 }, [box(30, 0, 10, 10), box(60, 0, 10, 10)]), 0);
    assert.equal(nearestMark({ x: 50, y: 0 }, [box(60, 0, 10, 10), box(30, 0, 10, 10)]), 0, "document order, not position");
  });

  it("inside two overlapping boxes, is the one whose centre is nearer", () => {
    /* The follow-through dots' 44px boxes overlap where two months sit close. */
    assert.equal(nearestMark({ x: 18, y: 22 }, [box(0, 0, 20, 44), box(12, 10, 20, 44)]), 1);
    assert.equal(nearestMark({ x: 8, y: 22 }, [box(0, 0, 20, 44), box(12, 10, 20, 44)]), 0);
  });

  it("on a grid, is measured both ways, so a tap between rows or past the last column still picks a cell", () => {
    /* Between two rows, a little nearer the lower. */
    assert.equal(nearestMark({ x: 60 + 2 * 26 + 13, y: 344.5 }, grid), 14);
    /* Two cells past the newest year's last month (a month not on the record yet): December of that row. */
    assert.equal(nearestMark({ x: 60 + 12 * 26 + 30, y: 320 }, grid), 11);
    /* Left of the grid, beside a year's row: January of that year. */
    assert.equal(nearestMark({ x: 20, y: 300 + 2 * 44 + 10 }, grid), 24);
  });

  it("on dots spread over rows, picks the nearer dot in two dimensions, not the nearer x", () => {
    const dots = [box(100, 100, 20, 44), box(140, 300, 20, 44)];
    assert.equal(nearestMark({ x: 150, y: 120 }, dots), 0, "the dot on this row, though the other is under the same x");
  });

  it("skips a mark that is not drawn and keeps the others' places in the list", () => {
    assert.equal(nearestMark({ x: 0, y: 0 }, [box(0, 0, 0, 0), box(50, 0, 10, 10)]), 1);
  });
});

describe("the drawing's area", () => {
  it("is the box the marks fill, and a tap inside it is in the drawing", () => {
    const area = boxAround(grid);
    assert.deepEqual(area, { left: 60, top: 300, right: 60 + 12 * 26, bottom: 300 + 3 * 44 });
    assert.ok(area && holdsPoint(area, { x: 61, y: 431 }));
    assert.ok(area && !holdsPoint(area, { x: 61, y: 440 }), "the key under the grid is not");
    assert.equal(boxAround([]), null);
  });
});

describe("where the words go", () => {
  const phone = { width: 390, height: 664, top: 88, bottom: 96 };
  const card = { width: 320, height: 128 };

  it("sit above the mark and the finger, centred on them and inside the window", () => {
    const clear = clearOfFinger(box(180, 400, 9, 44), { x: 190, y: 420 });
    assert.deepEqual(clear, { left: 168, top: 398, right: 212, bottom: 444 }, "the finger reaches 22px past the tap");
    const place = placeMarkWords(clear, card, phone);
    assert.equal(place.side, "above");
    assert.equal(place.edge, 390, "the card's bottom edge, 8px above the finger");
    assert.equal(place.width, 320);
    assert.equal(place.left, 30, "centred on 190");
  });

  it("go under the mark when the header leaves no room above, and never off either edge", () => {
    const place = placeMarkWords(box(4, 120, 9, 44), card, phone);
    assert.equal(place.side, "below");
    assert.equal(place.edge, 172, "the card's top edge, 8px below");
    assert.equal(place.left, 16, "held 16px inside the left edge");
    const right = placeMarkWords(box(380, 500, 9, 44), card, phone);
    assert.equal(right.left + right.width, 374, "and inside the right");
  });

  it("narrow to the window on a 320px phone", () => {
    const place = placeMarkWords(box(150, 400, 9, 44), card, { width: 320, height: 568, top: 88, bottom: 96 });
    assert.equal(place.width, 288);
    assert.equal(place.left, 16);
  });

  it("take the roomier side, held on screen, when neither side fits", () => {
    const short = { width: 390, height: 360, top: 88, bottom: 96 };
    const place = placeMarkWords(box(100, 150, 9, 44), card, short);
    /* 62px above the mark, 70px below it: neither holds 128, so below, pulled up to end on the bottom chrome. */
    assert.equal(place.side, "below");
    assert.equal(place.edge, 360 - 96 - 128);
  });
});

describe("the link under a tapped mark", () => {
  it("says the month the way every mark's own label does", () => {
    assert.equal(openMarkLabel("2022-09"), "Open Sep 2022");
    assert.equal(openMarkLabel("2012-01"), "Open Jan 2012");
  });

  it("says 'that month' for a mark that carries none, never an internal name", () => {
    assert.equal(openMarkLabel(null), "Open that month");
    assert.equal(openMarkLabel("Sep 2022"), "Open that month");
    assert.doesNotMatch(openMarkLabel(null), /tap|mark|nearest|readout|bubble|sheet|!/i);
  });
});
