import type { Metadata } from "next";
import Link from "next/link";
import { buildCompactTrustSummary, buildWeeklyCitationMetaLine } from "../../lib/report/trustStatus";
import { buildBreadcrumbList, buildPageMetadata, serializeJsonLd } from "../../lib/seo";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { BreadcrumbTrail } from "../components/breadcrumbTrail";
import { SourceHealthPanel } from "./components/sourceHealthPanel";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";

export const runtime = "edge";
export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "Sources and freshness — Whether",
  description: "Current source coverage, timestamps, and citation-ready provenance for this week's posture call.",
  path: "/sources",
  imageAlt: "Whether sources and freshness overview",
});

export default async function SourcesPage() {
  const { reportData, snapshot } = await loadWeeklyBriefSnapshot(undefined, { route: "/sources" });
  const homeBriefModel = snapshot.homeBriefModel;
  const isFallback = snapshot.isFallback;

  const trustSummary = buildCompactTrustSummary({
    confidenceLabel: homeBriefModel.confidenceLabel,
    freshnessLabel: reportData.fetchedAtLabel,
    isFallbackSnapshot: isFallback,
    isHistoricalSelection: Boolean(reportData.historicalSelection),
  });

  const citationLine = buildWeeklyCitationMetaLine({
    statusLabel: reportData.statusLabel,
    confidenceLabel: homeBriefModel.confidenceLabel,
    recordDateLabel: reportData.recordDateLabel,
    freshnessLabel: reportData.fetchedAtLabel,
  });

  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    ...buildBreadcrumbList(createBreadcrumbTrail([{ path: "/" }, { path: "/method" }, { path: "/sources" }])),
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbStructuredData) }} />
      <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Method", href: "/method" }, { label: "Sources & Freshness" }]} />

      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Sources &amp; Freshness</h1>
        <p className="text-sm text-slate-300">What changed this week: verify source status and freshness before escalating irreversible decisions.</p>
        <p className="text-sm text-slate-200">Immediate implication: {reportData.actionNowShort}</p>
      </section>

      <SourceHealthPanel rows={reportData.sourceHealth} />

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Current source coverage</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          <li><span className="text-slate-400">Treasury:</span> {reportData.treasuryProvenance.statusLabel} · {reportData.treasuryProvenance.timestampLabel}</li>
          <li><span className="text-slate-400">Macro:</span> {reportData.macroProvenance.statusLabel} · {reportData.macroProvenance.timestampLabel}</li>
          <li><span className="text-slate-400">Trust summary:</span> {trustSummary}</li>
        </ul>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Citation-ready summary</h2>
        <p className="text-xs text-slate-300">{citationLine}</p>
        <div className="flex flex-wrap gap-3 text-xs">
          <a href={reportData.treasuryProvenance.sourceUrl} target="_blank" rel="noreferrer" className="underline decoration-slate-600 underline-offset-4 hover:text-slate-100">Treasury source</a>
          <a href={reportData.macroProvenance.sourceUrl} target="_blank" rel="noreferrer" className="underline decoration-slate-600 underline-offset-4 hover:text-slate-100">Macro source</a>
        </div>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Continue decision flow</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">Weekly brief</Link>
          <Link href="/method" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">Back to trust snapshot</Link>
          <Link href="/confidence" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">Confidence and limits</Link>
        </div>
      </section>
    </main>
  );
}
