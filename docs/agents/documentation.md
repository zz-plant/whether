# Documentation expectations

## Audience split
- `README.md`: product framing and local development quick start.
- `CONTRIBUTING.md`: human contributor workflow and PR expectations.
- `AGENTS.md` + `docs/agents/*`: AI/agent operating instructions.
- `docs/README.md`: canonical map for repository documentation.

## When docs must be updated
- If behavior or interfaces change, update the nearest source-of-truth doc in the same change.
- If you add a new doc, link it from `docs/README.md`.
- If guidance changes for contributors or agents, update `CONTRIBUTING.md` or `docs/agents/README.md` respectively.

## Style constraints
- Prefer concise, scannable sections and explicit command examples.
- Avoid duplicating full instructions across multiple files; link to canonical docs instead.
