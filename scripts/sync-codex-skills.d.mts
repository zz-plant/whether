/**
 * How `.codex/skills/` under `repoRoot` differs from what `bun run skills:sync` would write
 * (`.claude/skills/` with `.codex/skills-overlay/` laid over it). All three empty means in
 * sync. Throws when the canonical directory holds no skills.
 */
export function codexSkillsDrift(repoRoot: string): { missing: string[]; changed: string[]; extra: string[] };
