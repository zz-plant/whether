import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { codexSkillsDrift } from "../scripts/sync-codex-skills.mjs";

/*
 * `.claude/skills/` is canonical and `.codex/skills/` is generated from it plus the
 * explicit per-runtime overlay in `.codex/skills-overlay/`. The two used to be hand-kept
 * copies, and by 2026-10-06 they had drifted: two skills on one side only, three files
 * differing, and the agent helpers reading the side missing the newest skills.
 */
const REPO_ROOT = process.cwd();
const roots: string[] = [];

const scaffold = (files: Record<string, string>) => {
  const root = mkdtempSync(join(tmpdir(), "skills-mirror-"));
  roots.push(root);
  for (const [path, source] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), source);
  }
  return root;
};

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const canonicalSkills = () =>
  readdirSync(join(REPO_ROOT, ".claude/skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(REPO_ROOT, ".claude/skills", entry.name, "SKILL.md")))
    .map((entry) => entry.name)
    .sort();

describe("Codex skills mirror", () => {
  it("is exactly what `bun run skills:sync` writes", () => {
    assert.deepEqual(
      codexSkillsDrift(REPO_ROOT),
      { missing: [], changed: [], extra: [] },
      ".codex/skills has drifted from .claude/skills plus .codex/skills-overlay: run `bun run skills:sync`, " +
        "and put a file that must differ for Codex in the overlay rather than editing the mirror",
    );
  });

  it("names every drift: a missing skill, an edited file, and one the canonical tree does not have", () => {
    const root = scaffold({
      ".claude/skills/a/SKILL.md": "a",
      ".claude/skills/b/SKILL.md": "b",
      ".codex/skills-overlay/codex-only/SKILL.md": "codex",
      ".codex/skills/a/SKILL.md": "edited by hand",
      ".codex/skills/codex-only/SKILL.md": "codex",
      ".codex/skills/stale/SKILL.md": "removed upstream",
    });

    assert.deepEqual(codexSkillsDrift(root), {
      missing: ["b/SKILL.md"],
      changed: ["a/SKILL.md"],
      extra: ["stale/SKILL.md"],
    });
  });

  it("refuses to judge from an empty canonical tree rather than calling every Codex skill extra", () => {
    const root = scaffold({ ".codex/skills/a/SKILL.md": "a" });
    assert.throws(() => codexSkillsDrift(root), /no skills found/);
  });

  it("keeps an overlay file only where Codex genuinely needs something else", () => {
    const overlay = join(REPO_ROOT, ".codex/skills-overlay");
    for (const skill of readdirSync(overlay)) {
      const canonical = join(REPO_ROOT, ".claude/skills", skill, "SKILL.md");
      if (!existsSync(canonical)) continue; // a Codex-only skill
      assert.notEqual(
        readFileSync(join(overlay, skill, "SKILL.md"), "utf8"),
        readFileSync(canonical, "utf8"),
        `${skill} in the overlay is identical to the canonical file; delete the overlay copy`,
      );
    }
  });

  it("lists every canonical skill in the index", () => {
    const index = readFileSync(join(REPO_ROOT, ".claude/skills/README.md"), "utf8");
    const mapped = new Set([...index.matchAll(/^\| `([a-z0-9-]+)` \|/gm)].map((match) => match[1]));

    for (const skill of canonicalSkills()) {
      assert.ok(mapped.has(skill), `.claude/skills/README.md has no skill-map row for ${skill}`);
    }
    assert.ok(mapped.has("whether-ui-loop") && mapped.has("whether-ui-standards"));
  });
});
