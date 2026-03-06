import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../../lib/seo";
import { siteUrl } from "../../../lib/siteUrl";
import { loadReportDataSafe } from "../../../lib/report/reportData";
import { PlanningSnippetsPanel } from "../components/planningSnippetsPanel";

export const metadata: Metadata = buildPageMetadata({
  title: "Whether Report — Weekly data access",
  description:
    "Human-friendly guide for the weekly API endpoint, including example request and response usage.",
  path: "/operations/data",
  imageAlt: "Whether weekly data access guide",
});

const endpointUrl = `${siteUrl}/api/weekly`;
const curlExample = `curl -s ${endpointUrl}`;
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
  const reportResult = await loadReportDataSafe(undefined, { route: "/operations/data" });
  const { statusLabel, recordDateLabel } = reportResult.ok ? reportResult.data : reportResult.fallback;

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
            implementation.
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
          <h2 className="text-xl font-semibold text-slate-50">Example response shape</h2>
          <pre className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 text-xs text-slate-100">
            {responseExample}
          </pre>
        </section>

        <PlanningSnippetsPanel statusLabel={statusLabel} recordDateLabel={recordDateLabel} />
      </section>
    </main>
  );
}
