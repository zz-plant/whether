## Summary
- 

## Decision delta (required for product-facing changes)
- **What changed this week for operators?**
  -
- **What decision should tighten or loosen because of this change?**
  -
- **What should be revisited now?**
  -
- **What would flip/reverse this call?**
  -

## Surface + owner (required)
- **Primary surface touched** (`/`, weekly brief model, playbook, export, navigation, build/deploy, etc.):
  -
- **Requested reviewer/owner for this hotspot**:
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
