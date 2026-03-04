## Summary
- 

## Review hotspot checklist (required)
- [ ] **Type safety**: no unsafe assertions (`as SomeType`) where runtime validation is possible; null/undefined states handled.
- [ ] **Edge cases**: empty, missing, and fallback paths are explicitly tested or documented.
- [ ] **Separation of concerns**: data fetching/derivation/UI responsibilities are split when a component grows beyond one concern.
- [ ] **Duplication**: constants, threshold logic, and derived helpers are centralized (avoid copy/paste logic).
- [ ] **Readability**: variable names and copy are explicit; abbreviations/magic numbers are explained.

## Compatibility evidence (required for stack/dependency upgrades)
- Release notes or changelogs reviewed:
  - 
- Cloudflare compatibility evidence (`@cloudflare/next-on-pages`, runtime/build notes):
  - 
- Validation command outputs (paste or link):
  - `bun run lint`:
  - `bun run typecheck`:
  - `bun test`:
  - `bun run build:pages`:

## Risk and rollback
- Expected risk areas:
  - 
- Rollback trigger:
  - 
- Rollback steps:
  - 
