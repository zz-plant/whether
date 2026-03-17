import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "../../lib/navigation/routeType";
import { buildBreadcrumbList, buildPageMetadata, serializeJsonLd } from "../../lib/seo";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { BreadcrumbTrail } from "../components/breadcrumbTrail";
import { HubHero, HubPageShell, HubSection } from "../components/hubPageShell";
import { NextStepRail } from "../components/nextStepRail";
import { StaticHubNav } from "../components/staticHubNav";
import { BeginnerGlossaryPanel } from "../components/appendixSections";
import { loadReportDataSafe } from "../../lib/report/reportData";
import { buildHomeBriefModel } from "../../lib/report/homeBriefModel";
import { buildCompactTrustSummary } from "../../lib/report/trustStatus";
import { formatConfidencePlainLabel } from "../../lib/report/reportFormatting";
import { PageFlowNav } from "../components/pageFlowNav";
import { methodScrollPlan } from "../../lib/navigation/scrollPlans";

export const runtime = "edge";
export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "Method — trust, sources, and limits",
  description:
    "Canonical trust surfaces for Whether: confidence, freshness, source coverage, and method limits.",
  path: "/method",
  imageAlt: "Whether method hub",
});

export default async function MethodPage() {
  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    ...buildBreadcrumbList(
      createBreadcrumbTrail([
        { path: "/" },
        { path: "/method" },
      ]),
    ),
  };
  const reportResult = await loadReportDataSafe(undefined, { route: "/method" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const homeBriefModel = buildHomeBriefModel(reportData);
  const isFallback = Boolean(reportData.treasury.fallback_at || reportData.treasury.fallback_reason);
  const trustSummary = buildCompactTrustSummary({
    confidenceLabel: homeBriefModel.confidenceLabel,
    freshnessLabel: reportData.fetchedAtLabel,
    isFallbackSnapshot: isFallback,
    isHistoricalSelection: Boolean(reportData.historicalSelection),
  });

  const revisitBullets = [
    {
      label: "Trigger",
      detail: reportData.flipThreshold,
      href: "/confidence" as Route,
    },
    {
      label: "Impact",
      detail: reportData.actionNowShort,
      href: "/" as Route,
    },
    {
      label: "Recovery",
      detail: isFallback
        ? "Recovery condition: one live refresh with no fallback flags before escalating irreversible approvals."
        : "Recovery condition: confidence returns to HIGH and transition watch is OFF before expanding fixed-cost commitments.",
      href: "/sources" as Route,
    },
  ];

  return (
    <HubPageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbStructuredData) }} />
      <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Method" }]} />
      <StaticHubNav currentPath="/method" />
      <HubHero
        eyebrow="Trust audit hub"
        title="One screen for confidence, freshness, provenance, and reversal conditions."
        description="Use this page as the trust audit hub linked from Weekly Brief. Open Learn only if you need optional background context."
        actions={(
          <>
            <Link href="/" className="weather-button inline-flex items-center justify-center">
              Return to Weekly Brief
            </Link>
            <Link href="/methodology" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em] text-slate-200 hover:border-sky-400/70 hover:text-slate-100">
              Open formula reference
            </Link>
          </>
        )}
        stats={[
          { label: "Posture", value: `${reportData.statusLabel} (${reportData.recordDateLabel})` },
          { label: "Confidence", value: formatConfidencePlainLabel(homeBriefModel.confidenceLabel) },
          { label: "Trust status", value: trustSummary, detail: `Freshness: ${reportData.fetchedAtLabel}` },
        ]}
      />

      <PageFlowNav
        eyebrow={methodScrollPlan.eyebrow}
        title={methodScrollPlan.title}
        description={methodScrollPlan.description}
        items={methodScrollPlan.items}
      />

      <HubSection id="trust-hub-links" title="Trust hub links" description="Open the exact trust surface you need instead of hunting through long documentation." className="scroll-mt-28">
        <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/sources" className="weather-hub-link-card space-y-2">
          <h2 className="text-lg font-semibold text-slate-100">Sources and freshness</h2>
          <p className="text-sm text-slate-300">Inspect source coverage, update cadence, and provenance for each signal.</p>
        </Link>
        <Link href="/confidence" className="weather-hub-link-card space-y-2">
          <h2 className="text-lg font-semibold text-slate-100">Confidence and limits</h2>
          <p className="text-sm text-slate-300">Understand uncertainty, assumptions, and conditions that can flip the call.</p>
        </Link>
        <Link href="/methodology" className="weather-hub-link-card space-y-2">
          <h2 className="text-lg font-semibold text-slate-100">Formula reference</h2>
          <p className="text-sm text-slate-300">Review formulas, weighting choices, and fallback logic in full detail.</p>
        </Link>
        <Link href="/learn" className="weather-hub-link-card space-y-2">
          <h2 className="text-lg font-semibold text-slate-100">Optional concepts &amp; diagnostics</h2>
          <p className="text-sm text-slate-300">Open Learn only when you need deeper conceptual background beyond the trust audit.</p>
        </Link>
        </div>
      </HubSection>

      <HubSection id="trust-snapshot" title="Trust snapshot" className="scroll-mt-28">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-400">Last updated: {reportData.fetchedAtLabel}</p>
        </div>
        <ul className="space-y-2 text-sm text-slate-200">
          <li><span className="text-slate-400">Posture:</span> {reportData.statusLabel} (effective {reportData.recordDateLabel})</li>
          <li><span className="text-slate-400">Confidence:</span> {formatConfidencePlainLabel(homeBriefModel.confidenceLabel)}</li>
          <li><span className="text-slate-400">Trust status:</span> {trustSummary}</li>
          <li><span className="text-slate-400">Source coverage:</span> {reportData.treasuryProvenance.statusLabel} · {reportData.macroProvenance.statusLabel}</li>
        </ul>
      </HubSection>

      <HubSection
        id="revisit-call"
        title="When to distrust or revisit this call"
        className="scroll-mt-28"
      >
        <ul className="space-y-3 text-sm text-slate-200">
          {revisitBullets.map((item) => (
            <li key={item.label} className="weather-hub-card rounded-xl px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
              <p className="mt-1">{item.detail}</p>
              <Link href={item.href} className="mt-2 inline-flex min-h-[44px] items-center text-xs font-semibold uppercase tracking-[0.12em] text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">Review evidence</Link>
            </li>
          ))}
        </ul>
      </HubSection>

      <BeginnerGlossaryPanel />

      <NextStepRail currentPath="/method" />
    </HubPageShell>
  );
}
