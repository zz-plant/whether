import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DecisionHero } from "../../components/DecisionHero";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { buildTrustStripProps } from "../../../lib/report/evidenceReaderModel";
import { buildDegradedSourceRows } from "../../../lib/report/sourceHealth";
import { resolvePublishedConfidence } from "../../../lib/report/confidence";
import { buildPageMetadata } from "../../../lib/seo";
import { loadReportDataSafe } from "../../../lib/report/reportData";
import { isStaleForIndexing } from "../../../lib/seo/freshnessIndexation";
import { findSignalsCluster, isSignalsClusterSlug, signalsClusterStaticParams } from "../clusterRoutes";
import { ContentPageShell } from "../../components/ui/contentPageShell";
import { SignalReadingPanel } from "../components/signalReadingPanel";
import { buildSignalClusterReading, isSignalClusterSlug } from "../../../lib/report/signalClusterReading";
import { Breadcrumbs } from "../../components/ui/breadcrumbs";
import Link from "next/link";
import { decisionScenarioDefinitions, signalScenarioRoutes } from "../../seoRouteClusters";
import { toRoute } from "../../../lib/navigation/routeType";

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

  const reportResult = await loadReportDataSafe(undefined, { route: `/signals/${cluster}:metadata` });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const stale = isStaleForIndexing({
    fetchedAtIso: reportData.treasury.fetched_at,
    isFallbackSnapshot: !reportResult.ok || !reportData.treasury.isLive,
  });
  /* This week's reading on the card, where every signals card carried the same
     "EVIDENCE / What moved" box. Only while the reading is live: a stale figure
     on a card that platforms cache for days is the one place it would outlive
     the page's own warning. */
  const reading = !stale && isSignalClusterSlug(cluster) ? buildSignalClusterReading(cluster, reportData) : null;
  const readingPanel: Record<string, string> = reading?.displayValue
    ? {
        panelLabel: "This week",
        // The card's title already names the measure; the panel leads with the figure.
        panelTitle: `${reading.displayValue}${reading.unit ? ` ${reading.unit}` : ""}`,
        panelBody: reading.distanceLabel,
      }
    : {};

  const metadata = buildPageMetadata({
    title: `${clusterDefinition.title} | Evidence`,
    description: clusterDefinition.summary,
    path: `/signals/${cluster}`,
    imageAlt: clusterDefinition.title,
    imageParams: { template: "signals", eyebrow: "Evidence", ...readingPanel },
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
   * exact trap docs/agents/lessons/automation-and-deploy-gate.md records `freezeWeeklyBrief` publishing a ten-week-old
   * week through. An `ok`-only check would have stamped `index: true` on a
   * months-old reading headed "this week", and `dynamicParams = false` bakes
   * these three at build time, so the stale copy would stick. The age window
   * is the one every other live-posture page uses (72h), so a read that is a
   * few hours past its refresh is still indexed and one older than the window
   * is not, whichever store it came from.
   */
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
      {/* The signal as the card the brief opens on: the week's stamp, the signal's
          name as the heading, this week's call under it, and the lines it holds
          between. This page opened on a bare heading and a summary sentence, with
          the call in a bulleted block further down that put the call-change line
          under an area's resume label. The signal's own reading follows the card. */}
      <DecisionHero
        question={clusterDefinition.title}
        weeklyCall={reportData.actionNowShort}
        callDetail={clusterDefinition.summary}
        regime={reportData.assessment.regime}
        lines={[
          { label: DECISION_CONTRACT_LABELS.threshold.pauseIf, value: reportData.guardrailThreshold },
          { label: DECISION_CONTRACT_LABELS.watch.postureFlips, value: reportData.flipThreshold },
        ]}
        trust={buildTrustStripProps({
          recordDateLabel: reportData.recordDateLabel,
          isFallback: Boolean(reportData.treasury.fallback_at || reportData.treasury.fallback_reason),
          degradedSourceCount: buildDegradedSourceRows(reportData.sourceHealth).length,
          confidenceLabel: resolvePublishedConfidence({ assessment: reportData.assessment, record: reportData.treasury }).label,
          assessment: reportData.assessment,
        })}
      />
      {reading ? <SignalReadingPanel reading={reading} recordDateLabel={reportData.recordDateLabel} /> : null}
      {/* The five decision pages under this signal. They were in the sitemap
          and linked from nowhere on the site, so the only path to them was the
          sitemap itself — and this page, whose metadata comment calls them its
          children, never named them. */}
      {signalScenarioRoutes.some((route) => route.signalSlug === cluster) ? (
        <nav aria-labelledby="signal-decisions-heading" className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
          <h2 id="signal-decisions-heading" className="text-lg font-semibold text-slate-100">
            What this signal means for each decision
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {decisionScenarioDefinitions.map((scenario) => (
              <li key={scenario.slug}>
                <Link
                  href={toRoute(`/signals/${cluster}/${scenario.slug}`)}
                  className="text-sm font-medium text-sky-300 underline decoration-slate-600 underline-offset-4 hover:text-sky-200"
                >
                  {clusterDefinition.title}: {scenario.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </ContentPageShell>
  );
}
