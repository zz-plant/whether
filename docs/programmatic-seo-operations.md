# Programmatic SEO operations runbook

This runbook codifies the repo-standard sequence for scaling SEO without weakening decision transmission:

1. Expand high-intent decision-answer coverage.
2. Score answer pages before launch with quality gates.
3. Generate fresh payload artifacts and refresh queue weekly.
4. Flag sustained low-conversion pages for merge/prune review.
5. Keep every secondary/programmatic page linked back to the Weekly Brief.

## Commands

```bash
bun run seo:answers:launch-readiness
bun run seo:weekly-runbook
```

## Notes

- `seo:answers:launch-readiness` fails if any answer page cannot pass baseline completeness/trust/uniqueness checks.
- `seo:weekly-runbook` generates payload artifacts and the refresh queue/status artifacts in one command.
- Refresh queue records include `merge-or-prune-candidate` when high-intent pages underperform conversion targets for multiple evaluations.
