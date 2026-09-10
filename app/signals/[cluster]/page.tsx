import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DecisionContractBlock } from "../../components/decisionContractBlock";
import { buildPageMetadata } from "../../../lib/seo";
import { loadReportDataSafe } from "../../../lib/report/reportData";
import { findSignalsCluster, isSignalsClusterSlug, signalsClusterStaticParams } from "../clusterRoutes";
import { ContentPageShell } from "../../components/ui/contentPageShell";
import { SignalReadingPanel } from "../components/signalReadingPanel";
import { buildSignalClusterReading, isSignalClusterSlug } from "../../../lib/report/signalClusterReading";

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

  /*
   * Indexable while the reading is live.
   *
   * These three were noindex unconditionally, which left the 15 scenario pages
   * beneath them as indexable leaves hanging off a parent that passed no
   * authority and appeared in no crawlable path — an inverted hierarchy. They
   * were also thin enough to deserve it: a heading, a sentence, and the
   * site-wide call. Now that each carries its own signal's reading they clear
   * the bar in AGENTS.md (current posture, immediate implication, citeable
   * summary, link back), so the remaining reason to withhold them is staleness,
   * which is the same rule the scenario pages already follow.
   */
  const reportResult = await loadReportDataSafe(undefined, { route: `/signals/${cluster}:metadata` });
  if (!reportResult.ok) {
    metadata.robots = { index: false, follow: true };
  }

  return metadata;
}

export default async function SignalsClusterPage({ params }: { params: Promise<Params> }) {
  const { cluster } = await params;
  if (!isSignalsClusterSlug(cluster)) notFound();
  const clusterDefinition = findSignalsCluster(cluster);
  if (!clusterDefinition) notFound();

  const reportResult = await loadReportDataSafe(undefined, { route: `/signals/${cluster}` });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const reading = isSignalClusterSlug(cluster) ? buildSignalClusterReading(cluster, reportData) : null;

  return (
    <ContentPageShell>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{clusterDefinition.title}</h1>
        <p className="text-sm text-slate-300">{clusterDefinition.summary}</p>
      </section>
      {reading ? <SignalReadingPanel reading={reading} recordDateLabel={reportData.recordDateLabel} /> : null}
      <DecisionContractBlock
        call={reportData.statusLabel}
        action={reportData.actionNowShort}
        threshold={reportData.guardrailThreshold}
        reversal={reportData.flipThreshold}
        evidence={clusterDefinition.evidence}
      />
    </ContentPageShell>
  );
}
