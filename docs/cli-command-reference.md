# Whether CLI (v1)

Whether CLI is an operator decision terminal: **environment → call → changes → flips**.

## Run

- Local: `bun run cli:whether -- <command> [flags]`
- Binary: `whether`

## Top-level commands

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
- `whether auth [login|logout|status]`
- `whether raw <endpoint>`
- `whether doctor`
- `whether completion`

## Common flags

- `--json`
- `--yaml`
- `--markdown`
- `--quiet`
- `--no-color`
- `--company <name>`
- `--stage <name>`
- `--as-of <YYYY-MM-DD>`

## Exit codes

- `0` success
- `1` generic error
- `2` auth/config error
- `3` no data available
- `4` watch condition triggered
- `5` invalid scenario input

## Config and environment precedence

Order: **flags > env vars > config file**.

- Config file: `~/.config/whether/config.yaml`
- Env vars:
  - `WHETHER_TOKEN`
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
