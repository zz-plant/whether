# Developer docs

Public integration docs for Whether without requiring Mintlify.

## Pick the shortest path to your outcome

### I need my first machine-readable weekly brief

Read `quickstart.md`.

You will:
- pull the weekly artifact
- verify freshness and cadence alignment
- leave with a minimal publish-safe integration flow

### I need endpoint contracts and payload expectations

Read `api-reference.md`.

You will get:
- the outcome-based endpoint map
- request and response conventions
- contract fields that downstream systems should preserve

### I need production delivery or alert workflows

Read `integrations.md`.

You will get:
- recommended pull order
- health and cadence gates
- alert and delivery flow patterns

### I need a fallback path when CLI install or auth is blocked

Read `cli-fallback.md`.

## Intended audience

- platform engineers integrating Whether into internal systems
- AI and agent developers consuming machine-readable brief payloads
- operations teams wiring decision artifacts into Slack, email, or webhook loops

## What a good integration preserves

- **Decision transmission**: keep posture plus what changed, not just raw macro data
- **Traceability**: preserve `generatedAt`, `recordDateLabel`, `version`, `summaryHash`, and provenance fields
- **Operational safety**: block sends when `/api/health` is degraded or cadence alignment is broken
- **Artifact quality**: keep the output shareable and citeable downstream

## Fast contract sanity check

Use this one-liner before wiring any new downstream consumer:

```bash
curl -fsS "http://localhost:3000/api/agent?cadence=weekly" \
  | jq '{generatedAt, recordDateLabel, version, summaryHash, posture: .posture.label}'
```

## Source-of-truth boundaries

These docs cover external integration behavior.

For contributor workflow and repo policy, use:
- `../development-playbook.md`
- `../agents/README.md`

For in-product machine-route discovery, use:
- `/operations` (developer references are linked from the page)

Keep new discovery copy aligned with that surface so endpoint guidance does not fragment across the repo.
