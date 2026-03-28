import type { Metadata } from "next";
import { buildCompactTrustSummary, buildFailureModeWarnings } from "../../lib/report/trustStatus";
import { formatConfidencePlainLabel } from "../../lib/report/reportFormatting";
import { buildBreadcrumbList, buildPageMetadata, serializeJsonLd } from "../../lib/seo";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { BreadcrumbTrail } from "../components/breadcrumbTrail";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { SecondaryPageHeader, SecondaryPageSection, SecondaryPageShell } from "../components/secondaryPageShell";
import { ButtonLink } from "../components/ui/buttonLink";

export const runtime = "edge";
export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "Confidence and limits — Whether",
  description: "Confidence level, flip thresholds, and failure-mode checks for this week's operating posture.",
  path: "/confidence",
  imageAlt: "Whether confidence and limits",
});

export default async function ConfidencePage() {
  const { reportData, snapshot } = await loadWeeklyBriefSnapshot(undefined, { route: "/confidence" });
  const homeBriefModel = snapshot.homeBriefModel;
  const isFallback = snapshot.isFallback;

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
    <SecondaryPageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbStructuredData) }} />
      <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Trust", href: "/method" }, { label: "Confidence & Limits" }]} />

      <SecondaryPageHeader
        title="Confidence & Limits"
        description={`Confidence now: ${formatConfidencePlainLabel(homeBriefModel.confidenceLabel)} · Regime shift watch ${homeBriefModel.transitionWatch}. Immediate implication: ${reportData.actionNowShort}`}
      />

      <SecondaryPageSection title="Bounded decision checks">
        <ul className="space-y-2 text-sm text-slate-200">
          <li><span className="text-slate-400">Flip trigger:</span> {reportData.flipThreshold}</li>
          <li><span className="text-slate-400">Pause trigger:</span> {reportData.guardrailThreshold}</li>
          <li><span className="text-slate-400">Reversal condition:</span> Confidence returns to HIGH and shift watch turns OFF before expanding fixed-cost approvals.</li>
          <li><span className="text-slate-400">Trust summary:</span> {trustSummary}</li>
        </ul>
      </SecondaryPageSection>

      <SecondaryPageSection title="Failure-mode checks">
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
      </SecondaryPageSection>

      <SecondaryPageSection title="Continue decision flow">
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/" variant="pill">Weekly brief</ButtonLink>
          <ButtonLink href="/method" variant="pill">Back to trust snapshot</ButtonLink>
          <ButtonLink href="/method#formula-reference" variant="pill">Formula reference (Trust)</ButtonLink>
          <ButtonLink href="/sources" variant="pill">Sources and freshness</ButtonLink>
        </div>
      </SecondaryPageSection>
    </SecondaryPageShell>
  );
}
