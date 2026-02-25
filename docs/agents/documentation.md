# Documentation expectations

## Audience split (source of truth)
- `README.md` — product framing and local development quickstart.
- `CONTRIBUTING.md` — human contributor workflow and standards.
- `AGENTS.md` + `docs/agents/*` — AI/agent operating instructions.
- `docs/README.md` — canonical documentation map.

## When documentation updates are required
Update docs in the same change when you modify:
- behavior, interfaces, or user workflows
- contributor workflows/commands
- source-of-truth ownership locations

Also ensure:
- new docs are linked from `docs/README.md`
- command changes are reflected in setup-oriented docs
- major contributor-policy updates are mirrored in `CONTRIBUTING.md` or `AGENTS.md`

## Writing style guidelines
- Keep sections short, scannable, and command-first.
- Prefer canonical references instead of duplicating long instructions.
- Document assumptions/tradeoffs when they affect future implementation decisions.
- Favor durable wording over date-specific operational notes unless time-bound context is essential.

## Documentation QA checklist
- [ ] Commands match `package.json` scripts.
- [ ] Links resolve to existing files.
- [ ] Terminology is consistent across contributor and agent docs.
- [ ] Scope boundaries are clear (human vs agent guidance).
