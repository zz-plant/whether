import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { isPrunable, parseWorktreeList } from "../scripts/agent-worktrees.mjs";

const MAIN = "/repo";

const entry = (overrides: Record<string, unknown> = {}) => ({
  path: "/repo/.claude/worktrees/stale",
  head: "abc",
  branch: "claude/stale",
  detached: false,
  locked: false,
  prunable: "",
  dirty: 0,
  ...overrides,
});

describe("worktree report", () => {
  it("parses a branch, a detached worktree and a locked one", () => {
    const output = [
      "worktree /repo",
      "HEAD 1111111111111111111111111111111111111111",
      "branch refs/heads/main",
      "",
      "worktree /repo/.claude/worktrees/stale",
      "HEAD 2222222222222222222222222222222222222222",
      "branch refs/heads/claude/stale",
      "",
      "worktree /repo/.claude/worktrees/detached",
      "HEAD 3333333333333333333333333333333333333333",
      "detached",
      "locked",
      "",
    ].join("\n");

    const parsed = parseWorktreeList(output);

    assert.equal(parsed.length, 3);
    assert.equal(parsed[0]?.branch, "main");
    assert.equal(parsed[1]?.branch, "claude/stale");
    assert.equal(parsed[2]?.detached, true);
    assert.equal(parsed[2]?.locked, true);
  });

  it("prunes a clean, old branch worktree because the branch keeps its commits", () => {
    assert.equal(
      isPrunable(entry(), { mainPath: MAIN, merged: false, branchExists: true, ageDays: 30, minAgeDays: 14 }),
      true,
    );
  });

  it("keeps a dirty worktree, a young one, the main checkout, and a locked one", () => {
    const options = { mainPath: MAIN, merged: false, branchExists: true, ageDays: 30, minAgeDays: 14 };

    assert.equal(isPrunable(entry({ dirty: 1 }), options), false);
    assert.equal(isPrunable(entry(), { ...options, ageDays: 3 }), false);
    assert.equal(isPrunable(entry({ path: MAIN }), options), false);
    assert.equal(isPrunable(entry({ locked: true }), options), false);
  });

  it("removes a detached worktree only when it is merged", () => {
    const detached = entry({ branch: "", detached: true });
    const base = { mainPath: MAIN, branchExists: false, ageDays: 30, minAgeDays: 14 };

    assert.equal(isPrunable(detached, { ...base, merged: false }), false);
    assert.equal(isPrunable(detached, { ...base, merged: true }), true);
  });
});
