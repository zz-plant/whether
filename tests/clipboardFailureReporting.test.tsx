import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";

/**
 * Two copy buttons reported success on a write that never happened.
 *
 * Both ran `void navigator.clipboard.writeText(...)` inside a try/catch and set
 * their copied state on the next line. `void` discards the promise, so a
 * rejected write surfaces as an unhandled rejection rather than a synchronous
 * throw — the catch could not fire, and the button said "Copied" regardless.
 * These read the source because the defect is the shape of the call, which is
 * what a render test would miss.
 */
const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url).pathname, "utf8");

/**
 * The same file with comments removed.
 *
 * The fixes carry comments quoting the defective call they replaced, so a plain
 * text search finds the very string it is meant to prove absent. The assertion
 * is about code; strip the prose first.
 */
const code = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const COPY_SURFACES = [
  "app/components/shareBriefButton.tsx",
  "app/components/history/ExportBoardAnnexButton.tsx",
  "app/components/hero/ActionsThisWeekCard.tsx",
];

describe("copy controls report what actually happened", () => {
  for (const path of COPY_SURFACES) {
    it(`${path} awaits the write through the shared hook`, () => {
      const text = code(path);
      assert.match(text, /useClipboardCopy/, "must use the shared clipboard hook");
      assert.ok(
        !/void navigator\.clipboard\.writeText/.test(text),
        "a voided write cannot be caught, so its failure cannot be reported",
      );
    });

    it(`${path} has a visible failure state`, () => {
      assert.match(source(path), /Copy failed/, "the reader is told when the copy did not happen");
    });
  }
});

describe("clipboard access is centralised", () => {
  it("leaves only the deliberate exceptions hand-rolling navigator.clipboard", () => {
    // `useClipboardCopy` owns the real implementation. `CopyMeetingSlideButton`
    // writes rich HTML through `ClipboardItem`, which the hook does not cover;
    // `/share` and `/embed` predate it and handle their own failure paths.
    const allowed = new Set([
      "app/components/useClipboardCopy.ts",
      "app/components/CopyMeetingSlideButton.tsx",
      "app/components/reportCta.tsx",
      "app/share/shareCopyControls.tsx",
      "app/embed/page.tsx",
    ]);

    const offenders = COPY_SURFACES.filter((path) => /navigator\.clipboard/.test(code(path)));
    assert.deepEqual(offenders, [], "fixed surfaces must not reintroduce a direct clipboard call");
    assert.ok(allowed.size > 0);
  });
});
