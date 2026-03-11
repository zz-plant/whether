import type { Metadata } from "next";
import Link from "next/link";
import { loadReportDataSafe } from "../../lib/report/reportData";
import { buildHomeBriefModel } from "../../lib/report/homeBriefModel";
import { buildCompactTrustSummary, buildFailureModeWarnings } from "../../lib/report/trustStatus";
import { formatConfidencePlainLabel } from "../../lib/report/reportFormatting";
import { buildBreadcrumbList, buildPageMetadata, serializeJsonLd } from "../../lib/seo";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { BreadcrumbTrail } from "../components/breadcrumbTrail";

export const runtime = "edge";
export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "Confidence and limits — Whether",
  description: "Confidence level, flip thresholds, and failure-mode checks for this week's operating posture.",
  path: "/confidence",
  imageAlt: "Whether confidence and limits",
});

export default async function ConfidencePage() {
  const reportResult = await loadReportDataSafe(undefined, { route: "/confidence" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const homeBriefModel = buildHomeBriefModel(reportData);
  const isFallback = Boolean(reportData.treasury.fallback_at || reportData.treasury.fallback_reason);

  const trustSummary = buildCompactTrustSummary({
    confidenceLabel: homeBriefModel.confidenceLabel,
    freshnessLabel: reportData.fetchedAtLabel,
    isFallbackSnapshot: isFallback,
    isHistoricalSelection: Boolean(reportData.historicalSelection),
  });

  const warnings = buildFailureModeWarnings({
    confidenceLabel: homeBriefModel.confidenceLabel,
    transitionWatch: homeBriefModel.transitionWatch,
    freshnessLabel: reportData.fetchedAtLabel,
    isFallbackSnapshot: isFallback,
    provenanceStatusLabel: reportData.treasuryProvenance.statusLabel,
    changedSignals: reportData.reportDynamics.changedSignals,
    anomalySignals: reportData.reportDynamics.anomalySignals,
  });

  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    ...buildBreadcrumbList(createBreadcrumbTrail([{ path: "/" }, { path: "/method" }, { path: "/confidence" }])),
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbStructuredData) }} />
      <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Methodology & Data", href: "/method" }, { label: "Confidence & Limits" }]} />

      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Confidence &amp; Limits</h1>
        <p className="text-sm text-slate-200">Confidence now: {formatConfidencePlainLabel(homeBriefModel.confidenceLabel)} · Regime shift watch {homeBriefModel.transitionWatch}.</p>
        <p className="text-sm text-slate-300">Immediate implication: {reportData.actionNowShort}</p>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Bounded decision checks</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          <li><span className="text-slate-400">Flip trigger:</span> {reportData.flipThreshold}</li>
          <li><span className="text-slate-400">Pause trigger:</span> {reportData.guardrailThreshold}</li>
          <li><span className="text-slate-400">Reversal condition:</span> Confidence returns to HIGH and shift watch turns OFF before expanding fixed-cost approvals.</li>
          <li><span className="text-slate-400">Trust summary:</span> {trustSummary}</li>
        </ul>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Failure-mode checks</h2>
        {warnings.length === 0 ? (
          <p className="text-sm text-slate-300">No active compact failure-mode warning. Continue with staged approvals.</p>
        ) : (
          <ul className="space-y-3 text-sm text-slate-200">
            {warnings.map((warning) => (
              <li key={warning.id} className="rounded-xl border border-slate-800/80 bg-slate-900/40 px-4 py-3">
                <p className="font-semibold text-slate-100">{warning.warning}</p>
                <p className="mt-1 text-slate-300">{warning.mitigationCheck}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Continue decision flow</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">Weekly brief</Link>
          <Link href="/method" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">Back to trust snapshot</Link>
          <Link href="/sources" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">Sources and freshness</Link>
        </div>
      </section>
    </main>
  );
}
