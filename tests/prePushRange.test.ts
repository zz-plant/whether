import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "bun:test";

import { parsePrePushBase } from "../scripts/pre-push-range.mjs";

/*
 * The pre-push hook judges the review preflight against what the push actually sends:
 * the remote sha from the plan git writes to the hook's stdin.
 */
describe("parsePrePushBase", () => {
  const MAIN_UPDATE = "refs/heads/main 1111111111111111111111111111111111111111 refs/heads/main 2222222222222222222222222222222222222222\n";

  it("returns the remote sha from a branch update line", () => {
    assert.equal(parsePrePushBase(MAIN_UPDATE), "2222222222222222222222222222222222222222");
  });

  it("skips deletions and reads the first real update", () => {
    const text =
      "refs/heads/gone 0000000000000000000000000000000000000000 refs/heads/gone 3333333333333333333333333333333333333333\n" +
      MAIN_UPDATE;

    assert.equal(parsePrePushBase(text), "2222222222222222222222222222222222222222");
  });

  it("skips new branches, which have no remote state to review against", () => {
    const text =
      "refs/heads/new 1111111111111111111111111111111111111111 refs/heads/new 0000000000000000000000000000000000000000\n" +
      MAIN_UPDATE;

    assert.equal(parsePrePushBase(text), "2222222222222222222222222222222222222222");
  });

  it("returns null when nothing qualifies, so the hook keeps its default base", () => {
    assert.equal(parsePrePushBase(""), null);
    assert.equal(
      parsePrePushBase("refs/heads/new 1111111111111111111111111111111111111111 refs/heads/new 0000000000000000000000000000000000000000\n"),
      null,
    );
  });

  it("reads stdin and prints the base for the hook to export", () => {
    const run = spawnSync(process.execPath, [new URL("../scripts/pre-push-range.mjs", import.meta.url).pathname], {
      input: MAIN_UPDATE,
      encoding: "utf8",
    });

    assert.equal(run.status, 0);
    assert.equal(run.stdout, "2222222222222222222222222222222222222222\n");
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
