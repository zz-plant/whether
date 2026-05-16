import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { buildBreadcrumbList, buildPageMetadata } from "../../lib/seo";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { BeginnerGlossaryPanel } from "../components/appendix/OnboardingPanels";
import { SourceHealthPanel } from "../components/sourceHealthPanel";
import { buildCompactTrustSummary, buildDecisionReadinessState, buildTrustWarnings, buildWeeklyCitationMetaLine } from "../../lib/report/trustStatus";
import { formatConfidencePlainLabel } from "../../lib/report/reportFormatting";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { ReportShell } from "../components/reportShell";
import {
  PRIMARY_AUDIENCE_ACTION,
  PRIMARY_AUDIENCE_SUMMARY,
} from "../../lib/report/reportCopy";

function MethodSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const headingId = `method-${id}-heading`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="weather-panel space-y-5 px-5 py-5 scroll-mt-28"
    >
      <div>
        <h2 id={headingId} className="text-xl font-semibold text-white sm:text-2xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export const runtime = "edge";
export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "Trust — freshness, confidence, and sources",
  description:
    "Check whether this week's U.S.-market brief is current, dependable, and backed by sources.",
  path: "/trust",
  imageAlt: "Whether trust hub",
});

export default async function MethodPage() {
  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    ...buildBreadcrumbList(
      createBreadcrumbTrail([
        { path: "/" },
        { path: "/trust" },
      ]),
    ),
  };
  const { reportData, snapshot } = await loadWeeklyBriefSnapshot(undefined, { route: "/trust" });
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
  const citationLine = buildWeeklyCitationMetaLine({
    statusLabel: reportData.statusLabel,
    confidenceLabel: homeBriefModel.confidenceLabel,
    recordDateLabel: reportData.recordDateLabel,
    freshnessLabel: reportData.fetchedAtLabel,
  });
  const warnings = buildTrustWarnings({
    confidenceLabel: homeBriefModel.confidenceLabel,
    transitionWatch: homeBriefModel.transitionWatch,
    freshnessLabel: reportData.fetchedAtLabel,
    isFallbackSnapshot: isFallback,
    provenanceStatusLabel: reportData.treasuryProvenance.statusLabel,
    changedSignals: reportData.reportDynamics.changedSignals,
    anomalySignals: reportData.reportDynamics.anomalySignals,
  });
  const meetingSnippet = `Posture: ${reportData.statusLabel}\nDecision as-of: ${reportData.recordDateLabel}\nData refreshed: ${reportData.fetchedAtLabel}\nConfidence: ${confidenceLabel}\nTrust: ${trustSummary}\nFlip trigger: ${reportData.flipThreshold}\nAction now: ${reportData.actionNowShort}`;

  const revisitBullets = [
    {
      label: "Trigger",
      detail: reportData.flipThreshold,
      href: "#confidence-limits",
    },
    {
      label: "Impact",
      detail: reportData.actionNowShort,
      href: "#trust-snapshot",
    },
    {
      label: "Recovery",
      detail: isFallback
        ? "Recovery condition: wait for one clean live refresh before approving hard-to-reverse moves."
        : "Recovery condition: wait for HIGH confidence and no transition warning before expanding fixed-cost commitments.",
      href: "#sources-freshness",
    },
  ];
  const decisionReadiness = buildDecisionReadinessState({
    confidenceLabel: homeBriefModel.confidenceLabel,
    freshnessLabel: reportData.fetchedAtLabel,
    isFallbackSnapshot: isFallback,
    isHistoricalSelection: Boolean(reportData.historicalSelection),
  });
  const trustStatusTone = decisionReadiness.tone === "historical"
    ? "historical"
    : decisionReadiness.tone === "warning"
      ? "warning"
      : "stable";
  const trustStatusAction = trustStatusTone === "stable"
    ? "Safe for this week's plan while freshness and confidence hold."
    : trustStatusTone === "historical"
      ? "Comparison only. Switch to live brief before approving anything new."
      : "Use for staged moves only until confidence improves.";
  const trustVerdict = trustStatusTone === "stable"
    ? {
        label: "Ready to use",
        detail: decisionReadiness.detail,
        toneClasses: "border-emerald-400/35 bg-emerald-500/10 text-emerald-100",
      }
    : trustStatusTone === "historical"
      ? {
          label: "Historical only",
          detail: "Comparison only. Not for live approvals.",
          toneClasses: "border-violet-400/35 bg-violet-500/10 text-violet-100",
        }
      : {
          label: "Use with caution",
          detail: decisionReadiness.detail,
          toneClasses: "border-amber-400/35 bg-amber-500/10 text-amber-100",
        };
  const sectionLinks = [
    { href: "#trust-snapshot", label: "Snapshot" },
    { href: "#source-board", label: "Source board" },
    { href: "#sources-freshness", label: "Sources & freshness" },
    { href: "#confidence-limits", label: "Confidence & limits" },
    { href: "#formula-reference", label: "Formula reference" },
    { href: "#revisit-call", label: "Revisit triggers" },
    { href: "#meeting-snippet", label: "Meeting snippet" },
  ];

  return (
    <ReportShell
      statusLabel={reportData.statusLabel}
      recordDateLabel={reportData.recordDateLabel}
      fetchedAtLabel={reportData.fetchedAtLabel}
      treasurySource={reportData.treasury.source}
      trustStatusLabel={trustSummary}
      trustStatusDetail={`Coverage: ${sourceCoverage}`}
      trustStatusAction={trustStatusAction}
      trustStatusTone={trustStatusTone}
      pageTitle="Forecast confidence"

      currentPath="/trust"
      pageSummary="Check whether this week's forecast is current enough to act on."
      pageSummaryLink={{ href: "#trust-snapshot", label: "Snapshot ↓" }}
      sectionLinks={sectionLinks.slice(0, 3)}
      heroVariant="compact"
      sidebarVariant="hidden"
      primaryCta={{ href: "#trust-snapshot", label: "Check trust snapshot" }}
      secondaryCta={{ href: "/", label: "Weekly Brief" }}
      nextStep={{
        href: "/evidence",
        description: "Check evidence next",
      }}
      decisionBanner={{
        label: "Trust",
        decision: "Is this week's brief ready to use, or only useful for comparison?",
        horizon: "This week",
        confidence: trustSummary,
        effectiveDate: reportData.recordDateLabel,
        evidenceHref: "#trust-snapshot",
      }}
      commandBar={{
        regime: reportData.assessment.regime,
        call: "Check whether this week's brief is current enough and reliable enough to use.",
        doNow: [
          reportData.actionNowShort,
          "Slow fixed-cost approvals if trust weakens.",
        ],
        trustChecklist: {
          label: "What matters",
          items: [
            `Confirm freshness: ${reportData.fetchedAtLabel}.`,
            `Confirm confidence: ${confidenceLabel}.`,
          ],
        },
        flipConditions: [
          reportData.flipThreshold,
          "If trust degrades, hold irreversible approvals until live evidence stabilizes.",
        ],
        updatedAt: reportData.fetchedAtLabel,
      }}
      structuredData={breadcrumbStructuredData}
    >
      <MethodSection id="trust-snapshot" title="Trust snapshot" description="Freshness, source coverage, and how heavily to lean on this week's U.S.-market brief.">
        <article className="weather-hub-card space-y-3 rounded-lg px-4 py-4">
          <p className={`inline-flex w-fit rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${trustVerdict.toneClasses}`}>
            {trustVerdict.label}
          </p>
          <p className="text-sm leading-relaxed text-slate-200">{trustVerdict.detail}</p>
          <p className="text-xs leading-5 text-slate-400">
            {PRIMARY_AUDIENCE_SUMMARY} {PRIMARY_AUDIENCE_ACTION}
          </p>
        </article>
        <div className="grid gap-3 sm:grid-cols-3">
          <article className="weather-hub-card rounded-lg px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Freshness</p>
            <p className="mt-2 text-sm text-slate-200">Decision date <span className="font-semibold text-slate-100">{reportData.recordDateLabel}</span></p>
            <p className="mt-2 text-sm text-slate-200">Updated <span className="font-semibold text-slate-100">{reportData.fetchedAtLabel}</span></p>
            <p className="mt-2 text-xs text-slate-400">{trustSummary}</p>
          </article>
          <article className="weather-hub-card rounded-lg px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Source coverage</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-200">
              <li>Treasury: <span className="font-semibold text-slate-100">{reportData.treasuryProvenance.statusLabel}</span></li>
              <li>Macro: <span className="font-semibold text-slate-100">{reportData.macroProvenance.statusLabel}</span></li>
              <li>Confidence: <span className="font-semibold text-slate-100">{confidenceLabel}</span></li>
            </ul>
            <p className="mt-3 text-xs text-slate-400">Coverage summary: {sourceCoverage}</p>
          </article>
          <article className="weather-hub-card rounded-lg px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Approval boundary</p>
            <p className="mt-2 text-sm text-slate-200">{trustVerdict.detail}</p>
            <p className="mt-2 text-sm text-slate-300">{reportData.flipThreshold}</p>
            <p className="mt-2 text-xs text-slate-400">
              {isFallback
                ? "Wait for one clean live refresh before approving irreversible moves."
                : "If freshness or confidence slips, slow approvals and keep decisions reversible."}
            </p>
          </article>
        </div>
      </MethodSection>

      <MethodSection
        id="source-board"
        title="Source board"
        description="The compact source handoff behind the homepage trust board."
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <article className="weather-hub-card space-y-3 rounded-lg px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Current source mix</p>
            <ul className="space-y-2 text-sm text-slate-200">
              <li><span className="text-slate-400">Treasury:</span> {reportData.treasuryProvenance.statusLabel} · {reportData.treasuryProvenance.timestampLabel}</li>
              <li><span className="text-slate-400">Macro:</span> {reportData.macroProvenance.statusLabel} · {reportData.macroProvenance.timestampLabel}</li>
              <li><span className="text-slate-400">Decision date:</span> {reportData.recordDateLabel}</li>
              <li><span className="text-slate-400">Trust summary:</span> {trustSummary}</li>
            </ul>
          </article>
          <article className="weather-hub-card space-y-3 rounded-lg px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Use in the room</p>
            <p className="text-sm text-slate-200">
              Check whether the weekly call is current enough to share or approve against.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Link href="#sources-freshness" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Full freshness check</Link>
              <Link href="#meeting-snippet" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Meeting snippet</Link>
            </div>
          </article>
        </div>
      </MethodSection>

      <MethodSection
        id="sources-freshness"
        title="Sources and freshness"
        description="Where the current recommendation came from and how current it is."
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <article className="weather-hub-card space-y-3 rounded-lg px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Source coverage</p>
            <ul className="space-y-2 text-sm text-slate-200">
              <li><span className="text-slate-400">Treasury:</span> {reportData.treasuryProvenance.statusLabel} · {reportData.treasuryProvenance.timestampLabel}</li>
              <li><span className="text-slate-400">Macro:</span> {reportData.macroProvenance.statusLabel} · {reportData.macroProvenance.timestampLabel}</li>
              <li><span className="text-slate-400">Trust summary:</span> {trustSummary}</li>
            </ul>
            <div className="flex flex-wrap gap-2 text-xs">
              <a href={reportData.treasuryProvenance.sourceUrl} target="_blank" rel="noreferrer" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Treasury source</a>
              <a href={reportData.macroProvenance.sourceUrl} target="_blank" rel="noreferrer" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Macro source</a>
            </div>
          </article>
          <article className="weather-hub-card space-y-3 rounded-lg px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Meeting citation</p>
            <p className="text-sm text-slate-200">{citationLine}</p>
            <p className="text-xs text-slate-400">For a recap or sourcing note.</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Link href="#trust-snapshot" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Snapshot</Link>
              <Link href="#formula-reference" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Formula notes</Link>
            </div>
          </article>
        </div>
        <div className="mt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Per-source status</p>
          <SourceHealthPanel rows={reportData.sourceHealth} />
        </div>
      </MethodSection>

      <MethodSection
        id="confidence-limits"
        title="Confidence and reliability limits"
        description="How reliable the brief is, what should pause it, and what would force a change."
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <article className="weather-hub-card space-y-3 rounded-lg px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">What to watch</p>
            <ul className="space-y-2 text-sm text-slate-200">
              <li><span className="text-slate-400">Confidence now:</span> {confidenceLabel}</li>
              <li><span className="text-slate-400">This recommendation breaks if:</span> {reportData.flipThreshold}</li>
              <li><span className="text-slate-400">Pause if:</span> {reportData.guardrailThreshold}</li>
              <li><span className="text-slate-400">Recovery condition:</span> Confidence returns to HIGH and the transition warning clears before you reopen fixed-cost approvals.</li>
            </ul>
          </article>
          <article className="weather-hub-card space-y-3 rounded-lg px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Escalation rule</p>
            <p className="text-sm text-slate-200">
              If a warning or revisit trigger fires, confirm freshness before moving ahead.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Link href="#sources-freshness" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Recheck freshness</Link>
              <Link href="#revisit-call" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Revisit triggers</Link>
            </div>
          </article>
        </div>
      </MethodSection>

      <MethodSection
        id="formula-reference"
        title="Formula reference"
        description="How this score is built."
      >
        <div className="weather-hub-card space-y-3 rounded-lg px-4 py-4">
          <p className="text-sm text-slate-200">
            The scoring logic, stop lines, and change triggers behind this week&rsquo;s recommendation.
          </p>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>• Read formulas alongside current confidence and freshness labels before irreversible decisions.</li>
            <li>• Check that the change trigger and stop line match the weekly brief.</li>
            <li>• Note the reversal condition before reopening fixed-cost approvals.</li>
          </ul>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link href="#confidence-limits" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Confidence limits</Link>
            <Link href="#sources-freshness" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Source health</Link>
          </div>
        </div>
      </MethodSection>

      <MethodSection id="revisit-call" title="What would make this recommendation wrong?">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <article className="weather-hub-card space-y-3 rounded-md px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Active warning patterns</p>
            {warnings.length === 0 ? (
              <p className="text-sm text-slate-300">No active warning pattern right now. Keep decisions staged and keep the normal change trigger in view.</p>
            ) : (
              <ul className="space-y-3 text-sm text-slate-200">
                {warnings.map((warning) => (
                  <li key={warning.id} className="rounded-md border border-slate-700/70 bg-slate-950/50 px-3 py-3">
                    <p className="font-semibold text-slate-100">{warning.warning}</p>
                    <p className="mt-1 text-slate-300">{warning.mitigationCheck}</p>
                  </li>
                ))}
              </ul>
            )}
          </article>
          <article className="weather-hub-card rounded-md px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Revisit checklist</p>
            <ul className="mt-3 space-y-3 text-sm text-slate-200">
              {revisitBullets.map((item) => (
                <li key={item.label} className="rounded-md border border-slate-700/70 bg-slate-950/50 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
                  <p className="mt-1">{item.detail}</p>
                  <Link href={item.href} className="mt-2 inline-flex min-h-[44px] items-center text-xs font-semibold uppercase tracking-[0.12em] text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">Related check</Link>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </MethodSection>

      <MethodSection id="meeting-snippet" title="Meeting-ready trust snippet" description="Ready for Slack, notes, or agendas.">
        <pre className="weather-hub-card overflow-x-auto rounded-lg px-4 py-4 text-xs leading-6 text-slate-200">
          <code>{meetingSnippet}</code>
        </pre>
      </MethodSection>

      <BeginnerGlossaryPanel />
    </ReportShell>
  );
}
