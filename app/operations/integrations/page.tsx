import type { Metadata } from "next";
import Link from "next/link";
import { loadReportDataSafe } from "../../../lib/report/reportData";
import { buildPageMetadata } from "../../../lib/seo";
import { buildWeeklyMandatePayload, integrationTargets } from "../../../lib/integrationBriefs";
import { WorkAppLabel } from "../../components/workAppIcon";

export const metadata: Metadata = buildPageMetadata({
  title: "Planning integrations — Whether",
  description: "Preview Slack, Notion, and Linear payloads for weekly mandate distribution.",
  path: "/operations/integrations",
  imageAlt: "Planning integrations",
});

export default async function OperationsIntegrationsPage() {
  const reportResult = await loadReportDataSafe(undefined, { route: "/operations/integrations" });
  const { assessment, treasury } = reportResult.ok ? reportResult.data : reportResult.fallback;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Planning integrations</h1>
        <p className="text-sm text-slate-300">Weekly mandate payloads are now generated for <WorkAppLabel app="slack" label="Slack" />, <WorkAppLabel app="notion" label="Notion" />, and <WorkAppLabel app="linear" label="Linear" /> from the current regime.</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {integrationTargets.map((target) => (
          <article key={target} className="weather-panel space-y-3 px-6 py-6">
            <h2 className="text-lg font-semibold text-slate-100"><WorkAppLabel app={target} label={target} className="inline-flex items-center gap-2 capitalize" /></h2>
            <p className="text-xs text-slate-300">Endpoint: <code>/api/integrations/weekly-mandate?target={target}</code></p>
            <pre className="overflow-x-auto rounded-lg border border-slate-700/70 bg-slate-950/60 p-3 text-xs text-slate-200">
{JSON.stringify(buildWeeklyMandatePayload(target, assessment, treasury), null, 2)}
            </pre>
          </article>
        ))}
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">API usage</h2>
        <pre className="overflow-x-auto rounded-lg border border-slate-700/70 bg-slate-950/60 p-3 text-xs text-slate-200">
curl /api/integrations/weekly-mandate?target=slack

curl /api/integrations/weekly-mandate?target=notion

curl /api/integrations/weekly-mandate?target=linear
        </pre>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/operations" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
          Back to operations
        </Link>
      </div>
    </main>
  );
}
