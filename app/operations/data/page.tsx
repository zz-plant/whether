import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../../lib/seo";
import { siteUrl } from "../../../lib/siteUrl";
import { PlanningSnippetsPanel } from "../components/planningSnippetsPanel";

export const metadata: Metadata = buildPageMetadata({
  title: "Whether Report — Weekly data access",
  description:
    "Human-friendly guide for the weekly API endpoint, including example request and response usage.",
  path: "/operations/data",
  imageAlt: "Whether weekly data access guide",
});

const endpointUrl = `${siteUrl}/api/weekly`;
const agentEndpointUrl = `${siteUrl}/api/agent?cadence=weekly`;
const apiReferenceUrl = "https://github.com/zz-plant/whether/blob/main/docs/developer/api-reference.md";
const curlExample = `curl -s ${endpointUrl}`;
const machineCurlExample = `curl -s ${agentEndpointUrl}`;
const responseExample = `{
  "updatedAt": "2026-02-01T12:00:00.000Z",
  "summary": {
    "regime": "Defensive",
    "confidence": "Live • Treasury verified",
    "recommendedMoves": [
      "Protect core roadmap delivery",
      "Gate discretionary expansions",
      "Increase weekly decision cadence"
    ]
  }
}`;

export default async function OperationsDataPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <section className="mx-auto max-w-4xl space-y-6">
        <header className="weather-panel-static space-y-4 px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
            Weekly API companion
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
            Weekly data access for operators
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            Use this page when you need the weekly summary endpoint in automation, dashboards, or
            internal briefs. The API remains machine-first; this page gives a quick human bridge for
            implementation without depending on a live report render.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/operations" className="weather-button-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]">
              Back to playbook
            </Link>
            <Link href="/operations#ops-export-briefs" className="weather-button px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]">
              Open briefings
            </Link>
          </div>
        </header>

        <section id="weekly-api" className="weather-panel-static space-y-4 px-6 py-6">
          <h2 className="text-xl font-semibold text-slate-50">Endpoint</h2>
          <p className="text-sm text-slate-300">Copy and reuse the weekly summary endpoint.</p>
          <pre className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 text-xs text-slate-100">
            {endpointUrl}
          </pre>
        </section>

        <section className="weather-panel-static space-y-4 px-6 py-6">
          <h2 className="text-xl font-semibold text-slate-50">Example request</h2>
          <pre className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 text-xs text-slate-100">
            {curlExample}
          </pre>
        </section>

        <section className="weather-panel-static space-y-4 px-6 py-6">
          <h2 className="text-xl font-semibold text-slate-50">Machine endpoints</h2>
          <p className="text-sm text-slate-300">
            Start with curl, then wire the same routes into your agent loop.
          </p>
          <pre className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 text-xs text-slate-100">
            {machineCurlExample}
          </pre>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>
              <a
                href={apiReferenceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sky-200 underline-offset-2 hover:underline"
              >
                Developer API reference (GitHub)
              </a>{" "}
              — full endpoint contracts.
            </li>
            <li>
              <Link href="/llms.txt" className="text-sky-200 underline-offset-2 hover:underline">
                /llms.txt
              </Link>{" "}
              — plain-text machine onboarding.
            </li>
            <li>
              <Link href="/.well-known/whether-agent.json" className="text-sky-200 underline-offset-2 hover:underline">
                /.well-known/whether-agent.json
              </Link>{" "}
              — JSON manifest for tools and agents.
            </li>
            <li>
              <code>/api/agent</code> + <code>/api/weekly</code> — core weekly machine routes.
            </li>
          </ul>
          <p className="text-sm text-slate-300">
            Keep machine pulls anchored to the weekly brief: review the latest call on{" "}
            <Link href="/" className="text-sky-200 underline-offset-2 hover:underline">
              the homepage brief
            </Link>{" "}
            before sharing automations in meetings or Slack.
          </p>
        </section>

        <section className="weather-panel-static space-y-4 px-6 py-6">
          <h2 className="text-xl font-semibold text-slate-50">Example response shape</h2>
          <pre className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 text-xs text-slate-100">
            {responseExample}
          </pre>
        </section>

        <PlanningSnippetsPanel />
      </section>
    </main>
  );
}
