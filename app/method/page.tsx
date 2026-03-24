import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "../../lib/navigation/routeType";
import { buildBreadcrumbList, buildPageMetadata } from "../../lib/seo";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { BreadcrumbTrail } from "../components/breadcrumbTrail";
import { HubSection } from "../components/hubPageShell";
import { NextStepRail } from "../components/nextStepRail";
import { BeginnerGlossaryPanel } from "../components/appendixSections";
import { buildCompactTrustSummary } from "../../lib/report/trustStatus";
import { formatConfidencePlainLabel } from "../../lib/report/reportFormatting";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { ReportShell } from "../components/reportShell";
import { reportPageLinks } from "../../lib/report/reportNavigation";

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
  const { reportData, snapshot } = await loadWeeklyBriefSnapshot(undefined, { route: "/method" });
  const homeBriefModel = snapshot.homeBriefModel;
  const isFallback = snapshot.isFallback;
  const trustSummary = buildCompactTrustSummary({
    confidenceLabel: homeBriefModel.confidenceLabel,
    freshnessLabel: reportData.fetchedAtLabel,
    isFallbackSnapshot: isFallback,
    isHistoricalSelection: Boolean(reportData.historicalSelection),
  });
  const confidenceLabel = formatConfidencePlainLabel(homeBriefModel.confidenceLabel);
  const sourceCoverage = `${reportData.treasuryProvenance.statusLabel} · ${reportData.macroProvenance.statusLabel}`;
  const meetingSnippet = `Posture: ${reportData.statusLabel} (${reportData.recordDateLabel})\nConfidence: ${confidenceLabel}\nTrust: ${trustSummary}\nFlip trigger: ${reportData.flipThreshold}\nAction now: ${reportData.actionNowShort}`;

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
  const trustActions = [
    {
      title: "Validate freshness",
      detail: `Latest refresh: ${reportData.fetchedAtLabel}. Confirm this still matches your meeting window.`,
      href: "/sources" as Route,
      cta: "Open freshness checks",
    },
    {
      title: "Validate confidence limits",
      detail: `Current confidence: ${confidenceLabel}. Review uncertainty before approving irreversible spend.`,
      href: "/confidence" as Route,
      cta: "Open confidence limits",
    },
    {
      title: "Validate model assumptions",
      detail: "Audit formulas and fallback behavior if you need to defend this posture externally.",
      href: "/methodology" as Route,
      cta: "Open formula reference",
    },
  ];
  const sectionLinks = [
    { href: "#trust-snapshot", label: "60-second trust check" },
    { href: "#trust-hub-links", label: "Audit workflow" },
    { href: "#revisit-call", label: "Revisit triggers" },
    { href: "#meeting-snippet", label: "Meeting snippet" },
  ];
  const trustStatusTone = reportData.historicalSelection
    ? "historical"
    : isFallback
      ? "warning"
      : "stable";

  return (
    <ReportShell
      statusLabel={reportData.statusLabel}
      recordDateLabel={reportData.recordDateLabel}
      fetchedAtLabel={reportData.fetchedAtLabel}
      treasurySource={reportData.treasury.source}
      trustStatusLabel={trustSummary}
      trustStatusDetail={`Coverage: ${sourceCoverage}`}
      trustStatusAction="If trust checks pass, return to the weekly brief and execute the operating call."
      trustStatusTone={trustStatusTone}
      pageTitle="Method"
      currentPath="/method"
      pageSummary="Trust, source, and confidence checks in the same shell used by the weekly operating surfaces."
      pageSummaryLink={{ href: "#trust-snapshot", label: "Start trust check ↓" }}
      pageLinks={reportPageLinks}
      sectionLinks={sectionLinks}
      heroVariant="compact"
      pageNavVariant="compact"
      showPageNavigation={true}
      primaryCta={{ href: "/", label: "Return to Weekly Brief" }}
      secondaryCta={{ href: "#trust-snapshot", label: "Open trust check" }}
      nextStep={{
        href: "/",
        description: "Return to Weekly Brief after validating trust and confidence",
      }}
      decisionBanner={{
        label: "Start here",
        decision: "Validate freshness, confidence, and flip conditions before approving irreversible moves.",
        horizon: "This week",
        confidence: trustSummary,
        effectiveDate: reportData.recordDateLabel,
        evidenceHref: "#trust-snapshot",
      }}
      commandBar={{
        regime: reportData.assessment.regime,
        call: "Use Method as a fast trust gate, then move back to execution.",
        doNow: [
          `Confirm freshness: ${reportData.fetchedAtLabel}.`,
          `Confirm confidence: ${confidenceLabel}.`,
        ],
        flipConditions: [
          reportData.flipThreshold,
          "If trust degrades, hold irreversible approvals until live evidence stabilizes.",
        ],
        updatedAt: reportData.fetchedAtLabel,
      }}
      structuredData={breadcrumbStructuredData}
    >
      <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Method" }]} />
      <section className="weather-panel scroll-mt-28 space-y-4 px-6 py-5" aria-label="Method quick start">
        <p className="weather-surface inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100">
          Trust audit hub
        </p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
          Trust the weekly call fast: confidence, freshness, and flip conditions.
        </h1>
        <p className="text-sm leading-relaxed text-slate-200 sm:text-base">
          Use Method only to validate the current brief. If the trust check passes, go back to operating decisions instead of staying here.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/" className="weather-button inline-flex min-h-[44px] items-center justify-center">
            Return to Weekly Brief
          </Link>
          <Link href="/methodology" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em] text-slate-200 hover:border-sky-400/70 hover:text-slate-100">
            Open formula reference
          </Link>
        </div>
      </section>

      <HubSection id="trust-snapshot" title="60-second trust check" description="Read top-to-bottom before acting on this week's posture." className="scroll-mt-28">
        <div className="grid gap-3 sm:grid-cols-3">
          <article className="weather-hub-card rounded-2xl px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Current call</p>
            <p className="mt-2 text-sm text-slate-200">Posture: <span className="font-semibold text-slate-100">{reportData.statusLabel}</span> (effective {reportData.recordDateLabel})</p>
            <p className="mt-2 text-sm text-slate-200">Confidence: <span className="font-semibold text-slate-100">{confidenceLabel}</span></p>
          </article>
          <article className="weather-hub-card rounded-2xl px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Trust status</p>
            <p className="mt-2 text-sm text-slate-200">{trustSummary}</p>
            <p className="mt-2 text-sm text-slate-300">Coverage: {sourceCoverage}</p>
            <p className="mt-2 text-xs text-slate-400">Latest refresh: {reportData.fetchedAtLabel}</p>
          </article>
          <article className="weather-hub-card rounded-2xl px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Decision boundary</p>
            <p className="mt-2 text-sm text-slate-200">{reportData.flipThreshold}</p>
            <p className="mt-2 text-sm text-slate-300">{reportData.actionNowShort}</p>
          </article>
        </div>
      </HubSection>

      <HubSection id="trust-hub-links" title="Audit workflow" description="Open each surface only when that exact question appears in review." className="scroll-mt-28">
        <div className="grid gap-3 sm:grid-cols-2">
          {trustActions.map((item) => (
            <article key={item.title} className="weather-hub-link-card space-y-2">
              <h2 className="text-lg font-semibold text-slate-100">{item.title}</h2>
              <p className="text-sm text-slate-300">{item.detail}</p>
              <Link href={item.href} className="inline-flex min-h-[44px] items-center text-xs font-semibold uppercase tracking-[0.12em] text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">
                {item.cta}
              </Link>
            </article>
          ))}
          <article className="weather-hub-link-card space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">Optional context only</h2>
            <p className="text-sm text-slate-300">Use Learn for conceptual diagnostics after you have already made the operating call.</p>
            <Link href="/learn" className="inline-flex min-h-[44px] items-center text-xs font-semibold uppercase tracking-[0.12em] text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">
              Open Learn context
            </Link>
          </article>
        </div>
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

      <HubSection id="meeting-snippet" title="Meeting-ready trust snippet" description="Copy this into Slack, notes, or the meeting agenda." className="scroll-mt-28">
        <pre className="weather-hub-card overflow-x-auto rounded-2xl px-4 py-4 text-xs leading-6 text-slate-200">
          <code>{meetingSnippet}</code>
        </pre>
      </HubSection>

      <BeginnerGlossaryPanel />

      <NextStepRail currentPath="/method" />
    </ReportShell>
  );
}
