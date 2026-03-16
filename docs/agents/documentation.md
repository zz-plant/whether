# Documentation expectations

Useful docs in this repo should reduce implementation ambiguity, not create more reading.

## Source-of-truth ownership

- `README.md` — repo-level framing, quickstart, and high-signal entry points
- `CONTRIBUTING.md` — human contributor workflow and review standards
- `AGENTS.md` + `docs/agents/*` — AI/agent operating instructions and workflow rules
- `docs/README.md` — canonical documentation map
- `docs/developer/*` — external integration behavior and endpoint usage
- product/spec docs in `docs/` — shipped behavior or approved directional plans, depending on document type

## Document lifecycle

Treat docs as one of four types:

- `Canonical`: defines current behavior or workflow
- `Working`: active proposal, plan, or prioritization artifact
- `Evidence`: audits, generated logs, research snapshots, and supporting material
- `Historical`: retained context that should not be treated as implementation truth

When editing or creating docs:
- prefer updating an existing canonical doc over adding a new one
- keep working docs clearly separate from canonical behavior
- move generated evidence into `docs/evidence/` or `docs/research/` instead of mixing it into contributor guides

## When docs must change in the same PR

Update documentation when you modify:

- user-visible behavior or workflow
- contributor workflows, commands, or quality gates
- route meaning, IA, or navigation expectations
- shared semantics such as posture labels, trust states, or bounded-decision language
- source-of-truth ownership or where readers should go first

Also ensure:

- new active docs are linked from `docs/README.md`
- setup or command changes are reflected in setup-oriented docs
- agent-workflow changes are mirrored in `AGENTS.md` or `docs/agents/*`
- developer-facing contract changes are reflected in `docs/developer/*`

## What makes a doc useful here

- It helps the reader decide what to do next quickly.
- It points to the canonical file instead of duplicating large instructions.
- It names assumptions, thresholds, and reversal conditions when they matter.
- It uses repo terms consistently with product semantics.
- It distinguishes current truth from supporting context.

## Anti-patterns

- Near-duplicate docs with slightly different commands or policy language
- Proposal docs presented like shipped behavior
- Long explanations before the reader knows which file or command to use
- Historical notes mixed into setup or implementation instructions
- Linking to a deep doc without updating the relevant entrypoint

## Writing style

- Keep sections short and scannable.
- Lead with outcome or action, then explanation.
- Prefer command-first examples when the reader needs to do something.
- Favor durable wording over date-stamped operational chatter unless the date is essential.
- If a document is broad, add a "read this if..." router near the top.

## Documentation QA checklist

- [ ] Commands match `package.json` scripts.
- [ ] Links resolve to existing files.
- [ ] Terminology matches repo semantics in `AGENTS.md` and product specs.
- [ ] The document type is clear: canonical, working, evidence, or historical.
- [ ] The right entrypoint docs were updated too (`README.md`, `docs/README.md`, `docs/agents/README.md`, or `docs/developer/README.md`).
