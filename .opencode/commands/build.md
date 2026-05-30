---
description: "Run the full build"
agent: build
---
tsc --noEmit||node scripts/vinext-run.mjs build||bun scripts/run-tests.mjs
