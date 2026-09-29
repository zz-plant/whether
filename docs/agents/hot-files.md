# Hot files

The files most often edited since 2026-08-01, so a first read of the repo starts from where the
work actually lands. Counts are commits touching the file (excluding `tests/`, `docs/`,
`CLAUDE.md`). Regenerate with:

```bash
git log --since=<date> --pretty=format: --name-only | rg -v '^$' \
  | rg -v '^(tests|docs)/|CLAUDE.md' | sort | uniq -c | sort -rn | head -20
```

| File | Commits | What it owns | Read first |
| --- | --- | --- | --- |
| `app/page.tsx` | 93 | The homepage route and its data boundary. Suspends offline, so assertions about it stay source-level. | `app/components/home/AGENTS.md` |
| `app/components/DecisionHero.tsx` | 79 | The weekly hero: call, confidence, movement line. | `app/components/home/AGENTS.md`, `lib/report/AGENTS.md` |
| `app/history/page.tsx` | 48 | Month-end archive views. Last *completed month*, never "now". | lessons: `tests-and-copy-rules` |
| `app/operate/planningPageModel.ts` | 42 | The operate/plan page model. | `app/operate/components/AGENTS.md` |
| `app/signals/page.tsx` | 36 | Signal hubs and scenario children. | `app/signals/AGENTS.md` |
| `app/trust/page.tsx` | 33 | Sources, freshness, confidence record, scheduled runs. Reader copy, not operator copy. | lessons: `tests-and-copy-rules` |
| `lib/navigation/informationArchitecture.ts` | 27 | The IA: rails, labels, links every page draws from. | — |
| `app/share/page.tsx` | 27 | Every copy, file and image format; builders in `lib/export/*`. | lessons: `dead-features-and-honesty` |
| `app/answers/decisionAnswerPageContent.tsx` | 27 | The eleven answer pages, cold-traffic corpus. | `tests/answerPageReaderCopy.test.tsx` |
| `app/brief/[week]/page.tsx` | 25 | A published week from the frozen archive. | lessons: `automation-and-deploy-gate` |
| `lib/report/reportCopy.ts` | 24 | Shared reader-facing labels. Copy that appears on more than one surface belongs here. | `lib/report/AGENTS.md` |

Before editing any of these, run `bun run agent:route -- "<task>"` and open the nested
`AGENTS.md` that applies. A change to one usually has a sibling test that renders it
(`tests/readerVocabulary.test.tsx`, `tests/pageReaderContradictions.test.tsx`), so run those too.
