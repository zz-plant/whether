# IDE and CI policy integration

Recipes for checking a proposal against this week's reading before it is made: from a coding agent's
instructions (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`), from a git hook, or from a CI step. They are
for other repositories. This repository runs none of them: it has no such hook, workflow or schedule.

The proposals worth checking are the ones that are hard to undo: new recurring infrastructure
(reserved capacity, GPU nodes, a paid SaaS dependency), headcount or contractors, and a large
migration or rewrite.

## What answers

| Command | HTTP equivalent | What it says |
| --- | --- | --- |
| `whether state` | `GET /api/agent?view=state` | The reading: conditions, each score against its lines, the guidance, and `automation.ready`. |
| `whether check "<proposal>"` | `POST /api/mcp`, `tools/call` `lint_commitment` | The proposal's decision verdict against the reading, with its Pause line, Restart line and a more reversible version. |
| `whether standup` | `GET /api/mcp?tool=get_standup_line` | One line: whether the guidance moved this week, and what would change it. |

`check` runs the stress test `/operate` runs (`stressTestDecisionPlan` in `lib/decisionShield.ts`,
through the MCP tool `lint_commitment` in `lib/agent/tools.ts`), and reads the state for the
reading's date and readiness. Nothing is graded in the CLI.

- **Decision verdicts.** `SAFE`, `RISKY` or `DANGEROUS`, or `Not graded` for a proposal that names no
  decision the test has rules for. It grades hiring, infrastructure, vendor deals and discounts,
  rewrites, acquisitions and geographic expansion. A migration reads as a rewrite only when the
  wording says so; pass `--category roadmap` to grade it as one.
- **Sizing.** A proposal with an amount ("$150k upfront") is sized against it; one without is graded on
  conditions alone, and the result says so.
- **Input.** The proposal is the words after `check`, a file (`--file <path>`, `-` for stdin), or
  stdin, so a PR body can be piped in. It is sent in a POST body, not the URL, so it stays out of
  request logs.
- **Output.** Text for a person; `--json` gives `{ tool, reading, result, failOn, blocked, use }`, where
  `result` is the `lint_commitment` answer as served.

### Exit codes

| Code | When |
| --- | --- |
| `0` | The check answered, whatever the decision verdict. It is advisory by default. |
| `9` | The decision verdict meets `--fail-on`: `risky` stops on `RISKY` or `DANGEROUS`, `dangerous` on `DANGEROUS` only. `Not graded` never stops. |
| `8` | `--require-ready` was given and the reading is not live and current. Checked before `--fail-on`. |
| `1` | No proposal, both an argument and `--file`, an unknown `--fail-on` value, or the tool refused the input. |
| `6` / `7` | The API was unreachable, or answered with a server error or rate limit. |

The result prints in every case, so a log keeps it.

### Running the CLI outside this repository

The `whether` package is not published. From a checkout of
[the repository](https://github.com/zz-plant/whether), `bun install` and then
`bun run cli:whether -- check "<proposal>"`, or `npm link` to put `whether` on the PATH. The CLI's
one runtime dependency is `commander`, so a copy of `scripts/whether-cli.mjs` beside an
`npm install commander` also runs. Point it at the site with `--api-base-url https://whether.work` or
`WHETHER_API_URL`; without either it reads a local server.

Without the CLI, the same check with `curl` and `jq`:

```bash
jq -n --arg text "$PROPOSAL" \
  '{jsonrpc: "2.0", id: 1, method: "tools/call", params: {name: "lint_commitment", arguments: {specText: $text}}}' \
| curl -fsS https://whether.work/api/mcp \
    -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' --data @- \
| jq '.result.structuredContent | {verdict, headline, boundedGuardrail, reversalTrigger, reversibleAlternative}'
```

## Agent instructions snippet

Paste into `CLAUDE.md`, `AGENTS.md`, `.cursorrules` or `.windsurfrules`. It names `whether`; swap in
`node path/to/whether-cli.mjs` or the `curl` call above if the CLI is not on the PATH.

```markdown
## Check hard-to-undo proposals against Whether

Before proposing or starting work that adds recurring infrastructure (cloud services, reserved
capacity, GPU nodes, a paid SaaS dependency), adds headcount or contractors, or begins a large
migration or rewrite:

1. Read this week's reading: `whether state --api-base-url https://whether.work`
   (or `curl -fsS "https://whether.work/api/agent?view=state"`). If `automation.ready` is false,
   say the reading is not live and current.
2. Check the proposal, written as one sentence that names the decision and its cost:
   `whether check --api-base-url https://whether.work "Reserve 3 years of GPU capacity on AWS, $150k upfront"`.
   Add `--category roadmap` for a migration, `--category infrastructure` for a new service.
3. Quote the result in the proposal: the decision verdict, the reading's date, the Pause line and
   the Restart line.
4. On RISKY or DANGEROUS, also state the payback period and the condition that would undo the
   change, or propose the more reversible version the check offers.
5. The check informs a person's decision; it neither approves nor refuses the work.
```

## Git hook

A `commit-msg` hook, because it is the first hook that has the message to check. It runs only when
the commit touches infrastructure config, and never stops a commit unless `--fail-on` is added.
Save as `.git/hooks/commit-msg` (or the matching Husky hook) and make it executable.

```sh
#!/bin/sh
# Check the commit message against this week's Whether reading when infrastructure config changes.
changed=$(git diff --cached --name-only)
case "$changed" in
  *.tf*|*terraform*|*pulumi*|*cloudformation*|*helm*|*k8s*) ;;
  *) exit 0 ;;
esac

whether check --api-base-url https://whether.work --category infrastructure --file "$1"
status=$?
# Add `--fail-on dangerous` above to stop the commit; any other failure (offline, say) lets it through.
[ "$status" -eq 9 ] && exit 1
exit 0
```

A `pre-push` hook is the same shape, with `git log --format=%B @{upstream}..HEAD | whether check ...`
as the proposal and `git diff --name-only @{upstream}..HEAD` as the files.

## GitHub Actions

Pipes the pull request's title and body into `whether check` and writes the result to the job log.
It needs no secrets, posts nothing, and passes whatever the decision verdict.

```yaml
name: Whether check
on:
  pull_request:
    types: [opened, edited, synchronize]
permissions:
  contents: read
jobs:
  whether-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          repository: zz-plant/whether
          path: .whether
          sparse-checkout: scripts/whether-cli.mjs
          sparse-checkout-cone-mode: false
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install --prefix .whether --no-save --no-package-lock commander@14
      - name: Check the pull request against this week's reading
        env:
          PR_TITLE: ${{ github.event.pull_request.title }}
          PR_BODY: ${{ github.event.pull_request.body }}
        run: |
          printf '%s\n\n%s\n' "$PR_TITLE" "$PR_BODY" \
            | node .whether/scripts/whether-cli.mjs check --api-base-url https://whether.work \
            || echo "::warning::whether check exited $?; the pull request is not blocked."
```

The title and body arrive through `env`, never inside the script, so text in a pull request cannot
run as shell. Set the checkout's `ref:` to a commit SHA of this repository to hold the CLI still.

Optional changes, each a choice for the repository that adopts it:

- **Stop the job.** Add `--fail-on dangerous` (or `risky`) and drop the `|| echo` line; the step then
  fails on that decision verdict.
- **Comment on the pull request.** Write the result to a file and post it with the token every job
  already has. This needs `pull-requests: write`, and a pull request from a fork gets a read-only
  token, so the comment step fails there:

  ```yaml
      - run: |
          printf '%s\n\n%s\n' "$PR_TITLE" "$PR_BODY" \
            | node .whether/scripts/whether-cli.mjs check --api-base-url https://whether.work > whether-check.txt || true
          gh pr comment "${{ github.event.pull_request.number }}" --body-file whether-check.txt
        env:
          PR_TITLE: ${{ github.event.pull_request.title }}
          PR_BODY: ${{ github.event.pull_request.body }}
          GH_TOKEN: ${{ github.token }}
  ```

## Limits

- The check reads the words it is given. A pull request whose description does not name the
  decision ("bump the Terraform module") comes back `Not graded`; `--category` grades it anyway.
- The result carries the site's use limits: it is informational, and human review is required
  before it bears on a decision about a person.
- The site's MCP endpoint is public and keyless; a CI runner behind an egress allowlist needs
  `whether.work` on it.
