import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { passAge, REUSE_WINDOW_MS, reuseBlockedBy, withPasses } from "../scripts/check-reuse.mjs";
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
   against the pushing repository instead of this scaffold (docs/agents/toolchain.md, the pre-push hook). */
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

/*
 * `bun run check` and the pre-push hook run the same tasks, and half of all pushes followed
 * a passing check on an unchanged tree. The hook passes `--reuse`, which skips a task whose
 * pass is recorded for the exact tree on disk. scripts/check-reuse.mjs argues why that is the
 * same verdict; these hold it to the argument: one changed byte, an hour, a failure or the
 * deploy gate each mean the task runs.
 */
describe("a pass recorded on a tree", () => {
  const PRE_PUSH_SCRIPTS = {
    lint: "lint",
    "lint:types": "lint:types",
    typecheck: "typecheck",
    test: "test",
    "assets:check": "assets",
    "check:suppressions": "suppressions",
    "check:dead-exports": "dead-exports",
    "review:hotspot-preflight": "hotspot-preflight",
    "check:landmarks": "landmarks",
  };
  const ALL = Object.values(PRE_PUSH_SCRIPTS).sort();

  /** A committed repository whose every pre-push script appends its task name to a log outside the tree. */
  const taskRepository = () => {
    const { repository, git } = gitRepository();
    const log = `${repository}.ran.log`;
    writeFileSync(
      join(repository, "tick.mjs"),
      [
        'import { appendFileSync } from "node:fs";',
        "const name = process.argv[2];",
        "appendFileSync(process.env.TICK_LOG, `${name}\\n`);",
        'process.exit((process.env.TICK_FAIL ?? "").split(",").includes(name) ? 1 : 0);',
      ].join("\n"),
    );
    const scripts = Object.fromEntries(
      Object.entries(PRE_PUSH_SCRIPTS).map(([script, task]) => [script, `bun tick.mjs ${task}`]),
    );
    writeFileSync(join(repository, "package.json"), JSON.stringify({ name: "check-reuse-fixture", scripts }));
    git("add", "tick.mjs", "package.json");
    git("commit", "--quiet", "-m", "tasks");

    /** Runs the checks and returns the tasks that actually executed, sorted. */
    const run = (args: string[], extraEnv: Record<string, string> = {}) => {
      writeFileSync(log, "");
      const result = spawnSync("bun", [join(process.cwd(), "scripts", "run-checks.mjs"), ...args], {
        cwd: repository,
        encoding: "utf8",
        env: { ...gitFreeEnv(), CHECK_NO_REUSE: "", WHETHER_DEPLOY_GATE: "", TICK_LOG: log, ...extraEnv },
      });
      const ran = readFileSync(log, "utf8").split("\n").filter(Boolean).sort();
      return { status: result.status, stdout: result.stdout, ran };
    };
    const cleanUp = () => {
      rmSync(repository, { recursive: true, force: true });
      rmSync(log, { force: true });
    };
    return { repository, git, run, cleanUp };
  };

  const PRE_PUSH = ["--preset", "pre-push", "--reuse"];
  /* One task a pass can stand in for and the one it cannot: enough to tell reuse from a run. */
  const PAIR = ["lint", "hotspot-preflight", "--reuse"];
  const BOTH = ["hotspot-preflight", "lint"];
  const RANGE_ONLY = ["hotspot-preflight"];

  it("is not run again by the hook, and the range check always is", () => {
    const { run, cleanUp } = taskRepository();
    try {
      const check = run(["lint", "typecheck", "test"]);
      assert.equal(check.status, 0);
      assert.deepEqual(check.ran, ["lint", "test", "typecheck"]);

      const push = run(PRE_PUSH);
      assert.equal(push.status, 0);
      assert.deepEqual(
        push.ran,
        ALL.filter((task) => !["lint", "test", "typecheck"].includes(task)),
        "the three that passed on this tree are skipped; the six that never ran do run",
      );
      assert.match(push.stdout, /✅ test \(not run again: passed on this exact tree \d+s ago\)/);
      assert.match(push.stdout, /3 task\(s\) not run again/);

      assert.deepEqual(run(PRE_PUSH).ran, RANGE_ONLY, "it judges a push range, not the tree");
    } finally {
      cleanUp();
    }
  });

  it("stands for the bytes on disk: any change runs the task, and committing the same bytes does not", () => {
    const { repository, git, run, cleanUp } = taskRepository();
    try {
      writeFileSync(join(repository, "tracked.txt"), "edited, not committed\n");
      writeFileSync(join(repository, "new-module.ts"), "export {};\n");
      assert.deepEqual(run(PAIR).ran, BOTH);
      assert.deepEqual(run(PAIR).ran, RANGE_ONLY, "the same dirty tree");

      /* The usual order is check, commit, push. The pass was for the content, not the sha. */
      git("add", "--all");
      git("commit", "--quiet", "-m", "the bytes that passed");
      assert.deepEqual(run(PAIR).ran, RANGE_ONLY, "the commit holds exactly what passed");

      writeFileSync(join(repository, "tracked.txt"), "edited by another session\n");
      assert.deepEqual(run(PAIR).ran, BOTH, "a tracked edit");

      git("checkout", "--quiet", "--", "tracked.txt");
      writeFileSync(join(repository, "stray.ts"), "export {};\n");
      assert.deepEqual(run(PAIR).ran, BOTH, "an untracked file a task may read");
    } finally {
      cleanUp();
    }
  });

  it("is never recorded for a task that failed, and never asked for without the flag", () => {
    const { run, cleanUp } = taskRepository();
    try {
      const failing = run(["lint", "typecheck", "--reuse"], { TICK_FAIL: "lint" });
      assert.equal(failing.status, 1);
      assert.deepEqual(failing.ran, ["lint", "typecheck"]);
      assert.deepEqual(run(["lint", "typecheck", "--reuse"]).ran, ["lint"], "the failure runs again; the pass beside it stands");

      assert.deepEqual(run(["lint", "typecheck"]).ran, ["lint", "typecheck"], "without --reuse every task runs");
      assert.deepEqual(run(["lint", "typecheck", "--reuse"], { CHECK_NO_REUSE: "1" }).ran, ["lint", "typecheck"]);
    } finally {
      cleanUp();
    }
  });

  it("is neither reused nor recorded by the deploy gate", () => {
    const { run, cleanUp } = taskRepository();
    const GATE = { WHETHER_DEPLOY_GATE: "1" };
    try {
      run(["lint"], GATE);
      assert.deepEqual(run(["lint", "--reuse"]).ran, ["lint"], "a gate run leaves nothing for a push to reuse");
      assert.deepEqual(run(["lint", "--reuse"], GATE).ran, ["lint"], "the gate runs a task that passed here a moment ago");

      assert.equal(reuseBlockedBy(GATE), "WHETHER_DEPLOY_GATE");
      assert.equal(reuseBlockedBy({ WHETHER_TEST_ALLOW_NETWORK: "1" }), "WHETHER_TEST_ALLOW_NETWORK");
      assert.equal(reuseBlockedBy({ LANDMARKS_BASE_URL: "" }), null, "an empty variable is unset");
    } finally {
      cleanUp();
    }
  });

  /* A few tests read the calendar, so a pass is not kept across a day. */
  it("stands for an hour, on the tree it names", () => {
    const now = 1_800_000_000_000;
    const record = withPasses(null, "tree-a", ["test"], now);

    assert.equal(passAge(record, "tree-a", "test", now + 5 * 60_000), 5 * 60_000);
    assert.equal(passAge(record, "tree-a", "test", now + REUSE_WINDOW_MS + 1), null, "past the window");
    assert.equal(passAge(record, "tree-a", "test", now - 1), null, "a pass dated in the future is a clock that moved");
    assert.equal(passAge(record, "tree-b", "test", now), null, "another tree");
    assert.equal(passAge(record, "tree-a", "lint", now), null, "a task that never passed here");
    assert.equal(passAge(null, "tree-a", "test", now), null);

    const moved = withPasses(record, "tree-b", ["lint"], now);
    assert.deepEqual(moved.passes, { lint: now }, "a record for another tree is dropped, not merged");
    assert.deepEqual(withPasses(record, "tree-a", ["lint"], now + 1).passes, { test: now, lint: now + 1 });
  });
});
