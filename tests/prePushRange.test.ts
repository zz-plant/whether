import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "bun:test";

import { parsePrePushRange } from "../scripts/pre-push-range.mjs";

/*
 * The pre-push hook scopes the review preflight to what the push actually
 * sends, using the plan git writes to the hook's stdin. Before this, the
 * preflight read "last commit plus every uncommitted edit" — a range that
 * fails on other sessions' in-flight work the push does not contain, and that
 * never sees commits 2..n of a multi-commit push (the deploy gate does not
 * re-check the preflight either, so those commits were reviewed nowhere).
 *
 * The stdin format is git's: one "<local ref> <local sha> <remote ref>
 * <remote sha>" line per ref update.
 */
describe("parsePrePushRange", () => {
  const MAIN_UPDATE = "refs/heads/main 1111111111111111111111111111111111111111 refs/heads/main 2222222222222222222222222222222222222222\n";

  it("returns the pushed range from a branch update line", () => {
    assert.deepEqual(parsePrePushRange(MAIN_UPDATE), {
      base: "2222222222222222222222222222222222222222",
      head: "1111111111111111111111111111111111111111",
    });
  });

  it("skips deletions and reviews the first real update", () => {
    const text =
      "refs/heads/gone 0000000000000000000000000000000000000000 refs/heads/gone 2222222222222222222222222222222222222222\n" +
      MAIN_UPDATE;

    assert.deepEqual(parsePrePushRange(text)?.head, "1111111111111111111111111111111111111111");
  });

  it("skips new branches, which have no remote state to review against", () => {
    const text =
      "refs/heads/new 1111111111111111111111111111111111111111 refs/heads/new 0000000000000000000000000000000000000000\n" +
      MAIN_UPDATE;

    assert.deepEqual(parsePrePushRange(text)?.base, "2222222222222222222222222222222222222222");
  });

  it("returns null when nothing qualifies, so the hook keeps its default range", () => {
    assert.equal(parsePrePushRange(""), null);
    assert.equal(
      parsePrePushRange("refs/heads/new 1111111111111111111111111111111111111111 refs/heads/new 0000000000000000000000000000000000000000\n"),
      null,
    );
  });

  it("reads stdin and prints the pair for the hook to export", () => {
    const run = spawnSync(process.execPath, [new URL("../scripts/pre-push-range.mjs", import.meta.url).pathname], {
      input: MAIN_UPDATE,
      encoding: "utf8",
    });

    assert.equal(run.status, 0);
    assert.equal(run.stdout, "2222222222222222222222222222222222222222 1111111111111111111111111111111111111111\n");
  });

  it("prints nothing for a push it cannot scope", () => {
    const run = spawnSync(process.execPath, [new URL("../scripts/pre-push-range.mjs", import.meta.url).pathname], {
      input: "refs/heads/new 1111111111111111111111111111111111111111 refs/heads/new 0000000000000000000000000000000000000000\n",
      encoding: "utf8",
    });

    assert.equal(run.status, 0);
    assert.equal(run.stdout, "");
  });
});
