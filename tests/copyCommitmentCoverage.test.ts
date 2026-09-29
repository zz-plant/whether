import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "bun:test";

/**
 * Every copy control reports the funnel's `committed` step.
 *
 * Activation is defined as a copy or a subscribe (`lib/activationFunnel.ts`),
 * and until 2026-09-23 only `/share` reported a copy: the homepage's Copy Brief,
 * the sticky strip, the share rail and the slide button were invisible, so the
 * 30-day funnel read zero commitments against 554 visits and nobody could tell
 * a product problem from a measurement one.
 *
 * A source read, on purpose: the report fires inside the clipboard hook's
 * success path, which only runs in a browser, and nothing in this suite
 * exercises a client effect (docs/agents/lessons/tests-and-copy-rules.md, "Tests that read source instead of
 * behaviour"). What can be held here is that no caller opts out by omission.
 */

const repoRoot = new URL("..", import.meta.url).pathname;

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });

describe("copy commitment coverage", () => {
  it("passes a commitment at every useClipboardCopy call", () => {
    const missing: string[] = [];
    for (const file of sourceFiles(join(repoRoot, "app"))) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/useClipboardCopy\(([^)]*)\)/g)) {
        if (!/commitment\s*:/.test(match[1])) missing.push(relative(repoRoot, file));
      }
    }
    assert.deepEqual(missing, []);
  });

  it("reports the slide copy only after a confirmed write", () => {
    const source = readFileSync(join(repoRoot, "app/components/CopyMeetingSlideButton.tsx"), "utf8");
    const guard = source.indexOf("if (!(await writeSlide())) return;");
    const report = source.indexOf('commitment: "copied_meeting"');
    assert.ok(guard > 0 && report > guard, "the report must follow the write's success check");
  });
});
