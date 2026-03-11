import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../../lib/seo";
import { loadReportDataSafe } from "../../../../lib/report/reportData";
import { buildHomeBriefModel } from "../../../../lib/report/homeBriefModel";
import { buildSeoDecisionPayload } from "../../../../lib/report/seoDecisionPayload";
import { findUseCaseRole } from "../../../../lib/informationArchitecture";
import { decideClusterStaticParams, findDecideClusterRoute } from "../../clusterRoutes";
import { findDecisionScenario } from "../../../seoRouteClusters";

type Params = { slug: string; cluster: string };

export const dynamicParams = false;
export const revalidate = 900;

export function generateStaticParams() {
  return decideClusterStaticParams;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug, cluster } = await params;
  const routeDefinition = findDecideClusterRoute(slug, cluster);
  const roleDefinition = findUseCaseRole(slug);
  const scenarioDefinition = findDecisionScenario(cluster);

  if (!routeDefinition || !roleDefinition || !scenarioDefinition) return {};

  const metadata = buildPageMetadata({
    title: `${roleDefinition.title}: ${scenarioDefinition.title} decision scenario`,
    description: roleDefinition.decisions[0] ?? roleDefinition.title,
    path: `/decide/${slug}/${cluster}`,
    imageAlt: roleDefinition.title,
  });

  if (!routeDefinition.isCanonical) {
    metadata.robots = { index: false, follow: true };
  }

  return metadata;
}

export default async function DecideClusterPage({ params }: { params: Promise<Params> }) {
  const { slug, cluster } = await params;
  const routeDefinition = findDecideClusterRoute(slug, cluster);
  const roleDefinition = findUseCaseRole(slug);
  const scenarioDefinition = findDecisionScenario(cluster);

  if (!routeDefinition || !roleDefinition || !scenarioDefinition) notFound();

  const reportResult = await loadReportDataSafe(undefined, { route: `/decide/${slug}/${cluster}` });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const homeBriefModel = buildHomeBriefModel(reportData);
  const mappedRules = homeBriefModel.decisionRules.filter((rule) => rule.area === scenarioDefinition.slug);
  const payload = buildSeoDecisionPayload({
    assessment: reportData.assessment,
    mappedRules,
    mappedDecisionAreas: [scenarioDefinition.slug],
    fallbackCurrentCall: reportData.statusLabel,
    fallbackImmediateAction: reportData.actionNowShort,
    reportEvidenceItems: reportData.reportEvidenceItems,
    freshnessLabel: reportData.fetchedAtLabel,
    recordDateLabel: reportData.recordDateLabel,
    confidenceLabel: homeBriefModel.confidenceLabel,
    transitionWatch: homeBriefModel.transitionWatch,
    isFallbackSnapshot: !reportResult.ok,
    provenanceStatusLabel: reportData.treasuryProvenance?.statusLabel,
    fetchedAtIso: reportData.treasury.fetched_at,
  });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{roleDefinition.title}: {scenarioDefinition.title}</h1>
        <p className="text-sm text-slate-300">Role/scenario normalization for weekly decision transmission.</p>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Decision contract</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          <li>• <span className="font-semibold text-slate-100">Call:</span> {payload.currentCall}</li>
          <li>• <span className="font-semibold text-slate-100">Action:</span> {payload.immediateAction}</li>
          <li>• <span className="font-semibold text-slate-100">Threshold:</span> {payload.triggerThreshold}</li>
          <li>• <span className="font-semibold text-slate-100">Reversal:</span> {payload.reversalCondition}</li>
        </ul>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Continue decision flow</h2>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <Link href="/" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-slate-100">Weekly brief</Link>
          <Link href="/signals/capital-tightness-watch" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-slate-100">Signals page</Link>
          <Link href="/toolkits/focus/capital-tightness-watch" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-slate-100">Toolkit page</Link>
        </div>
      </section>
    </main>
  );
}
