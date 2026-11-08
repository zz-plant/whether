import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  addedLinesByFile,
  requiresTestCoverage,
  resolveDiffBase,
  typeAssertionLines,
} from "../scripts/review-hotspot-preflight.mjs";
import { CORE_SURFACES } from "../scripts/agent-workflow.config.mjs";

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

/*
 * The files whose change can move the call. The old filename regex missed most of them:
 * a `decisionKnobs.ts` change reported "Risk-tagged source files: 0" (2026-11-08).
 */
describe("decision surfaces", () => {
  it("flags the canonical decision modules", () => {
    for (const file of [
      "app/page.tsx",
      "app/components/DecisionHero.tsx",
      "lib/report/decisionKnobs.ts",
      "lib/report/homeBriefModel.ts",
      "lib/report/operatingCalls.ts",
      "lib/report/boundedDecisionRules.ts",
      "lib/playbook.ts",
      "lib/thresholds.ts",
      "lib/regimeEngineCore.ts",
      "lib/regimeStateMachine.ts",
    ]) {
      assert.equal(requiresTestCoverage(file), true, `${file} should require test coverage`);
    }
  });

  it("does not flag copy, layout or docs", () => {
    for (const file of [
      "lib/report/reportCopy.ts",
      "app/trust/page.tsx",
      "app/components/TimelineBar.tsx",
      "docs/agents/README.md",
      "tests/homeBriefModel.test.ts",
    ]) {
      assert.equal(requiresTestCoverage(file), false, `${file} should not require test coverage`);
    }
  });

  it("covers every core surface the agent index calls out", () => {
    for (const file of CORE_SURFACES) {
      assert.equal(requiresTestCoverage(file), true, `${file} is a core surface but not a decision surface`);
    }
  });
});

/*
 * The detector reads the syntax tree, so only an assertion can match. A regex over lines
 * flagged the prose "named as two" in a JSX comment on 2026-10-27, and "Download as CSV" in
 * JSX text, while missing `value as "brief"` and `value as [A, B]`.
 */
describe("typeAssertionLines", () => {  const lines = async (source: string, file = "sample.tsx") => [...((await typeAssertionLines(file, source)) ?? [])];

  it("finds a real assertion, whatever the type looks like", async () => {
    assert.deepEqual(await lines("const rows = JSON.parse(raw) as Row[];"), [1]);
    assert.deepEqual(await lines("const value = input as { id: string };"), [1]);
    assert.deepEqual(await lines('const mode = value as "brief" | "strip";'), [1]);
    assert.deepEqual(await lines("const pair = value as [Left, Right];"), [1]);
    assert.deepEqual(await lines("const step = (next - 1) as 0 | 1;"), [1]);
    assert.deepEqual(await lines("const route = path as `/resources/${string}`;"), [1]);
  });

  it("reports a double assertion once, on the line it sits on", async () => {
    assert.deepEqual(await lines("const a = 1;\nconst b = value as unknown as Foo;\n"), [2]);
  });

  it("reads the line of the assertion in a statement that spans several", async () => {
    assert.deepEqual(await lines("const a = compute(\n  value,\n) as Foo;\n"), [3]);
  });

  it("counts lines correctly past characters wider than a byte", async () => {
    assert.deepEqual(await lines("// Em dash — and 🌦 before it\nconst a = '—';\nconst b = value as Foo;\n"), [3]);
  });

  it("allows as const", async () => {
    assert.deepEqual(await lines('const modes = ["auto", "tv"] as const;'), []);
  });

  it("allows import and export aliases, renamed or namespaced", async () => {
    assert.deepEqual(await lines('import { macroSeries as snapshotMacroSeries } from "../lib/macroSnapshot";'), []);
    assert.deepEqual(await lines('import * as nextNavigation from "next/navigation";'), []);
    assert.deepEqual(await lines('import type { Props as SharedProps } from "./types";'), []);
    assert.deepEqual(await lines('export { a as b } from "./a";'), []);
    assert.deepEqual(await lines("import {\n  first as second,\n} from './names';"), []);
  });

  it("ignores prose in comments of every shape", async () => {
    const source = [
      "// this renders as a header",
      "/* one-liner as such */",
      "/**",
      " * Rounds of narrowing returned a clientId as its own.",
      " */",
      "const a = 1; /* trailing note as written",
      "   that runs on as more */",
    ].join("\n");
    assert.deepEqual(await lines(source), []);
  });

  it("ignores the JSX comments that failed a push, as a child and among props", async () => {
    const source = [
      "const page = (",
      "  <Section",
      "    /* a prop comment, named as two */",
      "    title={title}",
      "  >",
      "    {/* Two different questions, named as two */}",
      "    {/* A note that runs on, named as two",
      "       more of it */}",
      "  </Section>",
      ");",
    ].join("\n");
    assert.deepEqual(await lines(source), []);
  });

  it("ignores prose in strings and templates, and reads the code inside a template", async () => {
    assert.deepEqual(await lines('const label = "treats the window as unchanged";'), []);
    assert.deepEqual(await lines("const label = 'treats the window as unchanged';"), []);
    assert.deepEqual(await lines("const label = `treats the window as unchanged`;"), []);
    assert.deepEqual(await lines("const label = `treats ${input as Foo} as unchanged`;"), [1]);
  });

  it("ignores JSX text and the as prop", async () => {
    assert.deepEqual(await lines("const a = <p>You may not present outputs as official guidance</p>;"), []);
    assert.deepEqual(await lines("const a = <Section as={tag} />;"), []);
  });

  it("reads a .ts file in the .ts grammar, where an angle bracket is a generic or a cast", async () => {
    assert.deepEqual(await lines("const a = <Foo>value;\nconst b = value as Foo;\n", "sample.ts"), [2]);
  });

  it("says when it cannot read the file rather than reporting none", async () => {
    assert.equal(await typeAssertionLines("sample.tsx", "const = ;"), null);
  });
});

describe("addedLinesByFile", () => {
  it("reads the new side of each hunk, counted or single-line", () => {
    const diff = [
      "diff --git a/one.ts b/one.ts",
      "--- a/one.ts",
      "+++ b/one.ts",
      "@@ -1,2 +1,3 @@ context",
      "-gone",
      "-gone too",
      "+first",
      "+second",
      "+third",
      "@@ -9 +10 @@",
      "-old",
      "+new",
      "diff --git a/two.ts b/two.ts",
      "--- a/two.ts",
      "+++ b/two.ts",
      "@@ -3 +3,0 @@",
      "-only removed",
    ].join("\n");
    const added = addedLinesByFile(diff);

    assert.deepEqual([...(added.get("one.ts") ?? [])], [1, 2, 3, 10]);
    assert.deepEqual([...(added.get("two.ts") ?? [])], []);
  });

  it("does not read added code as a file header or a hunk", () => {
    const diff = [
      "--- a/one.ts",
      "+++ b/one.ts",
      "@@ -0,0 +1,2 @@",
      "+++ b/other.ts",
      "+@@ -0,0 +50,1 @@",
      "\\ No newline at end of file",
      "--- a/two.ts",
      "+++ b/two.ts",
      "@@ -0,0 +7 @@",
      "+const a = 1;",
    ].join("\n");
    const added = addedLinesByFile(diff);

    assert.deepEqual([...added.keys()], ["one.ts", "two.ts"]);
    assert.deepEqual([...(added.get("one.ts") ?? [])], [1, 2]);
    assert.deepEqual([...(added.get("two.ts") ?? [])], [7]);
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
     pushing repository instead of this scaffold (docs/agents/toolchain.md, the pre-push hook). */
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
