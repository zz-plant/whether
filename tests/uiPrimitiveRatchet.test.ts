import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/*
 * DD-042's ratchet: the touch-target floor is a property of the shared
 * primitives (`ActionLink` and the weather-* controls already carry
 * `min-h-[44px]`), so every hand-typed occurrence is a place where the 44px
 * rule lives in a pasted class chain instead of the component that owns it.
 * The count may only fall: migrating a control to a primitive ratchets it down,
 * and a new hand-typed chain fails this test with the primitive to use instead.
 */

const sourceFiles = (dir: string, found: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".") || entry === "mockups") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, found);
    else if (/\.tsx?$/.test(entry)) found.push(full);
  }
  return found;
};

describe("hand-typed touch-target chains (DD-042 ratchet)", () => {
  it("min-h-[44px] in app/ may only fall as controls move to the primitives", () => {
    let count = 0;
    for (const file of sourceFiles("app")) {
      count += (readFileSync(file, "utf8").match(/min-h-\[44px\]/g) ?? []).length;
    }
    // Baseline at the ratchet's introduction (2026-10-22). RATCHET_REPORT=1 prints
    // the current count for the next baseline after a migration.
    if (process.env.RATCHET_REPORT === "1") console.log(`min-h-[44px]: ${count}`);
    assert.ok(
      count <= 98,
      `${count} hand-typed min-h-[44px] chains (baseline 98). Use ActionLink (pill/ghost/primary/inline) or the weather-* controls, which carry the 44px floor themselves.`,
    );
  });
});
