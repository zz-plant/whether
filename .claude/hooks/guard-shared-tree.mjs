#!/usr/bin/env node
/**
 * PreToolUse guard for Bash commands that have destroyed uncommitted work in this repo.
 *
 * Several agent sessions share one checkout and one stash stack, so two commands that are
 * harmless in a private clone discard other people's work here:
 *
 * - A bare `git stash` (or `pop`, `clear`, an unnamed `push`/`save`) moves every session's
 *   uncommitted edits into one entry, and a later `pop` can hand back another session's entry.
 *   On 2026-08-14 a stash taken to test a failure mixed two sessions' changes and "proved" the
 *   wrong cause. A named `git stash push -m <tag>` with `apply <sha>` stays allowed.
 * - `WORKERS_CI=1` tells the deploy gate it runs in a Workers Builds container, where it
 *   `git reset --hard`s every drifted tracked file. A local rehearsal erased 37 files on 2026-11-03.
 *
 * Reads the hook payload on stdin; exit 2 blocks the call and shows stderr to the agent.
 * Lessons: docs/agents/lessons/toolchain-and-gates.md ("Shared checkout guard").
 */
import { readFileSync } from "node:fs";

const SAFE_STASH_SUBCOMMANDS = new Set(["list", "show", "apply", "drop", "branch", "create", "store"]);

/** Returns the reason a command must not run, or null. */
export const blockReason = (command) => {
  if (typeof command !== "string" || command.length === 0) return null;

  if (/(^|[\s;&|(`])(?:export\s+)?WORKERS_CI=["']?1(?![\w])/.test(command)) {
    return [
      "Blocked: WORKERS_CI=1 makes the deploy gate `git reset --hard` every drifted tracked file,",
      "which discards uncommitted work (yours and any other session's in this checkout).",
      "Run `bun run check:vinext` without it, or commit first if you must rehearse the container.",
    ].join("\n");
  }

  // `git [-C dir] stash [rest]`, up to the next command separator.
  const stashPattern = /\bgit\s+(?:-C\s+\S+\s+)?stash\b([^;&|\n]*)/g;
  for (const match of command.matchAll(stashPattern)) {
    const args = match[1].trim().split(/\s+/).filter(Boolean);
    const subcommand = args[0] && !args[0].startsWith("-") ? args[0] : "push";
    if (SAFE_STASH_SUBCOMMANDS.has(subcommand)) continue;
    const named = args.some((arg) => arg === "-m" || arg.startsWith("--message") || /^-[a-zA-Z]*m$/.test(arg));
    if ((subcommand === "push" || subcommand === "save") && named) continue;
    return [
      `Blocked: \`git stash${args.length ? ` ${args.join(" ")}` : ""}\` in a checkout other sessions share.`,
      "A bare stash takes their uncommitted work too, and `pop` can restore someone else's entry.",
      "To set work aside, make a WIP commit. If you must stash: `git stash push -u -m <unique-tag>`,",
      "note its SHA from `git stash list --format='%H %gs'`, restore with `git stash apply <sha>`.",
      "To check whether a failure predates your change, read `git diff HEAD -- <file>` instead.",
    ].join("\n");
  }
  return null;
};

const main = () => {
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return 0; // Not a payload this guard understands; never block on its own failure.
  }
  if (payload?.tool_name !== "Bash") return 0;
  const reason = blockReason(payload?.tool_input?.command);
  if (!reason) return 0;
  process.stderr.write(`${reason}\n`);
  return 2;
};

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main());
