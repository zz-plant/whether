# Agent interface: MCP + skill-aligned handoff

This repo exposes a dedicated interface for agentic LLM workflows, with these paths:

1. **The state** (`GET /api/agent?view=state`, MCP `get_state`, CLI `whether state`) — the small answer to decide from.
2. **HTTP endpoint** for generic tool-calling agents (the full brief).
3. **MCP server**, remote (`/api/mcp`) and local (`bun run mcp:whether`), for Model Context Protocol-compatible runtimes.
4. **A plain-GET shim** on `/api/mcp?tool=<name>` for an agent with no MCP client.

## Start here: the state

The full brief answers "everything Whether says this week" in about 22KB (twice that over MCP, which
returns the object as text and as structured content), of which the part an agent acts on is under 2KB.
`GET /api/agent?view=state` is that part, in about 3KB, built by `lib/agentState.ts` from the same context
as the full brief:

| Field | What it is |
| --- | --- |
| `headline` | The state in one sentence, for an agent that only quotes. |
| `automation` | `{ ready, refusal }`: whether the data is live and current. **Check `ready` before acting without a person looking.** False for a saved copy, a record older than 10 days, or failed assembly; `refusal` says which. It says nothing about what the guidance is. This is `publishReadiness`, not `degraded`. |
| `freshness` | `fetchedAt`, `recordAgeDays`, `live`, `fallback`. |
| `conditions` / `confidence` | The weather word and its stable `key`; the published confidence (`HIGH`/`MED`/`LOW`, percent) — the same one the page, `/api/scores` and the CLI carry. Pages print it as the margin ("Clear of / Within reach of / Close to the line"); see the field-to-label table in `docs/developer/api-reference.md`. |
| `scores.tightness` / `scores.riskAppetite` | `value`, `meaning`, and against each line: `pause`, `resume` (each `{ line, distance, side, met }`; `met` on the pause line means the pause applies) and `change` (where the conditions themselves change). Then `previous`, `delta`, `perWeek` (the pace to hand a projection) and `moved` (what the delta is made of, signed, adding up to it). |
| `change` | `direction`, `regimeChanged`, `comparedWith` (the earlier reading, dated: the previous month-end snapshot, **not last week**), `days` and a `note` where part of `moved` is an input the earlier score never had. |
| `guidance` | `call`, `doNow`, `avoidNow`, `flipConditions`. |
| `use` / `links` | The use limits every guidance-carrying response carries; where to read more. |

Its shape is a zod schema (`agentStateSchema`) published as the `outputSchema` of the MCP tool `get_state`,
so a client can read the contract without making a call, and `tests/agentState.test.ts` holds the numbers in
it to the page's own. It takes no cadence other than weekly (`?view=state&cadence=monthly` is a 400, not the
weekly state under another name) and cannot be combined with `format=jev`.

## One confidence

`/api/agent`'s root `confidence` (`{ label, percent }`), the legacy `?tool=get_brief` answer and the RSS item
all carry the published confidence. `summary.confidence` and the prose sentence beside it on this route are
set to it too. They read the engine's own label (its confirmation gate, not a published fact) until
2026-09-29, and said MEDIUM on a week the page called High (`tests/agentConfidenceAgreement.test.ts`).
`/api/weekly`, `/api/monthly`, `/api/cadence` and `/api/summary-delta` carry it as well since 2026-10-06: the
summary builders read the published confidence themselves (`resolveSummaryConfidence`, handed the record
the reading came from). The archived summaries switch on their next regeneration.

## Why this approach

Based on the repo playbook (`mcp-and-skills-playbook.md`) and MCP guidance, the practical baseline is:

- keep the interface read-mostly,
- reuse existing summaries and provenance,
- provide structured outputs that map to explicit agent skills,
- avoid introducing parallel business logic.

The implementation therefore wraps existing report pipelines (`weekly/monthly/quarterly/yearly`) and the existing `agentHandoff` payload.

## Option A: HTTP interface

Route: `GET /api/agent?cadence=<weekly|monthly|quarterly|yearly>`

- Defaults to `weekly`.
- Returns summary copy, provenance, and `agentHandoff` (`payload` + `prompt`).
- The payload now includes `decision_rules`, `decision_delta`, and `flip_watch` so agents can explain what changed, what should change now, and what would flip the call without reconstructing their own regime logic.
- Returns HTTP 400 for invalid cadence values, and for an unknown `view` (`allowedViews`).
- `?view=state` answers the compact state above instead of the full brief (default view: `full`).
- The payload's `confidence` is the published confidence; `decision_delta.compared_with` names the reading the changes are measured against.
- Includes read-only CORS headers for browser-based tool clients.
- Supports `OPTIONS /api/agent` preflight with `204`.
- Returns `publishReadiness` — the judgment the Monday Slack post and email refuse on
  (`lib/report/briefPublishGuard.ts`). `degraded` is not a freshness signal; this is.
- `?format=jev` returns the week as a ready-to-send request for TypeSafe's Jev decision model
  (`typesafe/jev`, `lib/jev/jevHandoff.ts`): the agent payload's call as typed state with an empty
  `plan` slot, and four questions about a plan against the call. The caller fills the plan and calls
  Jev; Whether never receives it, which is why this is a format and not an endpoint that takes a
  plan. `automationReady` carries `publishReadiness`. Any other `format` is a 400.

  **Reader text is never sent to Jev (decided 2026-09-23).** Routing `/search` queries or recorded
  decisions through Jev was considered and declined. `/privacy` says the search payload has no field
  that could hold the query, and that everything but recorded decisions stays in the browser. A
  server-side Jev call on that text would make both statements false, and a third-party model reading it
  would need its own section there. The site's use of Jev stays where it is: the handoff format above,
  where the caller sends their own plan, and `audit:jev-copy`, which reads only the site's own copy
  (with Jev, or Cloudflare's Jev-compatible Clef models via `--model`).

Machine-discovery routes:

- `GET /llms.txt` provides a plain-text integration guide for autonomous agents.
- `GET /.well-known/whether-agent.json` provides a machine-readable JSON manifest (endpoints, cadences, MCP tools).
  It is served from `worker/index.ts`, not from a route under `app/` — vinext enumerates App Router
  files with Node's `glob`, where `*` skips a leading dot, so a route under `app/.well-known/` is
  never registered and 404s. It did, in production, for as long as it existed. The manifest body
  lives in `lib/agentManifest.ts`; Invariant 10 in `tests/architectureInvariants.test.ts` fails if
  any route file reappears under a dot-directory.
- The manifest's path, the `start` pointers, the `endpoints` and the `views` are written once, in
  `lib/agent/discovery.ts`, and read by the manifest, `/llms.txt`, `/llms-full.txt`, `robots.ts`, the
  root layout's `<link rel="mcp-manifest">`, `/api-docs` and `/api/agent` itself.
  `tests/agentDiscoveryParity.test.ts` holds `/llms.txt` to the manifest's start pointers and endpoints,
  and every advertised endpoint to a route that serves it.

### Example

```bash
curl "http://localhost:3000/api/agent?cadence=weekly"
```

## Option B: local MCP interface (stdio)

Script entrypoint:

```bash
bun run mcp:whether
```

This starts the **same MCP server as `/api/mcp`** (`lib/mcp/server.ts`, built for either transport) over
stdio, with the same tools from the same definitions (`lib/agent/tools.ts`), plus one that only makes
sense on a local checkout:

- `pull_recent_site_info(cadence?, siteUrl?)`
  - fetches the latest `/api/agent` payload from the site so an agent can pull recent live context
- `get_agent_brief` still answers, as an alias of `get_brief`, for clients configured before the two
  servers were merged. It was one of five tools here (against twelve remote) under another server name
  (`whether-agent-interface`); both are now `whether` (`lib/mcp/serverIdentity.ts`).

What a client of the old local server will see differently: `get_recent_history` answers
`{ signal_key, history }` (it answered the bare history); `get_decision_rules` for one regime answers
`{ "DEFENSIVE": [...] }` (it answered the array); a refusal is a plain sentence in a result with `isError`
(it was JSON, `{ "error": ... }`) that lists what would have worked; a regime is accepted by key or by the
site's weather word in any case; and the server's name is `whether`, not `whether-agent-interface`.

### Example MCP client config (shape)

```json
{
  "mcpServers": {
    "whether": {
      "command": "bun",
      "args": ["run", "mcp:whether"]
    }
  }
}
```

## Option C: remote MCP endpoint

`https://whether.work/api/mcp` is an MCP streamable-HTTP server (JSON-RPC 2.0; `initialize`,
`ping`, `tools/list`, `tools/call`; protocol revisions 2025-06-18 and 2025-03-26). No checkout, no
key. Transport: `lib/mcp/httpMcpServer.ts`, a fresh `lib/mcp/server.ts` per request; transport tests:
`tests/mcpStreamableTransport.test.ts`.
The `initialize` result carries instructions that say where to start (`lib/mcp/serverIdentity.ts`).
They are prose and name ten of the thirteen tools by use; `get_signals`, `get_analog_playbook` and
`list_agent_skills` are left to `tools/list` on purpose, since none changes where an agent starts or
what it checks before acting. `tests/agentDiscoveryParity.test.ts` fails on a name the registry does not
serve, and on a tool added to the registry until the instructions name it or the test leaves it out.

Tools (all read-only, and annotated so: `readOnlyHint`, `idempotentHint`):

- `get_state` — **start here.** The compact state above; publishes an `outputSchema`.
- `get_brief` — the full brief for a cadence (about 22KB). Alias: `get_agent_brief`.
- `get_standup_line` — one line for a team's daily standup: whether guidance moved and what would change it.
- `get_decision_rules` — the bounded rules by regime. Keyed by regime, one key for one regime.
- `get_context`, `get_projection` — history and projection for a regime; both default to today's reading. `get_context` counts **months** of month-end snapshots (`monthsActive`, `historicalAvgMonths`), through the `latestSnapshot` it names, because the record is monthly; it was `weeksActive` / `historicalAvgWeeks` over the same monthly series, so an agent told "8 weeks" was being told 8 months. A regime newer than the last month-end has `monthsActive` 0 and a `note` saying so.
- `get_comps`, `get_signals`, `get_recent_history` — SaaS multiples, data coverage, one signal's trailing window.
- `stress_test_plan`, `lint_commitment`, `lint_sprint_goal`, `get_analog_playbook` — a plan checked against today's conditions.
- `list_agent_skills` — the skill contract.

Client config (shape):

```json
{
  "mcpServers": {
    "whether": { "url": "https://whether.work/api/mcp" }
  }
}
```

### Results

`tools/call` answers `content[0].text` as **compact** JSON (no indentation: a quarter shorter) and the
same object as `structuredContent`, which is always an object (`get_decision_rules` for one regime used
to answer an array, which the SDK client rejects). A refusal or a failure is a result with `isError`
and plain words; it carries no `structuredContent`, which a client validating against an `outputSchema`
would reject. Only an unknown tool is a protocol error (`-32602`), and it lists the tools there are.

### Inputs

Every tool takes named arguments from `lib/agent/inputs.ts`, read by `lib/agent/registry.ts`, and refuses
what it cannot take with the values that would have worked:

- A **regime** is accepted by key (`SCARCITY`, `DEFENSIVE`, `VOLATILE`, `EXPANSION`) or by the word
  the site prints (`Freezing`, `Cloudy`, `Stormy`, `Sunny`), in any case, and answered on the key.
  `get_context` with `SUNNY` used to answer zero weeks and no history, as a success.
- An argument that is `null`, empty or whitespace is an argument not sent.
- A number may be sent as text, and zero is a value (`riskAppetite=0` was refused as missing).
- A cadence, lifecycle stage or signal key is matched in any case; an unknown one is refused rather than
  becoming weekly.
- An argument the tool does not take is **named**, not ignored: with defaults, `regim` would otherwise
  be a plausible answer to a question nobody asked.
- `get_context` and `get_projection` fill what is left out from today's reading, and their `inputs`
  says which of `given`, `today` or `assumed` each value was. A what-if (any score given) assumes 0
  pace rather than borrowing today's for other scores. `tightnessDelta`/`riskAppetiteDelta` are
  points **per week**; `get_state`'s `perWeek` is that number.
- `get_projection` steps the scores by their pace and asks the engine's own regime table
  (`classifyRegimeQuadrant`) where they land, so a score moving away from its line does not cross it,
  and it names the regime they would then be in. The scores decide, not the label: when they sit in
  another regime than the one given (a change waiting for confirmation, or a regime that does not match
  them) the result carries a `note`. It replaced a projection that divided the nearest line's distance
  by the fastest pace whichever way either score moved: on the Sep 25 read, with both scores deeper into
  the regime, it reported a crossing within a week. That function still drives the Slack "conditions could
  change soon" alert (§ below); see the spec, §6.9.

### From a browser

CORS is open on `/api/mcp` (`lib/agentApiCors.ts`): the preflight a JSON-RPC POST triggers is answered, and the reads and the transport carry `Access-Control-Allow-Origin: *`, as `/api/agent` always has. Before, a page could not call the remote server at all. `?tool=subscribe` stays closed (it sends an email): its preflight is unanswered, so a page's POST is never sent.

### Plain GET

Every tool also answers `GET /api/mcp?tool=<name>&<argument>=<value>` for an agent without an MCP client
(`tool=get_actions` lists them with their arguments and a working call). Four keep the answer shape they
had before the registry (`get_context` under `context`, `get_projection` under `projection`, `get_comps`,
`get_signals`); `get_brief` answers a summary (regime, action, confidence) and says so; any other tool
answers `{ ok, tool, result, use }`. An unknown tool, or a wrong argument, is a 400 with `available` or
`problems[].allowed`. It was a 200 with the brief.

### Adding a tool

Add one `defineTool` in `lib/agent/tools.ts`: name, description, a zod input shape, a `run`. A tool is
read-only (and annotated so) unless its definition passes `readOnly: false`. The mechanism under it, which
knows nothing about Whether, is `lib/agent/registry.ts`: the definition, the argument parsing and the
refusals, and the list and call paths. An input with a fixed set of values says how they read in a refusal
with `labelChoices` (the regime input lists `SCARCITY (Freezing)`), so the refusal builder names no
argument. The remote
server, the local one, the GET shim and its catalogue, `/.well-known/whether-agent.json` (`mcp.tools`),
`/llms.txt` and the `/api-docs` page pick it up. `tests/agentDiscoveryParity.test.ts` fails if a place
that names the tools is missing one, and requires this guide to name it.

## Skills contract alignment

The returned payload includes `skills` from `lib/agentSkills.ts`, so agent runtimes can:

- map expected outputs by skill id,
- preserve output order for deterministic downstream processing,
- keep prompting concise while maintaining structure.

Current app-level skills in the payload:

- `regime-summary`
- `decision-delta`
- `constraint-translation`
- `flip-watch`
- `pm-questions`

Each skill is written once in `lib/agentSkills.ts` together with its step in the briefing: the action
`pm_handoff.briefing_actions` lists and the numbered ask in `agentHandoff.prompt`. Both lists are read
from it, in the skills' order, so the three cannot drift apart (`tests/agentHandoff.test.ts` pins the
words).

## Recommended usage pattern for agent builders

1. Call `get_state`. If `automation.ready` is false, say so and stop; the reading is a saved copy or too old to name this week.
2. Decide from `scores.*.pause` / `resume` / `change` and `guidance`; use `moved` and `change.comparedWith` when explaining why a number moved.
3. Call `get_brief` only for the wording, the record, or a cadence other than weekly; call `list_agent_skills` once per session (or cache by commit hash) when working from it.
4. Generate outputs in the order declared by `skills`, using `decision_delta` for “what changed / what changes now” and `flip_watch` for bounded reversal monitoring.
5. Keep provenance and source URLs attached in any user-facing response.

## Production monitoring endpoints

- `GET /api/health` exposes monitor-friendly service status for synthetic probes.
  - Returns `200` for `ok` and `503` for `degraded`/`down`.
  - Includes treasury data freshness metadata (`fetchedAt`, `ageHours`, `staleAfterHours`).
- `scripts/prod-synthetic-smoke.mjs` runs baseline route + schema assertions against a deployed site.
  - Run manually with `bun run smoke:prod`, or from any external scheduler that can invoke repo commands.
