import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DecisionContractBlock } from "../../components/decisionContractBlock";
import { buildPageMetadata } from "../../../lib/seo";
import { loadReportDataSafe } from "../../../lib/report/reportData";
import { isStaleForIndexing } from "../../../lib/seo/freshnessIndexation";
import { findSignalsCluster, isSignalsClusterSlug, signalsClusterStaticParams } from "../clusterRoutes";
import { ContentPageShell } from "../../components/ui/contentPageShell";
import { SignalReadingPanel } from "../components/signalReadingPanel";
import { buildSignalClusterReading, isSignalClusterSlug } from "../../../lib/report/signalClusterReading";
import { Breadcrumbs } from "../../components/ui/breadcrumbs";
import {
  ThresholdGateGlyph,
  MarketVectorBarometer,
} from "../../components/illustrations/SignalTelemetryGlyphs";

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
   *
   * Gated on the reading's age and on `treasury.isLive`, not on
   * `reportResult.ok`. `loadReportDataSafe` resolves `ok: true` whenever
   * assembly *succeeded*, and assembly succeeds on the bundled snapshot — the
   * exact trap CLAUDE.md records `freezeWeeklyBrief` publishing a ten-week-old
   * week through. An `ok`-only check would have stamped `index: true` on a
   * months-old reading headed "this week", and `dynamicParams = false` bakes
   * these three at build time, so the stale copy would stick. The age window
   * is the one every other live-posture page uses (72h), so a read that is a
   * few hours past its refresh is still indexed and one older than the window
   * is not, whichever store it came from.
   */
  const reportResult = await loadReportDataSafe(undefined, { route: `/signals/${cluster}:metadata` });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const stale = isStaleForIndexing({
    fetchedAtIso: reportData.treasury.fetched_at,
    isFallbackSnapshot: !reportResult.ok || !reportData.treasury.isLive,
  });
  if (stale) {
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
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Evidence", href: "/signals" },
          { label: clusterDefinition.title },
        ]}
      />
      <section className="weather-panel space-y-3 px-6 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{clusterDefinition.title}</h1>
            <p className="text-sm text-slate-300">{clusterDefinition.summary}</p>
          </div>
          {/* The glyph mirrors the week's actual direction from the reading;
              a hardcoded state would contradict the panel below it. `hold`
              covers no-reading weeks and flat reads, so the decoration never
              asserts a direction the data does not. */}
          {cluster === "yield-curve-flip-watch" ? (
            <ThresholdGateGlyph size={48} className="self-start sm:self-center" />
          ) : (
            <MarketVectorBarometer
              direction={
                reading?.directionTone === "tightening"
                  ? "tighten"
                  : reading?.directionTone === "easing"
                    ? "ease"
                    : "hold"
              }
              size={48}
              className="self-start sm:self-center"
            />
          )}
        </div>
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
