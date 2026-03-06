# Developer docs

Public integration docs for Whether without requiring Mintlify.

## Start here

Choose the path that matches your immediate outcome:

1. **Ship first decision artifact fast** → `quickstart.md`
   - Pull a weekly brief payload in minutes.
   - Verify freshness and cadence alignment before sharing.
2. **Implement against stable endpoint contracts** → `api-reference.md`
   - Endpoint catalog, request/response conventions, and taxonomy rules.
3. **Run production delivery workflows** → `integrations.md`
   - Agent pull loops, alert delivery patterns, and reliability checks.

## Intended audience

- Platform engineers integrating Whether into internal tools.
- AI/agent developers needing machine-readable summaries + provenance.
- Ops teams wiring alerts into Slack/email/webhook workflows.

## Source of truth boundaries

These docs are for **external integration behavior**.

For contributor workflow, implementation policy, and repo guardrails, use:
- `../development-playbook.md`
- `../agents/README.md`

## Integration success checklist

A robust integration should preserve:
- **Decision transmission:** capture posture + what changed, not just raw macro data.
- **Traceability:** keep `generatedAt`, `recordDateLabel`, `version`, and provenance fields.
- **Operational safety:** block sends when `/api/health` is degraded/down or cadence is misaligned.
