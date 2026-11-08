# Current feature specs (as built)

This is the short index by surface. The dated record behind it moved to
[docs/decisions/feature-log/](decisions/feature-log/README.md) — search that log's headings
when you need the why; do not read it end to end.

Whether is an operator briefing system for leadership teams answering three recurring
questions: what regime are we in, what should we do now, and which decisions are misaligned
with current macro conditions. Dynamic decision copy follows one bounded contract across
weekly, evidence, trust, export and monthly-summary surfaces: name the action, the measurable
pause threshold, and the reversal condition.

## Surfaces

| Surface | Canonical code | Tests | Log |
| --- | --- | --- | --- |
| Weekly brief / homepage | `app/page.tsx`, `app/components/DecisionHero.tsx`, `lib/report/homeBriefModel.ts`, `lib/report/decisionKnobs.ts` | `tests/homeBriefModel.test.ts`, `tests/homeRouteDecisionTransmissionContract.test.tsx` | [01](decisions/feature-log/01-product-surfaces.md) |
| Plan / operate | `app/operate/`, `app/operate/planningPageModel.ts` | `tests/planningExecutionStepper.test.ts`, `tests/planningCliPage.test.tsx` | [01](decisions/feature-log/01-product-surfaces.md), [05](decisions/feature-log/05-playbooks-summaries-and-briefings.md) |
| Share / export | `app/share/page.tsx`, `lib/export/`, `lib/report/briefDocument.ts` | `tests/briefFormatsPinned.test.ts`, `tests/briefDocument.test.ts` | [01](decisions/feature-log/01-product-surfaces.md), [05](decisions/feature-log/05-playbooks-summaries-and-briefings.md) |
| Signals / evidence | `app/signals/`, `lib/report/reportEvidence.ts` | `tests/signalReadingPanelCopy.test.tsx`, `tests/signalClusterReading.test.ts` | [01](decisions/feature-log/01-product-surfaces.md), [02](decisions/feature-log/02-data-sourcing-and-provenance.md) |
| Trust / provenance | `app/trust/page.tsx`, `lib/report/trustStatus.ts` | `tests/trustStatusFailureModes.test.ts` | [02](decisions/feature-log/02-data-sourcing-and-provenance.md), [09](decisions/feature-log/09-vocabulary-and-trust-state.md) |
| History / archive | `app/history/page.tsx`, `lib/report/publishedBriefs.ts` | `tests/publishedBriefs.test.ts`, `tests/publishedBriefPageOrder.test.tsx` | [01](decisions/feature-log/01-product-surfaces.md), [05](decisions/feature-log/05-playbooks-summaries-and-briefings.md) |
| Answers / SEO | `app/answers/`, `lib/seo/` | `tests/answerPageReaderCopy.test.tsx`, `tests/answerIndexationPolicy.test.ts` | [06](decisions/feature-log/06-apis.md) |
| Companies / roles | `app/companies/`, `app/roles/`, `lib/report/companyRoles.ts` | `tests/companyPages.test.tsx`, `tests/rolePages.test.tsx` | [01](decisions/feature-log/01-product-surfaces.md) |
| APIs / agent | `app/api/`, `lib/agent/`, `lib/mcp/` | `tests/agentInterface.test.ts`, `tests/agentDiscoveryParity.test.ts` | [06](decisions/feature-log/06-apis.md) |
| Regime engine | `lib/regimeEngine.ts`, `lib/regimeEngineCore.ts`, `lib/regimeEngineScoring.ts`, `lib/report/regimeDescription.ts` | `tests/regimeEngine.test.ts`, `tests/regimeEngineProperties.test.ts` | [03](decisions/feature-log/03-regime-engine-and-scoring.md) |
| Playbooks / bounded decisions | `lib/playbook.ts`, `lib/report/operatingCalls.ts`, `lib/thresholds.ts` | `tests/playbook.test.ts` | [04](decisions/feature-log/04-decision-support-tooling.md), [05](decisions/feature-log/05-playbooks-summaries-and-briefings.md) |
| Data sourcing | `lib/marketData/`, `lib/fred.ts`, `data/` | `tests/macroSnapshot.test.ts` | [02](decisions/feature-log/02-data-sourcing-and-provenance.md) |

## Cross-cutting

- **Non-goals** — [07](decisions/feature-log/07-non-goals.md)
- **Demo and interactive features** — [08](decisions/feature-log/08-demo-and-interactive-features.md)
- **Vocabulary and trust-state consolidation** — [09](decisions/feature-log/09-vocabulary-and-trust-state.md)
- **Editorial vocabulary** — [`docs/editorial-guardrails.md`](editorial-guardrails.md)
- **One-screen brief contract** — [`docs/one-screen-weekly-brief-spec.md`](one-screen-weekly-brief-spec.md)

## Where old § references went

The entries kept their numbers. If you followed a `docs/feature-specs-current.md §1.1.x`
link, the entry is in the log file for its top-level section:

| Old reference | Now |
| --- | --- |
| §1.x | [01-product-surfaces](decisions/feature-log/01-product-surfaces.md) |
| §2.x | [02-data-sourcing-and-provenance](decisions/feature-log/02-data-sourcing-and-provenance.md) |
| §3.x | [03-regime-engine-and-scoring](decisions/feature-log/03-regime-engine-and-scoring.md) |
| §4.x | [04-decision-support-tooling](decisions/feature-log/04-decision-support-tooling.md) |
| §5.x | [05-playbooks-summaries-and-briefings](decisions/feature-log/05-playbooks-summaries-and-briefings.md) |
| §6.x | [06-apis](decisions/feature-log/06-apis.md) |
| §7.x | [07-non-goals](decisions/feature-log/07-non-goals.md) |
| §8.x | [08-demo-and-interactive-features](decisions/feature-log/08-demo-and-interactive-features.md) |
| §9.x | [09-vocabulary-and-trust-state](decisions/feature-log/09-vocabulary-and-trust-state.md) |
