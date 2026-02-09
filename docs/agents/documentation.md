# Documentation expectations

## Audience split (source of truth)
- `README.md` — product framing and local development quick start.
- `CONTRIBUTING.md` — human contributor workflow and standards.
- `AGENTS.md` + `docs/agents/*` — AI/agent operating instructions.
- `docs/README.md` — canonical documentation map.

## When documentation updates are required
- Behavior/interface/workflow changes must update relevant docs in the same change.
- New commands/scripts should be reflected in setup-oriented docs.
- New documents must be linked from `docs/README.md`.
- Significant contributor-policy updates should be mirrored in `CONTRIBUTING.md` or `AGENTS.md`.

## Writing style
- Keep sections short, scannable, and command-first.
- Prefer canonical references over duplicated long-form instructions.
- Document tradeoffs and assumptions when they affect future contributors.
