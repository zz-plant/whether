import type { Metadata } from "next";
import { buildCompactTrustSummary, buildWeeklyCitationMetaLine } from "../../lib/report/trustStatus";
import { buildBreadcrumbList, buildPageMetadata, serializeJsonLd } from "../../lib/seo";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { BreadcrumbTrail } from "../components/breadcrumbTrail";
import { SourceHealthPanel } from "./components/sourceHealthPanel";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { SecondaryPageHeader, SecondaryPageSection, SecondaryPageShell } from "../components/secondaryPageShell";
import { ButtonLink } from "../components/ui/buttonLink";

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
    <SecondaryPageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbStructuredData) }} />
      <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Trust", href: "/method" }, { label: "Sources & Freshness" }]} />

      <SecondaryPageHeader
        title="Sources & Freshness"
        description={`What changed this week: verify source status and freshness before escalating irreversible decisions. Immediate implication: ${reportData.actionNowShort}`}
      />

      <SourceHealthPanel rows={reportData.sourceHealth} />

      <SecondaryPageSection title="Current source coverage">
        <ul className="space-y-2 text-sm text-slate-200">
          <li><span className="text-slate-400">Treasury:</span> {reportData.treasuryProvenance.statusLabel} · {reportData.treasuryProvenance.timestampLabel}</li>
          <li><span className="text-slate-400">Macro:</span> {reportData.macroProvenance.statusLabel} · {reportData.macroProvenance.timestampLabel}</li>
          <li><span className="text-slate-400">Trust summary:</span> {trustSummary}</li>
        </ul>
      </SecondaryPageSection>

      <SecondaryPageSection title="Citation-ready summary">
        <p className="text-xs text-slate-300">{citationLine}</p>
        <div className="flex flex-wrap gap-3 text-xs">
          <a href={reportData.treasuryProvenance.sourceUrl} target="_blank" rel="noreferrer" className="underline decoration-slate-600 underline-offset-4 hover:text-slate-100">Treasury source</a>
          <a href={reportData.macroProvenance.sourceUrl} target="_blank" rel="noreferrer" className="underline decoration-slate-600 underline-offset-4 hover:text-slate-100">Macro source</a>
        </div>
      </SecondaryPageSection>

      <SecondaryPageSection title="Continue decision flow">
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/" variant="pill">Weekly brief</ButtonLink>
          <ButtonLink href="/method" variant="pill">Back to trust snapshot</ButtonLink>
          <ButtonLink href="/method#formula-reference" variant="pill">Formula reference (Trust)</ButtonLink>
          <ButtonLink href="/confidence" variant="pill">Confidence and limits</ButtonLink>
        </div>
      </SecondaryPageSection>
    </SecondaryPageShell>
  );
}
