#!/usr/bin/env bash
set -euo pipefail

# SessionStart hook for Claude Code on the web.
#
# Installs dependencies so tests, lint, and typecheck work in a fresh cloud
# container. Runs synchronously so deps are guaranteed ready before the agent
# loop starts (no race where a check runs before node_modules exists).
#
# Local sessions manage their own environment, so this only runs in the remote
# (web) environment.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

# The cloud clone is shallow, which truncates `git log` / `git blame`. Deepen it once;
# failure is harmless (offline, or already complete), so it never blocks the session.
if [ "$(git rev-parse --is-shallow-repository 2>/dev/null)" = "true" ]; then
  echo "[session-start] Unshallowing clone for full history..."
  git fetch --unshallow --quiet 2>/dev/null || echo "[session-start] unshallow skipped"
fi

# Idempotent and cache-friendly: `bun install` is a near no-op once node_modules
# matches bun.lock, and it reuses the cached container state on resume. It also
# runs the repo's postinstall (repair-vinext) and prepare (husky) steps.
echo "[session-start] Installing dependencies with bun install..."
bun install

echo "[session-start] Dependencies ready."
