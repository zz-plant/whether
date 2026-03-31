import type { Metadata } from "next";
import Link from "next/link";
import { buildBreadcrumbList, buildPageMetadata } from "../../lib/seo";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { BreadcrumbTrail } from "../components/breadcrumbTrail";
import { HubSection } from "../components/hubPageShell";
import { BeginnerGlossaryPanel } from "../components/appendix/OnboardingPanels";
import { buildCompactTrustSummary, buildFailureModeWarnings, buildWeeklyCitationMetaLine } from "../../lib/report/trustStatus";
import { formatConfidencePlainLabel } from "../../lib/report/reportFormatting";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { ReportShell } from "../components/reportShell";
import { reportPageLinks } from "../../lib/report/reportNavigation";

export const runtime = "edge";
export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "Trust — freshness, confidence, and sources",
  description:
    "Proof that this week's call is fresh, usable, and backed by sources.",
  path: "/method",
  imageAlt: "Whether trust hub",
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
  const citationLine = buildWeeklyCitationMetaLine({
    statusLabel: reportData.statusLabel,
    confidenceLabel: homeBriefModel.confidenceLabel,
    recordDateLabel: reportData.recordDateLabel,
    freshnessLabel: reportData.fetchedAtLabel,
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
        ? "Recovery condition: one live refresh with no fallback flags before escalating irreversible approvals."
        : "Recovery condition: confidence returns to HIGH and transition watch is OFF before expanding fixed-cost commitments.",
      href: "#sources-freshness",
    },
  ];
  const trustActions = [
    {
      title: "Check freshness",
      detail: `Data refreshed: ${reportData.fetchedAtLabel}. Check the source status here.`,
      href: "#sources-freshness",
      cta: "Open sources",
    },
    {
      title: "Check confidence",
      detail: `Current confidence: ${confidenceLabel}. Check the pause and flip lines here.`,
      href: "#confidence-limits",
      cta: "Open confidence",
    },
    {
      title: "See formulas",
      detail: "How the score is built.",
      href: "#formula-reference",
      cta: "Open formulas",
    },
  ];
  const trustStatusTone = reportData.historicalSelection
    ? "historical"
    : isFallback
      ? "warning"
      : "stable";
  const trustVerdict = trustStatusTone === "stable"
    ? {
        label: "Safe to use for this week's operating call",
        detail: "Freshness, confidence, and source coverage support the current brief.",
        toneClasses: "border-emerald-400/35 bg-emerald-500/10 text-emerald-100",
      }
    : trustStatusTone === "historical"
      ? {
          label: "Use only for retrospective comparison",
          detail: "This is a historical snapshot, not a live approval read.",
          toneClasses: "border-violet-400/35 bg-violet-500/10 text-violet-100",
        }
      : {
          label: "Use cautiously before approving irreversible moves",
          detail: "Trust is degraded enough that the current brief needs an explicit check first.",
          toneClasses: "border-amber-400/35 bg-amber-500/10 text-amber-100",
        };
  const sectionLinks = [
    { href: "#trust-snapshot", label: "60-second proof check" },
    { href: "#trust-hub-links", label: "Proof checks" },
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
      trustStatusAction="If checks pass, return to the weekly brief."
      trustStatusTone={trustStatusTone}
      pageTitle="Proof"
      currentPath="/method"
      pageSummary="Check whether this week's call is ready to use."
      pageSummaryLink={{ href: "#trust-snapshot", label: "Start proof check ↓" }}
      pageLinks={reportPageLinks}
      sectionLinks={sectionLinks}
      heroVariant="compact"
      pageNavVariant="compact"
      headerVariant="trust"
      showPageNavigation={true}
      primaryCta={{ href: "#trust-snapshot", label: "Run proof check" }}
      secondaryCta={{ href: "/", label: "Weekly Brief" }}
      nextStep={{
        href: "/",
        description: "Return to Weekly Brief next",
      }}
      decisionBanner={{
        label: "Proof check",
        decision: "Check freshness, confidence, and change-the-call triggers.",
        horizon: "This week",
        confidence: trustSummary,
        effectiveDate: reportData.recordDateLabel,
        evidenceHref: "#trust-snapshot",
      }}
      commandBar={{
        regime: reportData.assessment.regime,
        call: "Use Proof to verify the current call.",
        doNow: [
          reportData.actionNowShort,
          "Return to the weekly brief once checks are complete.",
        ],
        trustChecklist: {
          label: "Proof check",
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
      <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Proof" }]} />
      <section className="weather-panel scroll-mt-28 space-y-4 px-6 py-5" aria-label="Trust quick start">
        <p className="weather-surface inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100">
          Proof hub
        </p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
          Check whether this week&apos;s call is ready to use.
        </h1>
        <p className="text-sm leading-relaxed text-slate-200 sm:text-base">
          Start with the verdict below.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href="#trust-snapshot" className="weather-button inline-flex min-h-[44px] items-center justify-center">
            Run 60-second proof check
          </Link>
          <Link href="/" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em] text-slate-200 hover:border-sky-400/70 hover:text-slate-100">
            Weekly Brief
          </Link>
        </div>
      </section>

      <section className="weather-panel scroll-mt-28 space-y-3 px-6 py-5" aria-label="Trust verdict">
        <p className={`inline-flex w-fit rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${trustVerdict.toneClasses}`}>
          {trustVerdict.label}
        </p>
        <p className="text-sm leading-relaxed text-slate-200">{trustVerdict.detail}</p>
      </section>

      <HubSection id="trust-snapshot" title="60-second trust check" description="Check this before acting on this week's posture." className="scroll-mt-28">
        <div className="grid gap-3 sm:grid-cols-3">
          <article className="weather-hub-card rounded-2xl px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Current call</p>
            <p className="mt-2 text-sm text-slate-200">Posture: <span className="font-semibold text-slate-100">{reportData.statusLabel}</span> (decision as-of {reportData.recordDateLabel})</p>
            <p className="mt-2 text-sm text-slate-200">Confidence: <span className="font-semibold text-slate-100">{confidenceLabel}</span></p>
          </article>
          <article className="weather-hub-card rounded-2xl px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Trust status</p>
            <p className="mt-2 text-sm text-slate-200">{trustSummary}</p>
            <p className="mt-2 text-sm text-slate-300">Coverage: {sourceCoverage}</p>
            <p className="mt-2 text-xs text-slate-400">Data refreshed: {reportData.fetchedAtLabel}</p>
            <div className="mt-3 border-t border-slate-700/70 pt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-200">Trust check</p>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-200">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-violet-300" aria-hidden="true" />
                  <span>Data refreshed: {reportData.fetchedAtLabel}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-violet-300" aria-hidden="true" />
                  <span>Trust summary: {trustSummary}</span>
                </li>
              </ul>
            </div>
          </article>
          <article className="weather-hub-card rounded-2xl px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">What would change the call</p>
            <p className="mt-2 text-sm text-slate-200">{reportData.flipThreshold}</p>
            <p className="mt-2 text-sm text-slate-300">{reportData.actionNowShort}</p>
          </article>
        </div>
      </HubSection>

      <HubSection id="trust-hub-links" title="Audit workflow" description="Open the appendix that matches the question." className="scroll-mt-28">
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
            <h2 className="text-lg font-semibold text-slate-100">Revisit checks</h2>
            <p className="text-sm text-slate-300">See what would invalidate this week&apos;s call.</p>
            <Link href="#revisit-call" className="inline-flex min-h-[44px] items-center text-xs font-semibold uppercase tracking-[0.12em] text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">
              Open checks
            </Link>
          </article>
        </div>
      </HubSection>

      <HubSection
        id="sources-freshness"
        title="Sources and freshness"
        description="Where the current call came from and how current it is."
        className="scroll-mt-28"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <article className="weather-hub-card space-y-3 rounded-2xl px-4 py-4">
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
          <article className="weather-hub-card space-y-3 rounded-2xl px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Citation-ready summary</p>
            <p className="text-sm text-slate-200">{citationLine}</p>
            <p className="text-xs text-slate-400">Use this as proof only. The decision still lives in Weekly Brief and Planning.</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Link href="#trust-snapshot" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Back to proof check</Link>
              <Link href="#formula-reference" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Formula notes</Link>
            </div>
          </article>
        </div>
      </HubSection>

      <HubSection
        id="confidence-limits"
        title="Confidence and limits"
        description="How fragile the call is, what pauses it, and what forces a change."
        className="scroll-mt-28"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <article className="weather-hub-card space-y-3 rounded-2xl px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Bounded decision checks</p>
            <ul className="space-y-2 text-sm text-slate-200">
              <li><span className="text-slate-400">Confidence now:</span> {confidenceLabel}</li>
              <li><span className="text-slate-400">Change course if:</span> {reportData.flipThreshold}</li>
              <li><span className="text-slate-400">Pause if:</span> {reportData.guardrailThreshold}</li>
              <li><span className="text-slate-400">Recovery condition:</span> Confidence returns to HIGH and transition watch turns OFF before expanding fixed-cost approvals.</li>
            </ul>
          </article>
          <article className="weather-hub-card space-y-3 rounded-2xl px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Escalation rule</p>
            <p className="text-sm text-slate-200">
              If any revisit trigger or false-signal warning hits, move back to the weekly brief only after you confirm source freshness and restate the bounded approval rule.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Link href="#sources-freshness" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Recheck freshness</Link>
              <Link href="#revisit-call" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Open checks</Link>
            </div>
          </article>
        </div>
      </HubSection>

      <HubSection
        id="formula-reference"
        title="Formula reference"
        description="How the score is built."
        className="scroll-mt-28"
      >
        <div className="weather-hub-card space-y-3 rounded-2xl px-4 py-4">
          <p className="text-sm text-slate-200">
            Use this section when reviewers ask how the scoring works, what would make you pause, and what would change the call.
          </p>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>• Tie formula review to the current confidence and freshness labels before making irreversible decisions.</li>
            <li>• Verify flip and guardrail thresholds align with the weekly brief before changing operating tempo.</li>
            <li>• Document reversal conditions before reopening fixed-cost approvals.</li>
          </ul>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link href="#confidence-limits" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">View confidence limits</Link>
            <Link href="#sources-freshness" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">View source provenance</Link>
          </div>
        </div>
      </HubSection>

      <HubSection
        id="revisit-call"
        title="Revisit triggers and false-signal risks"
        className="scroll-mt-28"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <article className="weather-hub-card space-y-3 rounded-xl px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Active warning patterns</p>
            {warnings.length === 0 ? (
              <p className="text-sm text-slate-300">No active compact false-signal warning. Continue with staged approvals and keep the normal flip trigger in view.</p>
            ) : (
              <ul className="space-y-3 text-sm text-slate-200">
                {warnings.map((warning) => (
                  <li key={warning.id} className="rounded-xl border border-slate-700/70 bg-slate-950/50 px-3 py-3">
                    <p className="font-semibold text-slate-100">{warning.warning}</p>
                    <p className="mt-1 text-slate-300">{warning.mitigationCheck}</p>
                  </li>
                ))}
              </ul>
            )}
          </article>
          <article className="weather-hub-card rounded-xl px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Revisit checklist</p>
            <ul className="mt-3 space-y-3 text-sm text-slate-200">
              {revisitBullets.map((item) => (
                <li key={item.label} className="rounded-xl border border-slate-700/70 bg-slate-950/50 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
                  <p className="mt-1">{item.detail}</p>
                  <Link href={item.href} className="mt-2 inline-flex min-h-[44px] items-center text-xs font-semibold uppercase tracking-[0.12em] text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">Review evidence</Link>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </HubSection>

      <HubSection id="meeting-snippet" title="Meeting-ready trust snippet" description="Copy this into Slack, notes, or the meeting agenda." className="scroll-mt-28">
        <pre className="weather-hub-card overflow-x-auto rounded-2xl px-4 py-4 text-xs leading-6 text-slate-200">
          <code>{meetingSnippet}</code>
        </pre>
      </HubSection>

      <BeginnerGlossaryPanel />
    </ReportShell>
  );
}
