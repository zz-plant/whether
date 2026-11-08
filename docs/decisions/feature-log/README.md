# Feature log (as built)

The dated record behind the product. This is a decision log, not a short current-state
spec: 187 entries, 143 of them under product surfaces. Do not read it end to end. Find the
entry for the surface you are changing:

```bash
rg -n '^### ' docs/decisions/feature-log/ | rg -i 'share|export'
```

Read that entry (usually 20–60 lines). The canonical behavior is the code and its tests;
this log records why it changed and what was ruled out. For the short index by surface, see
[../../feature-specs-current.md](../../feature-specs-current.md).

## Sections

| Section | File | Lines |
| --- | --- | --- |
| 1) Product surfaces (UI routes) | [01-product-surfaces.md](01-product-surfaces.md) | 4870 |
| 2) Data sourcing & provenance | [02-data-sourcing-and-provenance.md](02-data-sourcing-and-provenance.md) | 51 |
| 3) Regime engine & scoring | [03-regime-engine-and-scoring.md](03-regime-engine-and-scoring.md) | 58 |
| 4) Decision support tooling | [04-decision-support-tooling.md](04-decision-support-tooling.md) | 115 |
| 5) Playbooks, summaries, and briefings | [05-playbooks-summaries-and-briefings.md](05-playbooks-summaries-and-briefings.md) | 277 |
| 6) APIs (server routes) | [06-apis.md](06-apis.md) | 136 |
| 7) Non-goals (as enforced in UI copy) | [07-non-goals.md](07-non-goals.md) | 4 |
| 8) Demo and interactive features (2026-05-23) | [08-demo-and-interactive-features.md](08-demo-and-interactive-features.md) | 93 |
| 9) Vocabulary and trust-state consolidation (2026-09-02) | [09-vocabulary-and-trust-state.md](09-vocabulary-and-trust-state.md) | 126 |
