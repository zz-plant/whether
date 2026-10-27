import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildCommit, restoreTrackedFromHead, worktreeDrift } from "../scripts/exec.mjs";

/*
 * The deploy gate refuses a tree that is not its commit. A build container once ran the
 * gate against a checkout whose `public/` held the previous build's files, and the failure
 * read as a flaky suite for a day. docs/agents/lessons/automation-and-deploy-gate.md.
 */
const gitRepository = () => {
  const repository = mkdtempSync(join(tmpdir(), "check-gate-tree-"));
  const git = (...args: string[]) => spawnSync("git", args, { cwd: repository, encoding: "utf8" });
  git("init", "--quiet");
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "test");
  writeFileSync(join(repository, "tracked.txt"), "committed\n");
  git("add", "tracked.txt");
  git("commit", "--quiet", "-m", "initial");
  return { repository, git };
};

/* Git hands a hook GIT_DIR and friends, and every git below would inherit them and run
   against the pushing repository instead of this scaffold (CLAUDE.md, the pre-push hook). */
const gitFreeEnv = () => {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith("GIT_")) delete env[key];
  delete env.WORKERS_CI;
  return env;
};

const runGate = (cwd: string, extraEnv: Record<string, string> = {}) =>
  spawnSync("bun", [join(process.cwd(), "scripts", "run-checks.mjs"), "lint"], {
    cwd,
    encoding: "utf8",
    env: { ...gitFreeEnv(), WHETHER_DEPLOY_GATE: "1", ...extraEnv },
  });

describe("deploy gate worktree check", () => {
  it("separates a tree that is not its commit from one that merely holds extra files", () => {
    const { repository, git } = gitRepository();

    try {
      assert.deepEqual(worktreeDrift(repository)?.tracked, [], "a fresh checkout has no tracked drift");

      writeFileSync(join(repository, "tracked.txt"), "overwritten after checkout\n");
      assert.deepEqual(
        worktreeDrift(repository)?.tracked,
        [{ code: "M", path: "tracked.txt" }],
        "a file replaced after checkout is drift, and the path is what a build log needs",
      );

      git("checkout", "--quiet", "--", "tracked.txt");
      writeFileSync(join(repository, "extra.txt"), "new\n");
      const clean = worktreeDrift(repository);
      assert.deepEqual(clean?.tracked, [], "an untracked file does not make the commit's own content wrong");
      assert.deepEqual(clean?.untracked, ["extra.txt"]);
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });

  // "Cannot tell" and "clean" are different facts; a caller must not report the second for the first.
  it("answers nothing, not clean, where there is no checkout to read", () => {
    const directory = mkdtempSync(join(tmpdir(), "check-gate-nogit-"));
    try {
      assert.equal(worktreeDrift(directory), null);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  /* /api/health names this commit so "is my merge live?" is one request; a dirty local deploy is not HEAD. */
  it("names HEAD as the build commit only for a checkout that holds nothing HEAD does not", () => {
    const { repository, git } = gitRepository();
    const env = { WORKERS_CI_COMMIT_SHA: "" };

    try {
      const head = git("rev-parse", "HEAD").stdout.trim();
      assert.equal(buildCommit({ env, cwd: repository }), head);

      writeFileSync(join(repository, "tracked.txt"), "edited, not committed\n");
      assert.equal(buildCommit({ env, cwd: repository }), "", "a modified tracked file is not HEAD");

      git("checkout", "--quiet", "--", "tracked.txt");
      writeFileSync(join(repository, "new-module.ts"), "export {};\n");
      assert.equal(buildCommit({ env, cwd: repository }), "", "an untracked file the build may import is not HEAD");

      assert.equal(
        buildCommit({ env: { WORKERS_CI_COMMIT_SHA: "abc1234" }, cwd: repository }),
        "abc1234",
        "Workers Builds names its own commit",
      );
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });

  it("refuses a local tree that is not its commit, names the files, and leaves the edit alone", () => {
    const { repository } = gitRepository();

    try {
      writeFileSync(join(repository, "tracked.txt"), "an edit nobody has committed\n");
      const result = runGate(repository);
      const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

      assert.equal(result.status, 1, `expected a refusal, got ${result.status}:\n${output}`);
      assert.match(output, /working tree is not the commit/);
      assert.match(output, /tracked\.txt/, "a refusal that does not name the file is the log we already had");
      assert.equal(readFileSync(join(repository, "tracked.txt"), "utf8"), "an edit nobody has committed\n");
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });

  /* Workers Builds restores its build output cache over the clone; git there still holds the
     commit, so the gate puts the file back instead of asking someone to clear the cache. */
  it("restores a stale tracked file from HEAD inside Workers Builds, names it, and carries on", () => {
    const { repository } = gitRepository();

    try {
      writeFileSync(join(repository, "tracked.txt"), "what a stale cache restored\n");
      writeFileSync(join(repository, "leftover.txt"), "an untracked file from the cache\n");
      const output = `${runGate(repository, { WORKERS_CI: "1" }).stdout ?? ""}`;

      assert.match(output, /resetting them to the commit/);
      assert.match(output, /tracked\.txt/);
      assert.doesNotMatch(output, /working tree is not the commit/);
      assert.equal(readFileSync(join(repository, "tracked.txt"), "utf8"), "committed\n");
      assert.equal(readFileSync(join(repository, "leftover.txt"), "utf8"), "an untracked file from the cache\n");
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });

  it("puts deleted and modified tracked files back and reports nothing left over", () => {
    const { repository, git } = gitRepository();

    try {
      writeFileSync(join(repository, "second.txt"), "second\n");
      git("add", "second.txt");
      git("commit", "--quiet", "-m", "second");
      writeFileSync(join(repository, "tracked.txt"), "stale\n");
      rmSync(join(repository, "second.txt"));

      assert.deepEqual(restoreTrackedFromHead(repository)?.tracked, []);
      assert.equal(readFileSync(join(repository, "second.txt"), "utf8"), "second\n");
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });

  // The negative control: a clean tree is reported, not refused.
  it("reports the commit and carries on when the tree is that commit", () => {
    const { repository } = gitRepository();

    try {
      const output = `${runGate(repository).stdout ?? ""}`;
      assert.match(output, /\[run-checks\] HEAD [0-9a-f]{40}/);
      assert.doesNotMatch(output, /working tree is not the commit/);
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });
});
