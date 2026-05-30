---
description: "Run typecheck + lint"
agent: build
---
tsc --noEmit||node scripts/vinext-run.mjs build||bun scripts/run-tests.mjs
