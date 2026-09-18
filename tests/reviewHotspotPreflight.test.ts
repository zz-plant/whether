import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  blockCommentLines,
  describeDiffRange,
  isUnsafeAssertion,
  resolveDefaultDiffRange,
} from "../scripts/review-hotspot-preflight.mjs";

/*
 * The default range, and the one shape it used to get wrong.
 *
 * `HEAD~1` is the first parent. On a merge commit that is the pre-merge branch
 * tip, so the scan read everything the *base* brought in as newly added by this
 * change: merging `main` into a branch on 2026-09-17 flagged an `as` cast that
 * had been on `main` for a day, and the merge resolving that PR's conflict could
 * only be pushed with SKIP_PREPUSH=1. Checked against that commit, the first
 * parent surfaces seven lines of the base's own code and `HEAD^2...HEAD`
 * surfaces none.
 */
describe("the default diff range", () => {
  it("compares against the last commit on an ordinary commit", () => {
    assert.deepEqual(resolveDefaultDiffRange({ hasHeadParent: true, parentCount: 1 }), ["HEAD~1"]);
  });

  it("compares against the merged-in base on a merge commit, not the first parent", () => {
    assert.deepEqual(resolveDefaultDiffRange({ hasHeadParent: true, parentCount: 2 }), ["HEAD^2...HEAD", "HEAD"]);
    assert.deepEqual(resolveDefaultDiffRange({ hasHeadParent: true, parentCount: 3 }), ["HEAD^2...HEAD", "HEAD"]);
  });

  /*
   * The second range is the point. A three-dot range ignores the working tree,
   * and every branch cut from this repo's main starts at a merge commit — so a
   * merge range alone would have made a fresh branch's uncommitted edits
   * invisible until its first commit, which is a worse failure than the one the
   * merge case fixes.
   */
  it("keeps uncommitted work in scope on a merge commit", () => {
    assert.ok(resolveDefaultDiffRange({ hasHeadParent: true, parentCount: 2 }).includes("HEAD"));
  });

  it("falls back to the working tree in a repository with no parent commit", () => {
    assert.deepEqual(resolveDefaultDiffRange({ hasHeadParent: false, parentCount: 0 }), ["HEAD"]);
  });

  it("says which ranges it used", () => {
    assert.match(describeDiffRange("HEAD~1"), /the last commit plus any uncommitted changes/);
    assert.match(describeDiffRange("HEAD"), /uncommitted changes only/);
    assert.match(describeDiffRange(["HEAD~1"]), /the last commit plus any uncommitted changes/);
    assert.match(describeDiffRange(["HEAD^2...HEAD", "HEAD"]), /merge commit/);
    assert.match(describeDiffRange(["HEAD^2...HEAD", "HEAD"]), /plus any uncommitted changes/);
  });
});

describe("blockCommentLines", () => {
  const source = [
    "/**", //                       1
    " * Renders as a header.", //   2
    " */", //                       3
    "const a = 1;", //              4
    "// reads as boilerplate", //   5
    "const b = 2;", //              6
    "/* one-liner as such */", //   7
    "const c = 3;", //              8
  ].join("\n");

  it("covers a doc comment from its opener to its closer", () => {
    const inside = blockCommentLines(source);

    assert.ok(inside.has(1) && inside.has(2) && inside.has(3), "the whole block");
    assert.ok(!inside.has(4), "code after the block is code");
  });

  it("covers line comments and single-line block comments", () => {
    const inside = blockCommentLines(source);

    assert.ok(inside.has(5));
    assert.ok(inside.has(7));
    assert.ok(!inside.has(6) && !inside.has(8));
  });

  it("does not excuse a line that carries code before the comment opener", () => {
    const source = ["const x = value as Foo; /* trailing note", " * continues here", " */"].join("\n");
    const inside = blockCommentLines(source);

    assert.ok(!inside.has(1), "line 1 has real code on it");
    assert.ok(inside.has(2) && inside.has(3), "the continuation is still comment");
  });
});

describe("isUnsafeAssertion", () => {
  it("flags a real assertion", () => {
    assert.equal(isUnsafeAssertion("  const rows = JSON.parse(raw) as Row[];"), true);
    assert.equal(isUnsafeAssertion("  const value = input as { id: string };"), true);
  });

  it("allows as const", () => {
    assert.equal(isUnsafeAssertion('  const modes = ["auto", "tv"] as const;'), false);
  });

  it("allows import aliases, renamed or namespaced", () => {
    assert.equal(
      isUnsafeAssertion('import { macroSeries as snapshotMacroSeries } from "../lib/macroSnapshot";'),
      false,
    );
    /* The namespace form carries the same `as Name` tokens and overrides nothing.
       It was refused until a test needed one to spread the real `next/navigation`
       over a mock, and the gate then failed on an import. */
    assert.equal(isUnsafeAssertion('import * as nextNavigation from "next/navigation";'), false);
  });

  it("ignores English prose, quoted or not", () => {
    assert.equal(isUnsafeAssertion("  // this renders as a header"), false);
    assert.equal(isUnsafeAssertion('  const label = "treats the window as unchanged";'), false);
    assert.equal(isUnsafeAssertion("  // as of the latest record"), false);
  });
});

// The scanner used to track comment state across added lines only, so editing the middle
// of an existing doc comment handed it bare prose with the opener nowhere in the diff.
// Every "renders as a header" in that prose was reported as a type assertion, and the
// check failed on a change that added no code at all.
describe("prose inside an edited doc comment", () => {
  it("is excluded by line number even though the line alone looks like an assertion", () => {
    const editedLine = " * rounds of narrowing got here. First this returned a clientId as its own";
    const file = ["/**", editedLine, " */", "const x = 1;"].join("\n");

    assert.equal(isUnsafeAssertion(editedLine), true, "the line alone is indistinguishable");
    assert.ok(blockCommentLines(file).has(2), "but the file says line 2 is a comment");
  });
});
