# Whether CLI (v1)

Whether CLI is an operator decision terminal: **environment → call → changes → flips**.

## Run

- Local: `bun run cli:whether -- <command> [flags]`
- Binary: `whether`

## Top-level commands

- `whether --version`
- `whether ping`
- `whether status`
- `whether call [show|copy|diff]`
- `whether regime`
- `whether changes`
- `whether diagnostics [summary|drivers|evidence|provenance]`
- `whether history [compare]`
- `whether brief [exec|board|staff|investor|slack|email]`
- `whether export [json|csv|markdown|pdf|briefing]`
- `whether share [slack|email|clipboard]`
- `whether explain [regime|call|flip|metric --metric tightness]`
- `whether scenario --tightness <n> --risk-appetite <n>`
- `whether company [list|select|status|call|brief]`
- `whether watch --interval 60 --changes-only`
- `whether config [init|get|set <key> <value>]`
- `whether auth [login|logout|status] [--check] [--json]`
- `whether raw <endpoint>`
- `whether doctor`
- `whether install [--yes|--ci] [--api-base-url <url>] [--token <token>]`
- `whether completion`

## Common flags

- `--json`
- `--yaml`
- `--markdown`
- `--quiet`
- `--no-color`
- `--company <name>`
- `--stage <name>`
- `--as-of <YYYY-MM> (example: 2024-07)`
- `--yes` (install: non-interactive acceptance of defaults)
- `--ci` (install: alias of `--yes` for CI scripts)

## Install contract (automation-safe)

Canonical installer command:

```bash
bun run cli:whether -- install --yes --api-base-url http://localhost:3000
```

CI/non-interactive installer command:

```bash
bun run cli:whether -- install --ci --api-base-url "$WHETHER_API_URL" --token "$WHETHER_API_KEY"
```

Behavior:
- `install` writes `~/.config/whether/config.yaml` with baseline defaults and any provided flags.
- In non-interactive shells, `install` requires `--yes` or `--ci`; otherwise it exits with an error explaining the required flag.
- If config-file writes are blocked (restricted shell/home permissions), use `WHETHER_API_URL` and `WHETHER_API_KEY` (or `WHETHER_TOKEN`) environment variables instead of running `install`.

Linux/macOS note:
- Commands above are POSIX shell-safe and work in standard Linux and macOS terminals.

## Exit codes

- `0` success
- `1` generic/request-contract error
- `2` auth/config/forbidden error
- `3` no data available
- `4` watch condition triggered
- `5` invalid scenario input
- `6` network reachability failure
- `7` server/rate-limit failure

## Config and environment precedence

Order: **flags > env vars > config file**.

- Config file: `~/.config/whether/config.yaml`
- Env vars:
  - `WHETHER_API_KEY` (preferred)
  - `WHETHER_TOKEN` (legacy alias)
  - `WHETHER_API_URL`
  - `WHETHER_PROFILE`

## CLI API routes

- `GET /api/cli/status`
- `GET /api/cli/call`
- `GET /api/cli/regime`
- `GET /api/cli/changes`
- `GET /api/cli/diagnostics`
- `GET /api/cli/history`
- `GET /api/cli/scenario`

All are versioned `v1` payloads for automation-safe command output.


## Troubleshooting (error categories)

The CLI maps common failures to these exact category-prefixed error strings:

- `auth: Authentication failed (missing|expired|invalid key). Set/rotate WHETHER_API_KEY (or WHETHER_TOKEN) or pass --token, then run whether auth login --token <token>.`
- `network: Unable to reach Whether API. Set WHETHER_API_URL or pass --api-base-url, then verify <apiBaseUrl>/api/health.`
- `forbidden: Access denied by API (invalid scope). Use a token with required access via WHETHER_API_KEY (or WHETHER_TOKEN) or --token, then retry.`
- `rate limit: Request quota exceeded. Retry with --watch --interval 120 or wait for quota reset at /api/cli/status.`
- `server fault: API returned <status>. Run whether doctor and verify <apiBaseUrl>/api/health is healthy before retrying.`

Notes:
- `auth` and `forbidden` return exit code `2`.
- `network` returns exit code `6`; `rate limit` and `server fault` return exit code `7`.
- The top-level handler also prints `Cause: ...` so the original failure remains visible for debugging.


## Smoke command contract

Use these three commands as the minimal smoke surface for operators and agents:

- `whether --version`
  - Exit: `0`
  - Stdout (text): semantic version only (example `0.1.0`)
- `whether ping --json`
  - Exit: `0` on healthy API
  - Stdout (json): `{ "ok": true, "apiBaseUrl": "...", "status": "ok" }`
  - Exit: `2` for auth/forbidden, `6` for network, `7` for 429/5xx server failures
- `whether brief --json`
  - Exit: `0`
  - Stdout (json): object that includes `brief` text payload

JSON mode is intentionally stdout-only machine output; it should not include ANSI color escapes or log prefixes unless an error occurs.

## Docs change note (contract stability)

When release changes touch installer behavior, keep these contract points stable or update this document in the same PR:
- `whether install --yes` and `whether install --ci` both remain supported for non-interactive flows.
- `whether --version` remains a zero-noise verification check (exit `0`, semantic version on stdout).
- Restricted-shell fallback via `WHETHER_API_URL`/`WHETHER_TOKEN` remains documented and working.


## Auth status (machine-readable)

`whether auth status --json` returns a stable payload for agents/CI:

```json
{
  "authenticated": true,
  "source": "env",
  "hasToken": true,
  "apiBaseUrl": "http://localhost:3000"
}
```

Exit-code contract:
- `0` authenticated (token found from flag/env/config)
- `2` not authenticated (missing key/token)

Optional API validation:
- `whether auth status --check` performs an authenticated `/api/health` check and preserves existing auth/network/server exit codes.
