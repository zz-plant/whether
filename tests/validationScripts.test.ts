import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { describe, it } from "bun:test";

const root = new URL("../", import.meta.url).pathname;
const temporary = (name: string) => mkdtempSync(join(tmpdir(), `whether-${name}-`));
const cleanGitEnv = () => Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")));
/* Typed to the encoded spawn result the suites use, since `ReturnType<typeof
   spawnSync>` is a union whose Buffer branch can't take a template slot. */
const output = (result: { stdout?: string | null; stderr?: string | null }) => `${result.stdout ?? ""}${result.stderr ?? ""}`;

describe("evidence retrieval smoke command", () => {
  const candidate = (id: string) => ({ id, claim: `Claim ${id}`, excerpt: `Passage ${id}`, observedAt: "2026-10-14", sourceUrl: `https://example.com/${id}` });
  const run = (cases: { id: string; expected: string[]; limit: number; guidance?: string }[]) => {
    const directory = temporary("retrieval-eval");
    try {
      mkdirSync(join(directory, "tests/fixtures"), { recursive: true });
      writeFileSync(join(directory, "tests/fixtures/evidence-retrieval.json"), JSON.stringify({
        description: "Hypothetical smoke-test labels", candidates: [candidate("a"), candidate("b")],
        cases: cases.map((item) => ({ guidance: "Hold hiring", ...item })),
      }));
      // Own the model transport in this child too: this command must never load a real model.
      const preload = join(directory, "fixture-model.ts");
      writeFileSync(preload, `
        globalThis.fetch = async (input, init) => {
          const url = new URL(input.toString());
          if (url.origin !== "http://127.0.0.1:11434") throw new Error("unexpected fixture URL");
          const model = "embeddinggemma-2:740m";
          if (url.pathname === "/api/tags") return Response.json({ models: [{ name: model, digest: "a".repeat(64) }] });
          if (url.pathname !== "/api/embed") throw new Error("unexpected fixture endpoint");
          const body = JSON.parse(init.body);
          if (body.input.some((text) => text.includes("unavailable"))) return new Response("fixture offline", { status: 503 });
          return Response.json({ model, embeddings: body.input.map((text) => text.includes("Claim b") ? [0, 1] : [1, 0]) });
        };
      `);
      const result = spawnSync("bun", ["--preload", preload, join(root, "scripts/evals/evidence-retrieval.ts")], {
        /* Generous caps: the child cold-starts Bun and a dev server on a slow
           build container, while a healthy run finishes in well under a second. */
        cwd: directory, encoding: "utf8", env: { ...process.env, OLLAMA_HOST: "http://127.0.0.1:11434" }, timeout: 20_000,
      });
      const report = JSON.parse(readFileSync(join(directory, "artifacts/evidence-retrieval/evaluation.json"), "utf8"));
      return { result, report };
    } finally { rmSync(directory, { recursive: true, force: true }); }
  };

  it("fails incomplete labeled recall after saving every case and its full diagnostics", () => {
    const { result, report } = run([
      { id: "partial", expected: ["a", "b"], limit: 1 },
      { id: "miss", expected: ["b"], limit: 1 },
      { id: "complete", expected: ["a"], limit: 1 },
    ]);
    assert.deepEqual(report.cases.map((item: { recallAtK: number }) => item.recallAtK), [0.5, 0, 1]);
    assert.equal(report.cases[2].result.retrieval.ranking[0].id, "a", "later cases still run after a miss");
    assert.equal(report.cases[0].result.candidates[0].excerpt, "Passage a");
    assert.equal(result.status, 1, output(result));
  });

  it("succeeds only when every expected passage is retrieved", () => {
    const { result, report } = run([{ id: "complete", expected: ["a", "b"], limit: 2 }]);
    assert.equal(report.cases[0].recallAtK, 1);
    assert.equal(result.status, 0, output(result));
  });

  it("keeps failure diagnostics when retrieval itself is unavailable", () => {
    const { result, report } = run([{ id: "offline", expected: ["a"], limit: 1, guidance: "unavailable" }]);
    assert.equal(report.cases[0].recallAtK, null);
    assert.match(report.cases[0].error, /503.*fixture offline/);
    assert.equal(result.status, 1, output(result));
  });
});

describe("required brand asset types", () => {
  const run = (missing?: string) => {
    const directory = temporary("asset-check");
    try {
      mkdirSync(join(directory, "scripts"));
      mkdirSync(join(directory, "docs/assets"), { recursive: true });
      copyFileSync(join(root, "scripts/check-assets.ts"), join(directory, "scripts/check-assets.ts"));
      for (const name of readdirSync(join(root, "docs/assets"))) {
        if ((name.endsWith(".png") || name === "source.svg") && name !== missing) {
          copyFileSync(join(root, "docs/assets", name), join(directory, "docs/assets", name));
        }
      }
      return spawnSync("bun", ["scripts/check-assets.ts"], { cwd: directory, encoding: "utf8", timeout: 20_000 });
    } finally { rmSync(directory, { recursive: true, force: true }); }
  };

  it("fails a missing required type even when every remaining PNG is valid", () => {
    const result = run("whether-badge.png");
    assert.equal(result.status, 1, output(result));
    assert.match(output(result), /Missing types: badge/);
    assert.doesNotMatch(output(result), /All assets valid/);
  });

  it("accepts the complete brand kit", () => {
    const result = run();
    assert.equal(result.status, 0, output(result));
    assert.match(output(result), /All assets valid/);
  });
});

describe("dependency prepare", () => {
  const prepare: string = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts.prepare;
  /* NODE_ENV is set explicitly: Next's global types require it on ProcessEnv,
     and a spread of process.env loses the literal's narrow type. */
  const env = { NODE_ENV: "test" as const, ...cleanGitEnv(), PATH: `${join(root, "node_modules/.bin")}${delimiter}${process.env.PATH ?? ""}` };
  const run = (cwd: string) => spawnSync("sh", ["-c", prepare], { cwd, env, encoding: "utf8", timeout: 20_000 });

  it("succeeds in a source archive with no Git metadata", () => {
    const directory = temporary("prepare-archive");
    try {
      const result = run(directory);
      assert.equal(result.status, 0, output(result));
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });

  it("configures tracked hooks in a linked worktree whose .git is a file", () => {
    const directory = temporary("prepare-worktree");
    const repository = join(directory, "repository");
    const worktree = join(directory, "linked");
    mkdirSync(repository);
    const git = (cwd: string, ...args: string[]) => {
      const result = spawnSync("git", args, { cwd, env, encoding: "utf8" });
      assert.equal(result.status, 0, output(result));
      return result.stdout.trim();
    };
    try {
      git(repository, "init", "--quiet");
      git(repository, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "-c", "commit.gpgsign=false", "commit", "--allow-empty", "--quiet", "-m", "fixture");
      git(repository, "worktree", "add", "--quiet", "--detach", worktree);
      assert.match(readFileSync(join(worktree, ".git"), "utf8"), /^gitdir:/);
      const result = run(worktree);
      assert.equal(result.status, 0, output(result));
      assert.equal(git(worktree, "config", "core.hooksPath"), ".husky");
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});

describe("remote session history fetch", () => {
  const run = (mode: "failure" | "stall") => {
    const directory = temporary("session-fetch");
    const bin = join(directory, "bin");
    const log = join(directory, "commands.log");
    mkdirSync(bin);
    writeFileSync(join(bin, "git"), `#!/usr/bin/env bash
      if [ "$1" = rev-parse ]; then echo true; exit 0; fi
      if [ "$1" != fetch ]; then exit 2; fi
      printf 'prompt:%s\\n' "\${GIT_TERMINAL_PROMPT:-unset}" >> "$SCRIPT_TEST_LOG"
      if [ "$SCRIPT_TEST_FETCH_MODE" = stall ]; then
        trap '' TERM
        exec /bin/sleep 3 >/dev/null 2>&1
      fi
      exit 1
    `, { mode: 0o755 });
    writeFileSync(join(bin, "bun"), `#!/usr/bin/env bash
      printf 'bun:%s\\n' "$*" >> "$SCRIPT_TEST_LOG"
    `, { mode: 0o755 });
    // Speed up the real watchdog while checking the production deadline is short.
    writeFileSync(join(bin, "sleep"), `#!/usr/bin/env bash
      printf 'watchdog:%s\\n' "$1" >> "$SCRIPT_TEST_LOG"
      exec /bin/sleep 0.02
    `, { mode: 0o755 });
    try {
      const result = spawnSync("bash", [join(root, ".claude/hooks/session-start.sh")], {
        cwd: directory, encoding: "utf8", timeout: 15_000,
        env: {
          NODE_ENV: "test" as const, ...cleanGitEnv(), CLAUDE_CODE_REMOTE: "true", CLAUDE_PROJECT_DIR: directory,
          PATH: `${bin}${delimiter}${process.env.PATH ?? ""}`, SCRIPT_TEST_LOG: log, SCRIPT_TEST_FETCH_MODE: mode,
        },
      });
      return { result, log: readFileSync(log, "utf8") };
    } finally { rmSync(directory, { recursive: true, force: true }); }
  };

  it("disables terminal credential prompts and installs after an offline fetch", () => {
    const { result, log } = run("failure");
    assert.equal(result.status, 0, output(result));
    assert.match(log, /prompt:0/);
    assert.match(log, /bun:install/);
  });

  it("terminates a stalled fetch and still installs dependencies", () => {
    const { result, log } = run("stall");
    assert.equal(result.status, 0, output(result));
    assert.match(log, /watchdog:10\n/, "the fetch has a ten-second portable deadline");
    assert.match(log, /bun:install/);
    assert.match(output(result), /unshallow skipped/);
  });
});
