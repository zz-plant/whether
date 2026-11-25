import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ConditionsByYear } from "../app/components/history/conditionsByYear";
import { ScoreMoveBars } from "../app/components/home/ScoreMoveBars";
import { PlainActionLink } from "../app/components/ui/actionLink";
import { CLOSE_CONTROL_CLASS } from "../app/components/ui/closeControl";
import { describeScoreMoveHistogram } from "../lib/report/marketMoveScale";
import { buildRecordCalendar } from "../lib/report/recordCalendar";
import { getTimeMachineRegimeSeries } from "../lib/timeMachine/timeMachineCache";

/*
 * Taps on the drawings whose marks are narrower than a finger (2026-11-25, ui-ux-standards
 * §II). On touch the whole drawing is the target: a tap chooses the nearest mark
 * (`lib/ui/nearestMark.ts`, tested in nearestMark.test.ts) and a card shows its words with
 * a 44px link that opens it and a 44px close key. A phone run with Playwright measured
 * the boxes; these hold what a render or the source can show, with no DOM in the suite.
 */

const source = (path: string) => readFileSync(path, "utf8");
/* The code, without the comments that tell its history ("Until then … 'Tap again to open'"). */
const code = (path: string) => source(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("the card a tap opens", () => {
  it("opens a mark with a 44px link and closes with the shared 44px key", () => {
    /* The card renders the link this way (markReadout.tsx); the pill variant carries the 44px floor. */
    const link = renderToStaticMarkup(
      <PlainActionLink href="/?month=9&year=2022" variant="pill" className="min-w-11">
        Open Sep 2022
      </PlainActionLink>,
    );
    assert.match(link, /class="[^"]*\bmin-h-\[44px\][^"]*\bmin-w-11\b/);
    assert.match(CLOSE_CONTROL_CLASS, /\bmin-h-11\b/);
    assert.match(CLOSE_CONTROL_CLASS, /\bmin-w-11\b/);
    const island = source("app/components/ui/markReadout.tsx");
    assert.match(island, /<PlainActionLink href=\{tapped\.href\} variant="pill" className="min-w-11">/);
    assert.match(island, /className=\{CLOSE_CONTROL_CLASS\}/);
  });

  it("no longer asks for a second tap on the same few pixels", () => {
    for (const path of ["app/components/ui/markReadout.tsx", "app/components/history/historyReadout.tsx"]) {
      assert.doesNotMatch(code(path), /Tap again/i, path);
      assert.match(source(path), /markNearest\(/, `${path} chooses the nearest mark`);
    }
  });

  it("is drawn only after a tap, so the brief's control budget does not move", () => {
    const move = describeScoreMoveHistogram("tightness", 24);
    assert.ok(move);
    const html = renderToStaticMarkup(<ScoreMoveBars move={move} />);
    assert.doesNotMatch(html, /data-mark-tap-card|<button/);
  });

  it("is anchored on /history by a zero-size positioned span, which moves nothing at rest", () => {
    const calendar = buildRecordCalendar(getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER));
    assert.ok(calendar);
    const html = renderToStaticMarkup(<ConditionsByYear calendar={calendar} yearHref={(year) => `/history/${year}`} />);
    assert.match(html, /<span class="absolute top-0 left-0 block size-0"><\/span><\/figure>/);
    assert.doesNotMatch(html, /data-mark-tap-card/);
  });

  it("rings the chosen mark in ink, before the month rings that keep their own", () => {
    const css = source("app/styles/month-active.css");
    const chosen = css.indexOf("[data-mark-chosen] > :first-child");
    assert.ok(chosen > 0, "a chosen mark is ringed");
    assert.ok(chosen < css.indexOf("a[data-month][data-month-active]"), "first, so a month's own ring wins a tie");
  });
});
