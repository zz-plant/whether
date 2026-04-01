# Whether CLI (v1)

Whether CLI is an operator decision terminal: **environment → call → changes → flips**.

## Run

- Local: `bun run cli:whether -- <command> [flags]`
- Binary: `whether`

## Top-level commands

- `whether --version`
- `whether ping`
- `whether agent [weekly|monthly|quarterly|yearly] [--json] [--compact|--payload-only|--prompt-only|--skills-only]`
- `whether status [--compact]`
- `whether call [show|copy|diff]`
- `whether regime`
- `whether changes`
- `whether diagnostics [summary|drivers|evidence|provenance]`
- `whether history [compare]`
- `whether brief [exec|board|staff|investor|slack|email]`
- `whether export [json|csv|markdown|pdf|briefing] [--output <file>]`
- `whether share [slack|email|clipboard] [--brief <type>] [--output <file>]`
- `whether explain [regime|call|flip|metric --metric tightness]`
- `whether scenario --tightness <n> --risk-appetite <n>`
- `whether company [list|select|status|call|brief]`
- `whether watch --interval 60 --changes-only`
- `whether config [init|get|set <key> <value>]`
- `whether auth [login|logout|status] [--check] [--json]`
- `whether raw <endpoint>`
- `whether doctor`
- `whether install [--yes|--ci] [--api-base-url <url>] [--token <token>]`
- `whether completion [--shell <bash|zsh>]`

## Global output/setup flags

- `--json`
- `--yaml`
- `--markdown`
- `--quiet`
- `--no-color`
- `--no-local-discovery` (disable local `localhost`/`127.0.0.1` port probing when the configured dev URL is unreachable)
- `--output <file>` (write command output to a file; it is a path, not a format selector)
- `--yes` (install: non-interactive acceptance of defaults)
- `--ci` (install: alias of `--yes` for CI scripts)

## Command-specific query flags

- `agent`: positional cadence (`weekly`, `monthly`, `quarterly`, `yearly`) or `--cadence <value>`, plus `--compact`, `--payload-only`, `--prompt-only`, `--skills-only`
- `status`: `--as-of <YYYY-MM>`, `--view expanded`, `--verbose`, `--compact`
- `call`: `--as-of <YYYY-MM>`
- `changes`: `--as-of <YYYY-MM>`
- `diagnostics`: `--as-of <YYYY-MM>`
- `regime`: `--as-of <YYYY-MM>`
- `history`: `--as-of <YYYY-MM>`, `--weeks <n>`
- `scenario`: `--tightness <n>`, `--risk-appetite <n>`

Notes:
- `--as-of` is mapped to `asOf` query shape expected by the API handlers.
- `--company` / `--stage` are local CLI context flags. They annotate output and power `whether company ...`, but they are not forwarded as query params to `/api/cli/*` endpoints.

## Human mode vs agent mode

- Default text output is optimized for terminal reading and meeting handoff. It can add local context lines and rendered brief variants.
- `--json` on parity commands is optimized for agents, CI, and scripts. It returns the backend payload without local CLI wrappers.
- Current parity commands are `agent`, `status`, `call`, `changes`, `regime`, `diagnostics`, `history`, `brief`, and `scenario`.
- Derived commands such as `export`, `share`, and filtered `diagnostics evidence|provenance` intentionally compose or transform backend data.

Agent shortcuts:
- `whether agent --compact --json` returns a smaller agent brief with the summary hash, decision delta, flip watch, and skill list.
- `whether agent --payload-only --json` returns `agentHandoff.payload` directly.
- `whether agent --skills-only --json` returns the declared skill contract only.
- `whether agent --prompt-only` prints the backend prompt without extra framing.

Shell shortcuts:
- `whether status --compact` prints a one-screen status snapshot that is easier to scan in a terminal or pipe into shell tools.
- If the configured local URL is unreachable and you are using the default local setup, the CLI probes common local dev ports and reuses the first healthy Whether API it finds. Use `--no-local-discovery` to force strict URL behavior.

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

Local dev note:
- `bun run dev` may move from `http://localhost:3000` to `3001`, `3002`, or another nearby port if earlier ports are occupied. The CLI now auto-discovers a healthy local Whether API on common local dev ports when you have not pinned a remote API URL.

## Exit codes

- `0` success
- `1` generic/request-contract error
- `2` auth/config/forbidden error
- `3` no data available
- `4` watch condition triggered
- `5` invalid scenario input
- `6` network reachability failure
- `7` server/rate-limit failure

## Export behavior

- `json` prints a combined machine payload containing `status`, `changes`, and `brief`.
- `csv` prints changed metrics as a flat table.
- `markdown` prints a meeting-ready markdown artifact.
- `briefing` prints a plain-text operator briefing.
- `pdf` writes a PDF file. If `--output` is omitted, it defaults to `whether-briefing.pdf` in the current working directory.

Notes:
- Non-PDF exports print to stdout unless `--output` is provided.
- `--output` writes the rendered artifact to the requested path while preserving the selected output mode (`--json`, `--yaml`, `--markdown`, or default text).

## Share behavior

`share` generates handoff-ready artifacts; it does not send directly to Slack or email providers.

- `share clipboard` copies the rendered brief when a system clipboard utility is available; otherwise it prints the brief to stdout.
- `share slack --json` returns Slack-friendly `blocks` plus metadata for automations.
- `share email` renders a subject/body pair and includes a `mailto` URL in JSON mode.
- `--brief <type>` accepts the same brief variants as `whether brief` (`exec`, `board`, `staff`, `investor`, `slack`, `email`).

## Company context

- `whether company select <name> --stage <stage>` saves a local company context in `~/.config/whether/config.yaml`.
- `whether company status|call|brief` reuses that saved context and prefixes the output with a context line.
- `whether company ... --json` preserves the raw backend payload; saved company context stays a human text-mode annotation only.
- The current weekly call remains the canonical base call; company context is local profile metadata until company-tuned CLI routes exist.

## Shell completion

Bash:

```bash
eval "$(whether completion --shell bash)"
```

Zsh:

```bash
eval "$(whether completion --shell zsh)"
```

## Config and environment precedence

Order: **flags > env vars > config file**.

- Config file: `~/.config/whether/config.yaml`
- Env vars:
  - `WHETHER_API_KEY` (preferred)
  - `WHETHER_TOKEN` (legacy alias)
  - `WHETHER_API_URL`
  - `WHETHER_PROFILE`

## CLI API routes

- `GET /api/agent?cadence=weekly|monthly|quarterly|yearly`
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

Use these four commands as the minimal smoke surface for operators and agents:

- `whether --version`
  - Exit: `0`
  - Stdout (text): semantic version only (example `0.1.0`)
- `whether ping --json`
  - Exit: `0` on healthy API
  - Stdout (json): `{ "ok": true, "apiBaseUrl": "...", "status": "ok", "autodiscovered": false }`
  - Exit: `2` for auth/forbidden, `6` for network, `7` for 429/5xx server failures
- `whether agent weekly --json`
  - Exit: `0`
  - Stdout (json): canonical `/api/agent` payload including `cadence`, `copy`, `agentHandoff`, `links`, `generatedAt`, and `version`
- `whether agent --compact --json`
  - Exit: `0`
  - Stdout (json): compact agent handoff with `summaryHash`, `decisionDelta`, `flipWatch`, and `skills`
- `whether brief --json`
  - Exit: `0`
  - Stdout (json): raw `/api/brief/slack` payload that includes `brief` text

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
- `whether auth status --check` performs an authenticated `/api/auth/status` check and preserves existing auth/network/server exit codes.
- `whether doctor --json` now also reports the configured vs resolved API base URL, whether local autodiscovery kicked in, and the current token source.
