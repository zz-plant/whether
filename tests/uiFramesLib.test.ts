import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { frameGaps, frameOffsets, routeFailures, tallBlocks } from "../scripts/ui-frames.lib.mjs";
import { frameAuditRoutes } from "../scripts/ui-capture.config.mjs";

/*
 * The frame audit (`bun run ui:frames`) measures each screen-height frame of a route in a
 * browser; these are its judgements, offline. A page reads well as a screenshot only if
 * every frame does: it names the site (and, on a page that reports a reading, the date and
 * the conditions), and no block is too tall for one frame to hold.
 */
describe("frame audit", () => {
  it("tiles a page in frames, the last ending at its foot", () => {
    assert.deepEqual(frameOffsets(2000, 844), [0, 844, 1156]);
    assert.deepEqual(frameOffsets(500, 844), [0], "a page shorter than a screen is one frame");
    assert.equal(frameOffsets(100000, 844, 8).length, 8, "at most eight frames");
    assert.equal(frameOffsets(100000, 844, 8).at(-1), 100000 - 844, "the last of them is the foot");
  });

  it("asks a page for the facts it has: a reading names its week and conditions, a reading page its source", () => {
    const frame = { site: true, dated: false, condition: false };
    assert.deepEqual(frameGaps(frame), ["date", "conditions"]);
    assert.deepEqual(frameGaps(frame, ["site"]), []);
    const byPath = new Map(frameAuditRoutes.map((route) => [route.path, route.requires]));
    assert.deepEqual(byPath.get("/signals"), ["site", "date", "conditions"]);
    assert.deepEqual(byPath.get("/about"), ["site"]);
  });

  it("fails a route on any frame that lacks a fact and any block taller than a frame", () => {
    const frames = [
      { index: 1, y: 844, site: true, dated: true, condition: true },
      { index: 2, y: 1688, site: false, dated: true, condition: false },
    ];
    const tall = tallBlocks([{ label: "Signals", height: 890 }, { label: "Areas", height: 400 }], 811).map((block) => ({
      ...block,
      usableHeight: 811,
    }));
    assert.deepEqual(routeFailures({ frames, tall, requires: ["site", "date", "conditions"] }), [
      "frame 2 (y=1688) names no site, no conditions",
      '"Signals" is 890px, taller than a 811px frame',
    ]);
    assert.deepEqual(routeFailures({ frames: frames.slice(0, 1), tall: [], requires: ["site"] }), []);
  });
});

/*
 * A table cannot shrink below its content, so `sr-only` on the <table> itself leaves it
 * laid out at full width. On 2026-10-27 one on /concepts pushed a 390px phone page to
 * 651px, so every phone screenshot of the page came out zoomed out. The class goes on a
 * wrapper (advicePlane.tsx and adviceCorpusSection.tsx do this).
 */
describe("screen-reader tables", () => {
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      return statSync(full).isDirectory() ? files(full) : full.endsWith(".tsx") ? [full] : [];
    });

  it("hide behind a wrapper, never with sr-only on the table", () => {
    const offenders = files("app").filter((file) => /<table\b[^>]*className=["{`][^>]*\bsr-only\b/.test(readFileSync(file, "utf8")));
    assert.deepEqual(offenders, []);
  });
});
