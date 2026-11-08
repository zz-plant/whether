# Lessons index

Long-form reasoning behind the rules in [AGENTS.md](../../../AGENTS.md) and
[toolchain.md](../toolchain.md). Each file is a dated post-mortem; read the one that matches
the task instead of reading them all.

`bun run agent:route -- "<task>"` reads this table and names the file. A row added here is
routed with no second edit (`tests/agentWorkflow.test.ts` holds it).

## Read before you touch

| Touching… | Read |
| --- | --- |
| lint, suppressions, dead-export census, suite runner, telemetry streams, a red gate, an env flag | [toolchain-and-gates](toolchain-and-gates.md) |
| a routine, brief freeze, email/Slack send, Cloudflare build, "green here, red there" | [automation-and-deploy-gate](automation-and-deploy-gate.md) |
| reader-facing strings, source-reading tests, page-vs-page claims | [tests-and-copy-rules](tests-and-copy-rules.md) |
| a new module, an API field, share/OG/SEO metadata, a cache, a warning banner, runway | [dead-features-and-honesty](dead-features-and-honesty.md) |
| `lib/regimeEngineCore.ts`, confidence, anything printing a score or delta | [regime-scoring](regime-scoring.md) |
| `lib/runtime/`, a binding, KV, a store singleton, a retry | [runtime-helpers](runtime-helpers.md) |
| choosing a first file | [hot-files](../hot-files.md) |
