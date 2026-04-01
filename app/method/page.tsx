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
    "Whether this week's call is current, dependable, and backed by sources.",
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
      title: "Is the data current?",
      detail: `Updated ${reportData.fetchedAtLabel}. Source status and timestamps.`,
      href: "#sources-freshness",
      cta: "Sources",
    },
    {
      title: "How strong is the signal?",
      detail: `Confidence is ${confidenceLabel}. This section shows what would make the call too weak to rely on.`,
      href: "#confidence-limits",
      cta: "Confidence",
    },
    {
      title: "How is the score built?",
      detail: "The formulas behind the call.",
      href: "#formula-reference",
      cta: "Formula reference",
    },
  ];
  const trustStatusTone = reportData.historicalSelection
    ? "historical"
    : isFallback
      ? "warning"
      : "stable";
  const trustVerdict = trustStatusTone === "stable"
    ? {
        label: "Ready to rely on this week",
        detail: "The data is current enough and the signal is strong enough to support the brief.",
        toneClasses: "border-emerald-400/35 bg-emerald-500/10 text-emerald-100",
      }
    : trustStatusTone === "historical"
      ? {
          label: "Only useful for looking back",
          detail: "This is a historical snapshot, not the live weekly call.",
          toneClasses: "border-violet-400/35 bg-violet-500/10 text-violet-100",
        }
      : {
          label: "Double-check before making hard-to-reverse moves",
          detail: "The data or signal is weak enough that the brief needs extra verification first.",
          toneClasses: "border-amber-400/35 bg-amber-500/10 text-amber-100",
        };
  const sectionLinks = [
    { href: "#trust-snapshot", label: "Snapshot" },
    { href: "#trust-hub-links", label: "Key questions" },
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
      trustStatusAction="Usable for this week's brief if freshness and confidence hold."
      trustStatusTone={trustStatusTone}
      pageTitle="Trust"
      currentPath="/method"
      pageSummary="Can you rely on this week's call?"
      pageSummaryLink={{ href: "#trust-snapshot", label: "Snapshot ↓" }}
      pageLinks={reportPageLinks}
      sectionLinks={sectionLinks}
      heroVariant="compact"
      pageNavVariant="compact"
      headerVariant="trust"
      showPageNavigation={true}
      primaryCta={{ href: "#trust-snapshot", label: "Snapshot" }}
      secondaryCta={{ href: "/", label: "Weekly Brief" }}
      nextStep={{
        href: "/",
        description: "Weekly Brief",
      }}
      decisionBanner={{
        label: "Trust",
        decision: "Is the data current, how strong is the signal, and what would make the call wrong?",
        horizon: "This week",
        confidence: trustSummary,
        effectiveDate: reportData.recordDateLabel,
        evidenceHref: "#trust-snapshot",
      }}
      commandBar={{
        regime: reportData.assessment.regime,
        call: "Whether this week's call is current, dependable, and safe to act on.",
        doNow: [
          reportData.actionNowShort,
          "Hold irreversible approvals if trust degrades.",
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
      <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Trust" }]} />
      <section className="weather-panel scroll-mt-28 space-y-4 px-6 py-5" aria-label="Trust quick start">
        <p className="weather-surface inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100">
          Trust
        </p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
          Is this week&rsquo;s call ready to use?
        </h1>
        <p className="text-sm leading-relaxed text-slate-200 sm:text-base">
          Is the data current, how strong is the signal, and what would make it wrong?
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href="#trust-snapshot" className="weather-button inline-flex min-h-[44px] items-center justify-center">
            Snapshot
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

      <HubSection id="trust-snapshot" title="Can You Rely On It?" description="Freshness, signal strength, and what would make this call wrong." className="scroll-mt-28">
        <div className="grid gap-3 sm:grid-cols-3">
          <article className="weather-hub-card rounded-2xl px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Current call</p>
            <p className="mt-2 text-sm text-slate-200">Posture: <span className="font-semibold text-slate-100">{reportData.statusLabel}</span> (decision as-of {reportData.recordDateLabel})</p>
            <p className="mt-2 text-sm text-slate-200">Confidence: <span className="font-semibold text-slate-100">{confidenceLabel}</span></p>
          </article>
          <article className="weather-hub-card rounded-2xl px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Can you rely on it?</p>
            <p className="mt-2 text-sm text-slate-200">{trustSummary}</p>
            <p className="mt-2 text-sm text-slate-300">Coverage: {sourceCoverage}</p>
            <p className="mt-2 text-xs text-slate-400">Data refreshed: {reportData.fetchedAtLabel}</p>
            <div className="mt-3 border-t border-slate-700/70 pt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-200">Snapshot</p>
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
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">What would make it wrong</p>
            <p className="mt-2 text-sm text-slate-200">{reportData.flipThreshold}</p>
            <p className="mt-2 text-sm text-slate-300">{reportData.actionNowShort}</p>
          </article>
        </div>
      </HubSection>

      <HubSection id="trust-hub-links" title="Key Questions" description="Pick the question that matters." className="scroll-mt-28">
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
            <h2 className="text-lg font-semibold text-slate-100">Revisit triggers</h2>
            <p className="text-sm text-slate-300">What would invalidate this week&rsquo;s call.</p>
            <Link href="#revisit-call" className="inline-flex min-h-[44px] items-center text-xs font-semibold uppercase tracking-[0.12em] text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">
              Revisit triggers
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
            <p className="text-xs text-slate-400">For citation and recap. The weekly call still lives in the brief.</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Link href="#trust-snapshot" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Snapshot</Link>
              <Link href="#formula-reference" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Formula notes</Link>
            </div>
          </article>
        </div>
      </HubSection>

      <HubSection
        id="confidence-limits"
        title="How Strong Is The Signal?"
        description="How fragile the call is, what should pause it, and what would force a change."
        className="scroll-mt-28"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <article className="weather-hub-card space-y-3 rounded-2xl px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">What to watch</p>
            <ul className="space-y-2 text-sm text-slate-200">
              <li><span className="text-slate-400">Confidence now:</span> {confidenceLabel}</li>
              <li><span className="text-slate-400">This call breaks if:</span> {reportData.flipThreshold}</li>
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
              <Link href="#revisit-call" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Revisit triggers</Link>
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
            The scoring logic, pause lines, and flip conditions behind this week&rsquo;s call.
          </p>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>• Tie formula review to the current confidence and freshness labels before making irreversible decisions.</li>
            <li>• Verify flip and guardrail thresholds align with the weekly brief before changing operating tempo.</li>
            <li>• Document reversal conditions before reopening fixed-cost approvals.</li>
          </ul>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link href="#confidence-limits" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Confidence limits</Link>
            <Link href="#sources-freshness" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Source provenance</Link>
          </div>
        </div>
      </HubSection>

      <HubSection id="revisit-call" title="What Would Make This Wrong?" className="scroll-mt-28">
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
                  <Link href={item.href} className="mt-2 inline-flex min-h-[44px] items-center text-xs font-semibold uppercase tracking-[0.12em] text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">Related check</Link>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </HubSection>

      <HubSection id="meeting-snippet" title="Meeting-ready trust snippet" description="Slack, notes, or agenda-ready." className="scroll-mt-28">
        <pre className="weather-hub-card overflow-x-auto rounded-2xl px-4 py-4 text-xs leading-6 text-slate-200">
          <code>{meetingSnippet}</code>
        </pre>
      </HubSection>

      <BeginnerGlossaryPanel />
    </ReportShell>
  );
}
