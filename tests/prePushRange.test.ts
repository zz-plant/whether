import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "bun:test";

import { parsePrePushRange, resolvePushBase } from "../scripts/pre-push-range.mjs";

/*
 * The pre-push hook judges the review preflight on what the push actually sends: the
 * remote sha as base and the local sha as head, from the plan git writes to the hook's
 * stdin. The head matters because the pushed ref need not be the one checked out.
 */
describe("parsePrePushRange", () => {
  const MAIN_UPDATE = "refs/heads/main 1111111111111111111111111111111111111111 refs/heads/main 2222222222222222222222222222222222222222\n";

  it("returns the pushed range from a branch update line", () => {
    assert.deepEqual(parsePrePushRange(MAIN_UPDATE), {
      base: "2222222222222222222222222222222222222222",
      head: "1111111111111111111111111111111111111111",
      remoteRef: "refs/heads/main",
    });
  });

  it("skips deletions and reads the first real update", () => {
    const text =
      "refs/heads/gone 0000000000000000000000000000000000000000 refs/heads/gone 3333333333333333333333333333333333333333\n" +
      MAIN_UPDATE;

    assert.equal(parsePrePushRange(text)?.head, "1111111111111111111111111111111111111111");
  });

  it("skips new branches, which have no remote state to review against", () => {
    const text =
      "refs/heads/new 1111111111111111111111111111111111111111 refs/heads/new 0000000000000000000000000000000000000000\n" +
      MAIN_UPDATE;

    assert.equal(parsePrePushRange(text)?.base, "2222222222222222222222222222222222222222");
  });

  it("returns null when nothing qualifies, so the hook keeps its default base", () => {
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

/*
 * The base a push is judged against. A push that brings main into a branch sends main's
 * commits too, so the remote tip would blame the branch for them: the push of merge 294cbe72
 * on 2026-10-27 was judged on 530 files and could only go out with SKIP_PREPUSH=1.
 */
describe("resolvePushBase", () => {
  const REMOTE = "2222222222222222222222222222222222222222";
  const MERGE_BASE = "3333333333333333333333333333333333333333";
  const BRANCH = "refs/heads/feature";

  it("keeps the remote tip when the push adds only the branch's own commits", () => {
    assert.equal(
      resolvePushBase({ remoteSha: REMOTE, remoteRef: BRANCH, mergeBase: MERGE_BASE, remoteHasMergeBase: true }),
      REMOTE,
    );
  });

  it("moves to the merge-base when the remote tip does not hold it", () => {
    assert.equal(
      resolvePushBase({ remoteSha: REMOTE, remoteRef: BRANCH, mergeBase: MERGE_BASE, remoteHasMergeBase: false }),
      MERGE_BASE,
    );
  });

  it("keeps the remote tip when there is no main to compare with", () => {
    assert.equal(resolvePushBase({ remoteSha: REMOTE, remoteRef: BRANCH, mergeBase: "", remoteHasMergeBase: false }), REMOTE);
  });

  it("judges a push to main on what it sends, whatever the merge-base says", () => {
    assert.equal(
      resolvePushBase({ remoteSha: REMOTE, remoteRef: "refs/heads/main", mergeBase: MERGE_BASE, remoteHasMergeBase: false }),
      REMOTE,
    );
  });
});

/*
 * The range script and the preflight together, in a real repository, the way the hook runs
 * them. `main` gains a risky file and an assertion the branch never wrote. Only the cases
 * about a verdict run the preflight, since each one loads the parser.
 */
describe("a push judged end to end", () => {
  const ROOT = process.cwd();
  const RANGE_SCRIPT = join(ROOT, "scripts", "pre-push-range.mjs");
  const PREFLIGHT = join(ROOT, "scripts", "review-hotspot-preflight.mjs");
  const FEATURE = "refs/heads/feature";

  /* Git hands a hook GIT_DIR and friends, and every git below would run against the
     pushing repository instead of this scaffold (docs/agents/toolchain.md, the pre-push hook). */
  const gitFreeEnv = () => {
    const env = { ...process.env };
    for (const key of Object.keys(env)) {
      if (key.startsWith("GIT_") || key.startsWith("REVIEW_HOTSPOT_")) delete env[key];
    }
    return env;
  };

  const scaffold = () => {
    const repository = mkdtempSync(join(tmpdir(), "pre-push-range-"));
    const env = gitFreeEnv();
    const git = (...args: string[]) => {
      const run = spawnSync("git", args, { cwd: repository, encoding: "utf8", env });
      assert.equal(run.status, 0, `git ${args.join(" ")}: ${run.stderr}`);
      return run.stdout.trim();
    };
    const write = (file: string, text: string) => {
      mkdirSync(dirname(join(repository, file)), { recursive: true });
      writeFileSync(join(repository, file), text);
    };
    const commit = (message: string) => {
      git("add", "-A");
      git("commit", "--quiet", "-m", message);
      return git("rev-parse", "HEAD");
    };

    git("init", "--quiet", "-b", "main");
    git("config", "user.email", "test@example.com");
    git("config", "user.name", "test");
    write("shared.ts", "export const shared = 1;\n");
    commit("root");

    git("checkout", "--quiet", "-b", "feature");
    write("branch.ts", "export const own = 1;\n");
    const remoteTip = commit("the branch's first commit, already on the remote");

    // What main does while the branch is away, on main's own lines.
    git("checkout", "--quiet", "main");
    write("lib/regimeScore.ts", "export const score = input as number;\n");
    write("section.tsx", "export const a = <div>{/* Two questions, named as two */}</div>;\n");
    const mainTip = commit("main moves on");
    git("update-ref", "refs/remotes/origin/main", mainTip);
    git("checkout", "--quiet", "feature");

    // What the hook does with a plan: the range script, then the preflight on its answer.
    const baseFor = (localSha: string, remoteSha: string, remoteRef = FEATURE) => {
      const plan = `refs/heads/local ${localSha} ${remoteRef} ${remoteSha}\n`;
      const range = spawnSync(process.execPath, [RANGE_SCRIPT], { cwd: repository, encoding: "utf8", env, input: plan });
      assert.equal(range.status, 0, range.stderr);
      const [base = "", head = ""] = range.stdout.trim().split(" ");
      assert.equal(head, localSha);
      return base;
    };
    const judge = (localSha: string, remoteSha: string, remoteRef = FEATURE) => {
      const base = baseFor(localSha, remoteSha, remoteRef);
      const run = spawnSync(process.execPath, [PREFLIGHT], {
        cwd: repository,
        encoding: "utf8",
        env: { ...env, REVIEW_HOTSPOT_BASE: base, REVIEW_HOTSPOT_HEAD: localSha },
      });
      return { base, status: run.status, output: `${run.stdout}${run.stderr}` };
    };

    const cleanup = () => rmSync(repository, { recursive: true, force: true });
    return { repository, env, git, write, commit, baseFor, judge, remoteTip, mainTip, cleanup };
  };

  it("does not blame a branch for what a merge from main brings", () => {
    const { git, judge, remoteTip, mainTip, cleanup } = scaffold();
    try {
      git("merge", "--quiet", "--no-edit", "main");
      const { base, status, output } = judge(git("rev-parse", "HEAD"), remoteTip);

      assert.equal(status, 0, output);
      assert.equal(base, mainTip, "the merge-base, not the remote tip");
      assert.match(output, /Risk-tagged source files: 0/);
      assert.match(output, /Unsafe assertion additions: 0/);
      assert.ok(!output.includes("regimeScore"), output);
    } finally {
      cleanup();
    }
  });

  it("still catches what the branch adds alongside the merge", () => {
    const { git, write, commit, judge, remoteTip, cleanup } = scaffold();
    try {
      git("merge", "--quiet", "--no-edit", "main");
      write("branch.ts", "export const own = input as number;\n");
      write("note.tsx", 'export const a = <p title="read as two">{/* named as two */}shown as two</p>;\n');
      const { status, output } = judge(commit("the branch's own assertion, and prose"), remoteTip);

      assert.equal(status, 1, output);
      assert.match(output, /Unsafe assertion additions: 1/);
      assert.ok(output.includes("branch.ts: export const own = input as number;"), output);
      assert.ok(!output.includes("regimeScore"), output);
    } finally {
      cleanup();
    }
  });

  it("catches an assertion written while resolving the merge's conflict", () => {
    const { repository, env, git, write, commit, judge, cleanup } = scaffold();
    try {
      write("shared.ts", "export const shared = 2;\n");
      const pushed = commit("the branch changes a shared line");
      git("checkout", "--quiet", "main");
      write("shared.ts", "export const shared = 3;\n");
      git("update-ref", "refs/remotes/origin/main", commit("main changes the same line"));
      git("checkout", "--quiet", "feature");
      const conflicted = spawnSync("git", ["merge", "--no-edit", "main"], { cwd: repository, encoding: "utf8", env });
      assert.notEqual(conflicted.status, 0, "the merge conflicts");
      write("shared.ts", "export const shared = input as number;\n");
      const { status, output } = judge(commit("resolve it with an assertion"), pushed);

      assert.equal(status, 1, output);
      assert.ok(output.includes("shared.ts: export const shared = input as number;"), output);
    } finally {
      cleanup();
    }
  });

  it("moves to the merge-base after a rebase onto main", () => {
    const { git, baseFor, remoteTip, mainTip, cleanup } = scaffold();
    try {
      git("rebase", "--quiet", "main");

      assert.equal(baseFor(git("rev-parse", "HEAD"), remoteTip), mainTip);
    } finally {
      cleanup();
    }
  });

  it("compares a branch brought level with main against main, so nothing is new", () => {
    const { baseFor, remoteTip, mainTip, cleanup } = scaffold();
    try {
      assert.equal(baseFor(mainTip, remoteTip), mainTip);
    } finally {
      cleanup();
    }
  });

  it("keeps the remote tip on a plain push, so the branch's earlier commits are not judged again", () => {
    const { write, commit, baseFor, cleanup } = scaffold();
    try {
      write("branch.ts", "export const own = input as number;\n");
      const remote = commit("an assertion the remote already has");
      write("other.ts", "export const other = 1;\n");

      assert.equal(baseFor(commit("a clean commit"), remote), remote);
    } finally {
      cleanup();
    }
  });

  it("falls back to the merge-base for a remote tip this repository has never fetched", () => {
    const { git, baseFor, cleanup } = scaffold();
    try {
      const mergeBase = git("merge-base", "HEAD", "origin/main");

      assert.equal(baseFor(git("rev-parse", "HEAD"), "abcdefabcdefabcdefabcdefabcdefabcdefabcd"), mergeBase);
    } finally {
      cleanup();
    }
  });

  it("judges a push to main on everything it sends", () => {
    const { git, write, commit, judge, mainTip, cleanup } = scaffold();
    try {
      git("checkout", "--quiet", "main");
      write("direct.ts", "export const direct = input as number;\n");
      const { base, status, output } = judge(commit("a commit straight onto main"), mainTip, "refs/heads/main");

      assert.equal(base, mainTip);
      assert.equal(status, 1, output);
      assert.ok(output.includes("direct.ts: export const direct = input as number;"), output);
    } finally {
      cleanup();
    }
  });

  /* The hook itself, with the two scripts it runs: the real range script, and a stand-in for
     the gate that records what it was handed. Git exports GIT_DIR to a hook, so this runs
     with GIT_DIR aimed at this repository: without the hook's `unset`, the range script's
     merge-base would read the wrong history and the scaffold's shas would not resolve. */
  it("clears git's environment before the hook asks for the range", () => {
    const { repository, env, git, write, remoteTip, mainTip, cleanup } = scaffold();
    try {
      git("merge", "--quiet", "--no-edit", "main");
      const head = git("rev-parse", "HEAD");
      write(".husky/pre-push", readFileSync(join(ROOT, ".husky", "pre-push"), "utf8"));
      write("scripts/pre-push-range.mjs", readFileSync(RANGE_SCRIPT, "utf8"));
      write(
        "scripts/run-checks.mjs",
        'import { writeFileSync } from "node:fs";\n' +
          'const { GIT_DIR, GIT_INDEX_FILE, REVIEW_HOTSPOT_BASE, REVIEW_HOTSPOT_HEAD } = process.env;\n' +
          'writeFileSync("gate-env.json", JSON.stringify({ GIT_DIR, GIT_INDEX_FILE, REVIEW_HOTSPOT_BASE, REVIEW_HOTSPOT_HEAD, args: process.argv.slice(2) }));\n',
      );

      const run = spawnSync("sh", [".husky/pre-push"], {
        cwd: repository,
        encoding: "utf8",
        env: { ...env, GIT_DIR: join(ROOT, ".git"), GIT_INDEX_FILE: join(ROOT, ".git", "index") },
        input: `refs/heads/feature ${head} ${FEATURE} ${remoteTip}\n`,
      });
      assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);

      assert.deepEqual(JSON.parse(readFileSync(join(repository, "gate-env.json"), "utf8")), {
        REVIEW_HOTSPOT_BASE: mainTip,
        REVIEW_HOTSPOT_HEAD: head,
        args: ["--preset", "pre-push"],
      });
    } finally {
      cleanup();
    }
  });
});
