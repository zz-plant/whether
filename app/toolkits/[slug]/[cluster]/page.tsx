import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../../lib/seo";
import { findToolkitDefinition } from "../../../../lib/decisionDomainCatalog";
import { readProgrammaticPayload } from "../../../../lib/seo/programmaticPayloadBuilder";
import type { SeoDecisionPayload } from "../../../../lib/report/seoDecisionPayload";
import { findSignalsCluster } from "../../../signals/clusterRoutes";
import { findToolkitCluster, toolkitCanonicalClusterStaticParams } from "../../clusterRoutes";
import { publicDecisionLabels } from "../../../../lib/report/reportFormatting";

type Params = { slug: string; cluster: string };

export const dynamicParams = true;
export const revalidate = 900;

export function generateStaticParams() {
  return toolkitCanonicalClusterStaticParams;
}


const shouldNoindexForPayload = (payload?: Pick<SeoDecisionPayload, "degraded" | "noindex" | "noindexReasons">) => {
  if (!payload) return true;
  if (payload.noindex || payload.degraded) return true;
  return (payload.noindexReasons ?? []).some((reason) => reason.startsWith("freshness-") || reason.includes("provenance"));
};

export const buildToolkitClusterMetadata = ({
  slug,
  cluster,
  toolkitTitle,
  decisionThisSession,
  contextTitle,
  isCanonical,
  payload,
}: {
  slug: string;
  cluster: string;
  toolkitTitle: string;
  decisionThisSession: string;
  contextTitle: string;
  isCanonical: boolean;
  payload?: Pick<SeoDecisionPayload, "degraded" | "noindex" | "noindexReasons">;
}) => {
  const metadata = buildPageMetadata({
    title: `${toolkitTitle} in ${contextTitle}`,
    description: decisionThisSession,
    path: `/toolkits/${slug}/${cluster}`,
    imageAlt: toolkitTitle,
  });

  if (!isCanonical || shouldNoindexForPayload(payload)) {
    metadata.robots = { index: false, follow: true };
  }

  return metadata;
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug, cluster } = await params;
  const clusterDefinition = findToolkitCluster(slug, cluster);
  const toolkit = findToolkitDefinition(slug);
  const context = findSignalsCluster(cluster);

  if (!clusterDefinition || !toolkit || !context) return {};

  const payloadRecord = await readProgrammaticPayload(`/toolkits/${slug}/${cluster}`).catch(() => undefined);

  return buildToolkitClusterMetadata({
    slug,
    cluster,
    toolkitTitle: toolkit.title,
    decisionThisSession: toolkit.decisionThisSession,
    contextTitle: context.title,
    isCanonical: clusterDefinition.isCanonical,
    payload: payloadRecord?.payload,
  });
}

export default async function ToolkitClusterPage({ params }: { params: Promise<Params> }) {
  const { slug, cluster } = await params;
  const clusterDefinition = findToolkitCluster(slug, cluster);
  const toolkit = findToolkitDefinition(slug);
  const context = findSignalsCluster(cluster);

  if (!clusterDefinition || !toolkit || !context) notFound();

  const payloadRecord = await readProgrammaticPayload(`/toolkits/${slug}/${cluster}`);
  const payload = payloadRecord.payload;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{toolkit.title}</h1>
        <p className="text-sm text-slate-300">Macro context: {context.title}</p>
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
          <Link href={`/signals/${cluster}`} className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-slate-100">Evidence page</Link>
          <Link href="/decide/ceo/capital-raising" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-slate-100">Decision Tools page</Link>
        </div>
      </section>
    </main>
  );
}
