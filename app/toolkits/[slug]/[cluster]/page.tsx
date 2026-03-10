import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DecisionContractBlock } from "../../../components/decisionContractBlock";
import { NextStepRail } from "../../../components/nextStepRail";
import { buildPageMetadata } from "../../../../lib/seo";
import { loadReportDataSafe } from "../../../../lib/report/reportData";
import { findToolkitDefinition } from "../../../../lib/informationArchitecture";
import { findToolkitCluster, toolkitClusterStaticParams } from "../../clusterRoutes";

type Params = { slug: string; cluster: string };

export const dynamicParams = false;
export const revalidate = 900;

export function generateStaticParams() {
  return toolkitClusterStaticParams;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug, cluster } = await params;
  const clusterDefinition = findToolkitCluster(slug, cluster);
  const toolkit = findToolkitDefinition(slug);

  if (!clusterDefinition || !toolkit) return {};

  return buildPageMetadata({
    title: `${toolkit.title} decision contract`,
    description: toolkit.decisionThisSession,
    path: `/toolkits/${slug}/${cluster}`,
    imageAlt: toolkit.title,
  });
}

export default async function ToolkitClusterPage({ params }: { params: Promise<Params> }) {
  const { slug, cluster } = await params;
  const clusterDefinition = findToolkitCluster(slug, cluster);
  const toolkit = findToolkitDefinition(slug);

  if (!clusterDefinition || !toolkit) notFound();

  const reportResult = await loadReportDataSafe(undefined, { route: `/toolkits/${slug}/${cluster}` });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{toolkit.title}</h1>
        <p className="text-sm text-slate-300">Toolkit contract route</p>
      </section>
      <DecisionContractBlock
        call={reportData.statusLabel}
        action={toolkit.decisionThisSession}
        threshold={toolkit.proceedThreshold}
        reversal={toolkit.reversalTrigger}
        evidence={toolkit.operatingOutcome}
      />
      <NextStepRail currentPath={`/toolkits/${slug}/${cluster}`} />
    </main>
  );
}
