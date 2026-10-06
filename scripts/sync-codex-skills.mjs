#!/usr/bin/env node
/**
 * Regenerates `.codex/skills/` from `.claude/skills/` plus `.codex/skills-overlay/`.
 *
 * The repo-local skills exist for two runtimes. Claude Code discovers them only under
 * `.claude/skills/`; Codex only under `.codex/skills/`. They were kept as two hand-edited
 * copies with a README asking for both to be changed together, and by 2026-10-06 they had
 * drifted the usual way: two skills existed only on one side, three files differed, and
 * the agent helpers read the side that was missing the newest skills. So one side is
 * canonical — `.claude/skills/` — and the other is generated.
 *
 * What genuinely differs per runtime is explicit rather than drift: a file in
 * `.codex/skills-overlay/` replaces or adds the file at the same path in the Codex copy.
 * Today that is `system-skill-router` (Codex routes to its built-in skill-installer and
 * skill-creator) and `web-design-guidelines` (Codex only; Claude Code has it from a
 * global plugin).
 *
 * `tests/skillsMirror.test.ts` fails when `.codex/skills/` is not exactly what this
 * writes, so an edit made there by hand is caught rather than silently overwritten later.
 *
 * Usage:
 *   bun run skills:sync                            # rewrite .codex/skills
 *   node scripts/sync-codex-skills.mjs --check     # report drift; exit 1 if any
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { walkFiles } from "./walk-files.mjs";

const CANONICAL = path.join(".claude", "skills");
const OVERLAY = path.join(".codex", "skills-overlay");
const MIRROR = path.join(".codex", "skills");

/** Every file under `directory`, keyed by its `/`-separated path relative to it. */
const readTree = (directory) =>
  new Map(
    walkFiles(directory).map((file) => [path.relative(directory, file).split(path.sep).join("/"), readFileSync(file)]),
  );

/** What `.codex/skills/` should hold: the canonical skills, with the overlay laid over them. */
const expectedCodexSkills = (repoRoot) => {
  const tree = readTree(path.join(repoRoot, CANONICAL));
  if (![...tree.keys()].some((file) => file.endsWith("/SKILL.md"))) {
    // An empty canonical tree means a wrong root or a broken checkout, not "no skills":
    // writing from it would delete every Codex skill.
    throw new Error(`[skills:sync] no skills found under ${path.join(repoRoot, CANONICAL)}; refusing to write.`);
  }
  for (const [file, content] of readTree(path.join(repoRoot, OVERLAY))) tree.set(file, content);
  return tree;
};

/** How `.codex/skills/` differs from what the sync would write. All three empty means in sync. */
export function codexSkillsDrift(repoRoot) {
  const expected = expectedCodexSkills(repoRoot);
  const actual = readTree(path.join(repoRoot, MIRROR));

  const missing = [];
  const changed = [];
  for (const [file, content] of expected) {
    const current = actual.get(file);
    if (!current) missing.push(file);
    else if (!current.equals(content)) changed.push(file);
  }
  const extra = [...actual.keys()].filter((file) => !expected.has(file));

  return { missing: missing.sort(), changed: changed.sort(), extra: extra.sort() };
}

const writeCodexSkills = (repoRoot) => {
  const expected = expectedCodexSkills(repoRoot);
  const mirror = path.join(repoRoot, MIRROR);
  // Rebuilt from nothing, so a skill removed from the canonical tree leaves the mirror too.
  rmSync(mirror, { recursive: true, force: true });
  for (const [file, content] of expected) {
    const target = path.join(mirror, ...file.split("/"));
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  return expected.size;
};

function main() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

  if (process.argv.includes("--check")) {
    const drift = codexSkillsDrift(repoRoot);
    const lines = [
      ...drift.missing.map((file) => `  missing  ${file}`),
      ...drift.changed.map((file) => `  changed  ${file}`),
      ...drift.extra.map((file) => `  extra    ${file}`),
    ];
    if (lines.length === 0) {
      console.log(`[skills:sync] ${MIRROR} matches ${CANONICAL} plus ${OVERLAY}.`);
      return;
    }
    console.error(`[skills:sync] ${MIRROR} has drifted:\n${lines.join("\n")}\nRun \`bun run skills:sync\`.`);
    process.exitCode = 1;
    return;
  }

  const written = writeCodexSkills(repoRoot);
  console.log(`[skills:sync] wrote ${written} file(s) to ${MIRROR} from ${CANONICAL} plus ${OVERLAY}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
