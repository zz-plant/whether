import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../../lib/seo";
import { readProgrammaticPayload } from "../../../../lib/seo/programmaticPayloadBuilder";
import { findUseCaseRole } from "../../../../lib/decisionDomainCatalog";
import { decideCanonicalClusterStaticParams, findDecideClusterRoute } from "../../clusterRoutes";
import { findDecisionScenario } from "../../../seoRouteClusters";
import type { SeoDecisionPayload } from "../../../../lib/report/seoDecisionPayload";
import { publicDecisionLabels } from "../../../../lib/report/reportFormatting";

type Params = { slug: string; cluster: string };

export const dynamicParams = true;
export const revalidate = 900;

export function generateStaticParams() {
  return decideCanonicalClusterStaticParams;
}


const shouldNoindexForPayload = (payload?: Pick<SeoDecisionPayload, "degraded" | "noindex" | "noindexReasons">) => {
  if (!payload) return true;
  if (payload.noindex || payload.degraded) return true;
  return (payload.noindexReasons ?? []).some((reason) => reason.startsWith("freshness-") || reason.includes("provenance"));
};

export const buildDecideClusterMetadata = ({
  slug,
  cluster,
  roleTitle,
  roleDescription,
  scenarioTitle,
  isCanonical,
  payload,
}: {
  slug: string;
  cluster: string;
  roleTitle: string;
  roleDescription: string;
  scenarioTitle: string;
  isCanonical: boolean;
  payload?: Pick<SeoDecisionPayload, "degraded" | "noindex" | "noindexReasons">;
}) => {
  const metadata = buildPageMetadata({
    title: `${roleTitle}: ${scenarioTitle} decision scenario`,
    description: roleDescription,
    path: `/decide/${slug}/${cluster}`,
    imageAlt: roleTitle,
  });

  if (!isCanonical || shouldNoindexForPayload(payload)) {
    metadata.robots = { index: false, follow: true };
  }

  return metadata;
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug, cluster } = await params;
  const routeDefinition = findDecideClusterRoute(slug, cluster);
  const roleDefinition = findUseCaseRole(slug);
  const scenarioDefinition = findDecisionScenario(cluster);

  if (!routeDefinition || !roleDefinition || !scenarioDefinition) return {};

  const payloadRecord = await readProgrammaticPayload(`/decide/${slug}/${cluster}`).catch(() => undefined);

  return buildDecideClusterMetadata({
    slug,
    cluster,
    roleTitle: roleDefinition.title,
    roleDescription: roleDefinition.decisions[0] ?? roleDefinition.title,
    scenarioTitle: scenarioDefinition.title,
    isCanonical: routeDefinition.isCanonical,
    payload: payloadRecord?.payload,
  });
}

export default async function DecideClusterPage({ params }: { params: Promise<Params> }) {
  const { slug, cluster } = await params;
  const routeDefinition = findDecideClusterRoute(slug, cluster);
  const roleDefinition = findUseCaseRole(slug);
  const scenarioDefinition = findDecisionScenario(cluster);

  if (!routeDefinition || !roleDefinition || !scenarioDefinition) notFound();

  const payloadRecord = await readProgrammaticPayload(`/decide/${slug}/${cluster}`);
  const payload = payloadRecord.payload;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{roleDefinition.title}: {scenarioDefinition.title}</h1>
        <p className="text-sm text-slate-300">Role/scenario normalization for weekly decision transmission.</p>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Decision contract</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          <li>• <span className="font-semibold text-slate-100">{publicDecisionLabels.call}:</span> {payload.currentCall}</li>
          <li>• <span className="font-semibold text-slate-100">{publicDecisionLabels.action}:</span> {payload.immediateAction}</li>
          <li>• <span className="font-semibold text-slate-100">{publicDecisionLabels.threshold}:</span> {payload.triggerThreshold}</li>
          <li>• <span className="font-semibold text-slate-100">{publicDecisionLabels.reversal}:</span> {payload.reversalCondition}</li>
        </ul>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Continue decision flow</h2>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <Link href="/" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-slate-100">Weekly brief</Link>
          <Link href="/decide#unresolved-question-router" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-slate-100">Decision Tools</Link>
          <Link href="/signals/capital-tightness-watch" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-slate-100">Evidence page</Link>
          <Link href="/toolkits/focus" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-slate-100">Decision toolkit</Link>
        </div>
      </section>
    </main>
  );
}
