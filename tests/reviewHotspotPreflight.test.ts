import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  blockCommentLines,
  isUnsafeAssertion,
} from "../scripts/review-hotspot-preflight.mjs";

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
