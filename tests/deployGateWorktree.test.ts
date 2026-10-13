import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildCommit, worktreeDrift } from "../scripts/exec.mjs";

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
  return env;
};

const runGate = (cwd: string) =>
  spawnSync("bun", [join(process.cwd(), "scripts", "run-checks.mjs"), "lint"], {
    cwd,
    encoding: "utf8",
    env: { ...gitFreeEnv(), WHETHER_DEPLOY_GATE: "1" },
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

  it("refuses to run the deploy gate against a tree that is not its commit, and names the files", () => {
    const { repository } = gitRepository();

    try {
      writeFileSync(join(repository, "tracked.txt"), "what a stale cache restored\n");
      const result = runGate(repository);
      const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

      assert.equal(result.status, 1, `expected a refusal, got ${result.status}:\n${output}`);
      assert.match(output, /working tree is not the commit/);
      assert.match(output, /tracked\.txt/, "a refusal that does not name the file is the log we already had");
      assert.match(output, /build cache/, "the build container is where this fires, so say what to do there");
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
