import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DecisionContractBlock } from "../../components/decisionContractBlock";
import { NextStepRail } from "../../components/nextStepRail";
import { buildPageMetadata } from "../../../lib/seo";
import { loadReportDataSafe } from "../../../lib/report/reportData";
import { findSignalsCluster, isSignalsClusterSlug, signalsClusterStaticParams } from "../clusterRoutes";

type Params = { cluster: string };

export const dynamicParams = false;
export const revalidate = 900;

export function generateStaticParams() {
  return signalsClusterStaticParams;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { cluster } = await params;
  const clusterDefinition = findSignalsCluster(cluster);

  if (!clusterDefinition) return {};

  const metadata = buildPageMetadata({
    title: `${clusterDefinition.title} | Evidence`,
    description: clusterDefinition.summary,
    path: `/signals/${cluster}`,
    imageAlt: clusterDefinition.title,
  });

  metadata.robots = { index: false, follow: true };

  return metadata;
}

export default async function SignalsClusterPage({ params }: { params: Promise<Params> }) {
  const { cluster } = await params;
  if (!isSignalsClusterSlug(cluster)) notFound();
  const clusterDefinition = findSignalsCluster(cluster);
  if (!clusterDefinition) notFound();

  const reportResult = await loadReportDataSafe(undefined, { route: `/signals/${cluster}` });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{clusterDefinition.title}</h1>
        <p className="text-sm text-slate-300">{clusterDefinition.summary}</p>
      </section>
      <DecisionContractBlock
        call={reportData.statusLabel}
        action={reportData.actionNowShort}
        threshold={reportData.guardrailThreshold}
        reversal={reportData.flipThreshold}
        evidence={clusterDefinition.evidence}
      />
      <NextStepRail currentPath={`/signals/${cluster}`} />
    </main>
  );
}
