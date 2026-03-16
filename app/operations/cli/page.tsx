import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../../lib/seo";
import { CliCommandRow } from "./components/cliCommandRow";

export const metadata: Metadata = buildPageMetadata({
  title: "Whether CLI — Decision transmission terminal",
  description:
    "Install and run the Whether CLI to pull weekly posture, decision deltas, and scenario checks into terminal, scripts, and Slack automation.",
  path: "/operations/cli",
  imageAlt: "Whether CLI command reference",
});

const installCommand = "bun run cli:whether -- install --ci --api-base-url http://localhost:3000";
const statusCommand = "whether status";
const callCommand = "whether call diff --from previous --to current";
const changesCommand = "whether changes";
const historyCommand = "whether history compare --weeks 6";
const scenarioCommand = "whether scenario --tightness 0.65 --risk-appetite 0.45";
const agentCommand = "whether agent weekly --json";
const jsonCommand = "whether status --json";

const apiEndpoints = [
  "GET /api/agent?cadence=weekly|monthly|quarterly|yearly",
  "GET /api/cli/status",
  "GET /api/cli/call",
  "GET /api/cli/regime",
  "GET /api/cli/changes",
  "GET /api/cli/diagnostics",
  "GET /api/cli/history",
  "GET /api/cli/scenario",
] as const;

const workflowSteps = [
  {
    label: "1 · Status",
    detail: "Get current call and posture in seconds.",
  },
  {
    label: "2 · Changes",
    detail: "See what moved this week before revisiting bets.",
  },
  {
    label: "3 · Share",
    detail: "Use human output for meetings, --json for automation.",
  },
  {
    label: "4 · Handoff",
    detail: "Pull the canonical agent payload when another system needs the same call.",
  },
] as const;

const commandCards = [
  {
    key: "status",
    title: "status",
    summary: "Current environment and call.",
    command: statusCommand,
  },
  {
    key: "call",
    title: "call",
    summary: "Show/copy/diff leadership recommendation.",
    command: callCommand,
  },
  {
    key: "changes",
    title: "changes",
    summary: "What changed since last refresh.",
    command: changesCommand,
  },
  {
    key: "history",
    title: "history",
    summary: "Review prior calls and compare shifts.",
    command: historyCommand,
  },
  {
    key: "agent",
    title: "agent",
    summary: "Pull the canonical agent handoff payload with cadence-aware summaries.",
    command: agentCommand,
  },
] as const;

export default function OperationsCliPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100 sm:py-12">
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="weather-panel-static overflow-hidden border-sky-500/25 bg-gradient-to-br from-sky-500/10 via-slate-950 to-slate-950 px-6 py-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">CLI companion</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
            Ship decision transmission from the terminal
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            The CLI compresses the weekly loop into one flow: check posture, inspect what changed,
            and publish a shareable call without opening dashboards. Use it when you need decision
            context in under a minute.
          </p>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {workflowSteps.map((step) => (
              <div key={step.label} className="rounded-xl border border-sky-500/25 bg-slate-950/60 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-200">{step.label}</p>
                <p className="mt-1 text-sm text-slate-200">{step.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/operations" className="weather-button-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]">
              Back to operations
            </Link>
            <Link href="/operations/data" className="weather-button px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]">
              API data surface
            </Link>
          </div>
        </header>

        <section className="weather-panel-static space-y-4 px-6 py-6">
          <h2 className="text-xl font-semibold text-slate-50">Install and run</h2>
          <p className="text-sm text-slate-300">
            Local development entrypoint is <code>bun run cli:whether -- &lt;command&gt;</code>. In
            production shells use the <code>whether</code> binary.
          </p>
          <CliCommandRow command={installCommand} target="cli-install" />
        </section>

        <section className="weather-panel-static space-y-6 px-6 py-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-50">Core commands</h2>
            <p className="mt-2 text-sm text-slate-300">
              Canonical workflow: <code>status</code> for current operating call, <code>call</code>{" "}
              for recommendation delta, <code>changes</code> for this-week movement, <code>history</code>{" "}
              for retrospectives, and <code>scenario</code> for bounded what-if checks.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {commandCards.map((item) => (
              <article key={item.key} className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/70 to-slate-950 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">{item.title}</p>
                <p className="mt-1 text-sm text-slate-200">{item.summary}</p>
                <div className="mt-3">
                  <CliCommandRow command={item.command} target={`cli-${item.key}`} />
                </div>
              </article>
            ))}
            <article className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/70 to-slate-950 p-4 lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">scenario</p>
              <p className="mt-1 text-sm text-slate-200">
                Run sensitivity checks with explicit <code>--tightness</code> and <code>--risk-appetite</code> inputs.
              </p>
              <div className="mt-3">
                <CliCommandRow command={scenarioCommand} target="cli-scenario" />
              </div>
            </article>
          </div>
        </section>

        <section className="weather-panel-static space-y-4 px-6 py-6">
          <h2 className="text-xl font-semibold text-slate-50">Output modes and usage</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
              <p className="text-sm font-semibold text-slate-100">Human output</p>
              <p className="mt-1 text-sm text-slate-300">Default mode for terminal decision checks and weekly standups.</p>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
              <p className="text-sm font-semibold text-slate-100">--json</p>
              <p className="mt-1 text-sm text-slate-300">
                Backend-equal payload for scripts, CI checks, and agent handoffs. Use text mode when you want rendered terminal guidance instead.
              </p>
            </div>
          </div>
          <CliCommandRow command={jsonCommand} target="cli-json" label="Copy JSON example" />
        </section>

        <section className="weather-panel-static space-y-4 px-6 py-6">
          <h2 className="text-xl font-semibold text-slate-50">API contract references</h2>
          <p className="text-sm text-slate-300">
            These command surfaces map to versioned v1 CLI endpoints under <code>app/api/cli/*</code>.
            Keep automation pinned to these routes to avoid semantic drift.
          </p>
          <ul className="grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
            {apiEndpoints.map((endpoint) => (
              <li key={endpoint} className="rounded-lg border border-slate-800/80 bg-slate-950/70 px-3 py-2 font-mono text-xs">
                {endpoint}
              </li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}
