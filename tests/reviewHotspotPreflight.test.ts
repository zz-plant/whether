import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  blockCommentLines,
  isUnsafeAssertion,
  resolveDiffBase,
} from "../scripts/review-hotspot-preflight.mjs";

/*
 * One comparison: the working tree against a base. The base is the merge-base with main
 * so a branch is judged on what it changes, and a merge commit does not read the base's
 * own lines as new (docs/agents/lessons/tests-and-copy-rules.md).
 */
describe("the diff base", () => {
  const MERGE_BASE = "2222222222222222222222222222222222222222";
  const HEAD = "1111111111111111111111111111111111111111";

  it("takes an explicit base first, which is how the pre-push hook scopes a push", () => {
    assert.equal(resolveDiffBase({ explicit: "abc123", mergeBase: MERGE_BASE, head: HEAD, hasParent: true }), "abc123");
  });

  it("compares a branch against where it left main", () => {
    assert.equal(resolveDiffBase({ mergeBase: MERGE_BASE, head: HEAD, hasParent: true }), MERGE_BASE);
  });

  it("compares against the last commit on main itself, where the merge-base is HEAD", () => {
    assert.equal(resolveDiffBase({ mergeBase: HEAD, head: HEAD, hasParent: true }), "HEAD~1");
  });

  it("falls back to the last commit when there is no main to compare with", () => {
    assert.equal(resolveDiffBase({ mergeBase: "", head: HEAD, hasParent: true }), "HEAD~1");
  });

  it("falls back to the working tree in a repository with one commit", () => {
    assert.equal(resolveDiffBase({ mergeBase: "", head: HEAD, hasParent: false }), "HEAD");
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

  it("covers JSX comments, single-line and opening a block", () => {
    const source = [
      "{/* Two different questions, named as two */}", // 1
      "{/* A note that runs on, named as two", //          2
      "   more of it */}", //                              3
      "<Section as={tag} />", //                           4
    ].join("\n");
    const inside = blockCommentLines(source);

    assert.ok(inside.has(1) && inside.has(2) && inside.has(3));
    assert.ok(!inside.has(4), "JSX code is code");
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

/*
 * With a named head the diff's new side is that commit, so comment context has to come
 * from the same commit: a line that is a comment on disk must not excuse an assertion the
 * pushed commit carries. Run against a real repository, because the branch under test is
 * `git show <head>:<file>`.
 */
describe("comment context with a named head", () => {
  const SCRIPT = join(process.cwd(), "scripts", "review-hotspot-preflight.mjs");

  /* Git hands a hook GIT_DIR and friends, and every git below would run against the
     pushing repository instead of this scaffold (CLAUDE.md, the pre-push hook). */
  const gitFreeEnv = () => {
    const env = { ...process.env };
    for (const key of Object.keys(env)) if (key.startsWith("GIT_")) delete env[key];
    return env;
  };

  const scaffold = () => {
    const repository = mkdtempSync(join(tmpdir(), "hotspot-head-"));
    const env = gitFreeEnv();
    const git = (...args: string[]) => {
      const run = spawnSync("git", args, { cwd: repository, encoding: "utf8", env });
      assert.equal(run.status, 0, `git ${args.join(" ")}: ${run.stderr}`);
      return run.stdout.trim();
    };
    git("init", "--quiet");
    git("config", "user.email", "test@example.com");
    git("config", "user.name", "test");
    writeFileSync(join(repository, "lib.ts"), "const a = 1;\n");
    git("add", "lib.ts");
    git("commit", "--quiet", "-m", "base");
    const base = git("rev-parse", "HEAD");
    writeFileSync(join(repository, "lib.ts"), "const v = input as Foo;\n");
    git("commit", "--quiet", "-am", "head");
    const head = git("rev-parse", "HEAD");
    // On disk, line 1 is a comment; in the head commit, line 1 is the assertion.
    writeFileSync(join(repository, "lib.ts"), "// line one is a comment on disk\n");
    const preflight = (...args: string[]) =>
      spawnSync(process.execPath, [SCRIPT, ...args], { cwd: repository, encoding: "utf8", env });
    return { repository, base, head, preflight };
  };

  it("reads comment lines from the head commit, so a pushed assertion is not excused by the disk", () => {
    const { repository, base, head, preflight } = scaffold();
    try {
      const run = preflight("--base", base, "--head", head);
      const output = `${run.stdout}${run.stderr}`;
      assert.equal(run.status, 1, output);
      assert.match(output, /Unsafe assertion additions: 1/);
      assert.ok(output.includes("lib.ts: const v = input as Foo;"), output);
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });

  it("still reads the working tree when no head is named", () => {
    const { repository, base, preflight } = scaffold();
    try {
      const run = preflight("--base", base);
      const output = `${run.stdout}${run.stderr}`;
      assert.equal(run.status, 0, output);
      assert.match(output, /working tree against/);
      assert.match(output, /Unsafe assertion additions: 0/);
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });
});
