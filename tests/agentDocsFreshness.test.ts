import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkAgentDocs } from "../scripts/check-agent-docs.mjs";

const write = (root: string, file: string, content: string) => {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), content);
};

describe("agent docs freshness", () => {
  it("holds this repo's agent docs to the scripts and files they name", () => {
    const result = checkAgentDocs({ repoRoot: process.cwd() });
    assert.deepEqual(result.failures, []);
    assert.ok(result.checked >= 10);
  });

  it("names a missing script, a broken link and an unindexed guide", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "whether-agent-docs-"));

    try {
      write(root, "package.json", JSON.stringify({ scripts: { test: "bun test" } }));
      write(root, "AGENTS.md", "Run `bun run missing` and read [gone](docs/gone.md).\n");
      write(root, "docs/agents/README.md", "# Guides\n");
      write(root, "docs/agents/orphan.md", "# Orphan\n");

      const { failures } = checkAgentDocs({ repoRoot: root });

      assert.ok(failures.some((failure) => failure.includes("missing package script: bun run missing")));
      assert.ok(failures.some((failure) => failure.includes("links a missing file: docs/gone.md")));
      assert.ok(failures.some((failure) => failure.includes("does not name the guide docs/agents/orphan.md")));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("accepts a guide named in backticks in the index", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "whether-agent-docs-"));

    try {
      write(root, "package.json", JSON.stringify({ scripts: {} }));
      write(root, "docs/agents/README.md", "# Guides\n\n- `orphan.md` — a guide\n");
      write(root, "docs/agents/orphan.md", "# Orphan\n");

      assert.deepEqual(checkAgentDocs({ repoRoot: root }).failures, []);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails a long guide with no section index, and passes one that has it", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "whether-agent-docs-"));

    try {
      write(root, "package.json", JSON.stringify({ scripts: {} }));
      write(root, "docs/agents/README.md", "# Guides\n\n- `long.md` — a guide\n");
      write(root, "docs/agents/long.md", `# Long\n\n${"word ".repeat(12_000)}\n`);

      const failures = checkAgentDocs({ repoRoot: root }).failures;
      assert.ok(failures.some((failure) => failure.includes("no section index")));

      write(root, "docs/agents/long.md", `# Long\n\n## Read the section you need\n\n${"word ".repeat(12_000)}\n`);
      assert.deepEqual(checkAgentDocs({ repoRoot: root }).failures, []);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
