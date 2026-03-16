import type { Metadata } from "next";
import Link from "next/link";
import { buildBreadcrumbList, buildPageMetadata, serializeJsonLd } from "../../lib/seo";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { BreadcrumbTrail } from "../components/breadcrumbTrail";
import { NextStepRail } from "../components/nextStepRail";
import { StaticHubNav } from "../components/staticHubNav";
import { loadReportDataSafe } from "../../lib/report/reportData";
import { buildHomeBriefModel } from "../../lib/report/homeBriefModel";
import { buildCompactTrustSummary } from "../../lib/report/trustStatus";
import { formatConfidencePlainLabel } from "../../lib/report/reportFormatting";

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
      href: "/confidence",
    },
    {
      label: "Impact",
      detail: reportData.actionNowShort,
      href: "/",
    },
    {
      label: "Recovery",
      detail: isFallback
        ? "Recovery condition: one live refresh with no fallback flags before escalating irreversible approvals."
        : "Recovery condition: confidence returns to HIGH and transition watch is OFF before expanding fixed-cost commitments.",
      href: "/sources",
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbStructuredData) }} />
      <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Method" }]} />
      <StaticHubNav currentPath="/method" />
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Method</h1>
        <p className="text-sm text-slate-300">
          Use this page as the trust snapshot: current confidence, freshness, and reversal conditions in one screen. Open <span className="font-semibold text-slate-100">Methodology</span> when you need full formula definitions and model details.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/methodology" className="weather-button inline-flex items-center justify-center">
            Open formula reference
          </Link>
          <Link href="/learn" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em] text-slate-200 hover:border-sky-400/70 hover:text-slate-100">
            Open Concepts &amp; Diagnostics
          </Link>
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6" aria-label="Trust snapshot">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-100">Trust snapshot</h2>
          <p className="text-xs text-slate-400">Last updated: {reportData.fetchedAtLabel}</p>
        </div>
        <ul className="space-y-2 text-sm text-slate-200">
          <li><span className="text-slate-400">Posture:</span> {reportData.statusLabel} (effective {reportData.recordDateLabel})</li>
          <li><span className="text-slate-400">Confidence:</span> {formatConfidencePlainLabel(homeBriefModel.confidenceLabel)}</li>
          <li><span className="text-slate-400">Trust status:</span> {trustSummary}</li>
          <li><span className="text-slate-400">Source coverage:</span> {reportData.treasuryProvenance.statusLabel} · {reportData.macroProvenance.statusLabel}</li>
        </ul>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6" aria-label="When to distrust or revisit this call">
        <h2 className="text-lg font-semibold text-slate-100">When to distrust or revisit this call</h2>
        <ul className="space-y-3 text-sm text-slate-200">
          {revisitBullets.map((item) => (
            <li key={item.label} className="rounded-xl border border-slate-800/80 bg-slate-900/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
              <p className="mt-1">{item.detail}</p>
              <Link href={item.href} className="mt-2 inline-flex min-h-[44px] items-center text-xs font-semibold uppercase tracking-[0.12em] text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">Review evidence</Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link href="/methodology" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Formula reference</h2>
          <p className="text-sm text-slate-300">Review formulas, weighting choices, and fallback logic in full detail.</p>
        </Link>
        <Link href="/sources" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Sources and freshness</h2>
          <p className="text-sm text-slate-300">Inspect source coverage, update cadence, and provenance for each signal.</p>
        </Link>
        <Link href="/confidence" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Confidence and limits</h2>
          <p className="text-sm text-slate-300">Understand uncertainty, assumptions, and conditions that can flip the call.</p>
        </Link>
        <Link href="/learn" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Concepts &amp; Diagnostics</h2>
          <p className="text-sm text-slate-300">Use operator-facing diagnostics, concepts, and failure modes.</p>
        </Link>
      </section>
      <NextStepRail currentPath="/method" />
    </main>
  );
}
