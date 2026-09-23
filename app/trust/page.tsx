import type { Metadata } from "next";
import { ActionLink } from "../components/ui/actionLink";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";
import { UrlDetails } from "../components/ui/urlDetails";
import { isDisclosureOpenInParams } from "../components/ui/disclosureUrlState";
import { ReportShell } from "../components/reportShell";
import {
  DECISION_CONTRACT_LABELS,
  PRIMARY_AUDIENCE_SUMMARY,
} from "../../lib/report/reportCopy";
import { ReportSection } from "../components/reportSection";
import { TrustStrip } from "../components/trustStrip";
import { CONFIDENCE_RECORD_TITLE } from "../components/history/confidenceRecord";
import { FormulaReference } from "./formulaReference";
import { FrameworkSection } from "./frameworkSection";
import { RunHistorySection } from "./runHistorySection";
import { buildTrustPageModel } from "./trustPageModel";

export const runtime = "edge";
export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "How much to trust this week's guidance",
  description:
    "Check how fresh the sources are, how sure the reading is, and how the score is built, before acting on anything you can't undo.",
  path: "/trust",
  imageAlt: "Whether trust hub",
  imageParams: { template: "method", eyebrow: "Trust" },
});

export default async function MethodPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const {
    reportData,
    isFallback,
    citationLine,
    warnings,
    meetingSnippet,
    revisitBullets,
    trustStrip,
    scorePositions,
    runHistory,
    reportShellProps,
  } = await buildTrustPageModel();

  const secondaryContent = (
    <>
      <ReportSection
        id="source-board"
        title="Sources and last update"
        description="Where each feed comes from and when it last refreshed."
      >
        {/* One card. A second, "Before you share or approve", held two pills to
            sections the rail already lists. */}
        <article className="weather-hub-card space-y-3 px-4 py-4">
          {/* Split from the Sources card in System status rather than
              repeating it: that card owns each source's *status*, so this one
              owns when each last updated and where it came from. It used to
              print the status labels too, which put "Canonical snapshot (high
              confidence)" on the page four times. Decision date and Trust
              summary rows dropped for the same reason — both are stated in the
              System status block above. */}
          <p className="type-eyebrow">Source freshness</p>
          <ul className="space-y-2 text-sm text-slate-300">
            <li><span className="text-slate-400">Treasury:</span> {reportData.treasuryProvenance.timestampLabel}</li>
            <li><span className="text-slate-400">Macro:</span> {reportData.macroProvenance.timestampLabel}</li>
          </ul>
          <div className="flex flex-wrap gap-2 text-xs">
            {/* Both source URLs are optional. As bare <a href={undefined}> these
                rendered a pill that looked clickable but was neither a link nor
                keyboard-focusable; the typed href on the shared primitive is what
                surfaced it. Render the affordance only when there is somewhere to go. */}
            {reportData.treasuryProvenance.sourceUrl ? (
              <ActionLink href={reportData.treasuryProvenance.sourceUrl} target="_blank" rel="noreferrer" variant="pill">Treasury source</ActionLink>
            ) : null}
            {reportData.macroProvenance.sourceUrl ? (
              <ActionLink href={reportData.macroProvenance.sourceUrl} target="_blank" rel="noreferrer" variant="pill">Macro source</ActionLink>
            ) : null}
          </div>
        </article>
      </ReportSection>

      <ReportSection
        id="sources-freshness"
        title="Cite this guidance"
        description="The one-line citation for a recap or sourcing note."
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)]">
          <article className="weather-hub-card space-y-3 px-4 py-4">
            <p className="type-eyebrow">Meeting citation</p>
            <p className="text-sm text-slate-200">{citationLine}</p>
            <p className="text-xs text-slate-400">For a recap or sourcing note.</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <ActionLink href="#trust-snapshot" variant="pill">System status</ActionLink>
              <ActionLink href="#formula-reference" variant="pill">Formula notes</ActionLink>
            </div>
          </article>
        </div>
      </ReportSection>

      <ReportSection
        id="confidence-limits"
        title="Confidence and reliability limits"
        description="How reliable the brief is, what should pause it, and what would force a change."
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <article className="weather-hub-card space-y-3 px-4 py-4">
            <p className="type-eyebrow">What to watch</p>
            <ul className="space-y-2 text-sm text-slate-200">
              <li><span className="text-slate-400">{DECISION_CONTRACT_LABELS.watch.postureFlips}:</span> {reportData.flipThreshold}</li>
              <li><span className="text-slate-400">{DECISION_CONTRACT_LABELS.threshold.pauseIf}:</span> {reportData.guardrailThreshold}</li>
              <li><span className="text-slate-400">Resume fixed-cost commitments when:</span> confidence is back to high and conditions have held for a second reading.</li>
            </ul>
          </article>
          <article className="weather-hub-card space-y-3 px-4 py-4">
            <p className="type-eyebrow">Escalation rule</p>
            <p className="text-sm text-slate-200">
              If a warning below is active, check the source dates before going ahead.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <ActionLink href="#source-board" variant="pill">Recheck freshness</ActionLink>
              <ActionLink href="#revisit-call" variant="pill">Revisit triggers</ActionLink>
            </div>
          </article>
        </div>
      </ReportSection>

      {/* The study moved to /calibration — it is original research and deserved
          an address, and two indexable URLs carrying it would compete. This
          keeps the reader who is here to judge the call pointed at it. */}
      <ReportSection
        id="confidence-record"
        title={CONFIDENCE_RECORD_TITLE}
        description="Confidence measures how far the scores sit from the line where conditions change. Whether readings at that distance actually held is measured separately, over the whole archive."
      >
        <ActionLink href="/calibration" variant="pill">
          Read the calibration study
        </ActionLink>
      </ReportSection>

      <ReportSection id="revisit-call" title="What would make this recommendation wrong?">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <article className="weather-hub-card space-y-3 px-4 py-4">
            <p className="type-eyebrow">Active warnings</p>
            {warnings.length === 0 ? (
              <p className="text-sm text-slate-300">No warning is active. Act on the guidance; the pause line still applies.</p>
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
          <article className="weather-hub-card px-4 py-4">
            <p className="type-eyebrow">Revisit checklist</p>
            <ul className="mt-3 space-y-3 text-sm text-slate-200">
              {revisitBullets.map((item) => (
                <li key={item.label} className="rounded-md border border-slate-700/70 bg-slate-950/50 px-3 py-3">
                  <p className="type-eyebrow">{item.label}</p>
                  {item.detail ? <p className="mt-1">{item.detail}</p> : null}
                  <Link href={item.href} className="mt-2 inline-flex min-h-[44px] items-center type-eyebrow text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">{item.linkLabel} →</Link>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </ReportSection>

      <ReportSection id="meeting-snippet" title="Meeting snippet" description="Paste into notes or a meeting agenda.">
        <pre className="overflow-x-auto rounded-lg border border-[color:var(--border-default)] bg-[var(--bg-surface)] px-4 py-4 text-xs leading-6 text-slate-200">
          <code>{meetingSnippet}</code>
        </pre>
      </ReportSection>
    </>
  );

  return (
    <ReportShell {...reportShellProps}>
      {/* The strip, directly under the h1, in the slot every reading route
          gives it: record date, sources, confidence, could the call change.
          This was a five-cell "System status" card — data, freshness, sources,
          confidence, warnings — each cell with a coloured dot and a detail
          line, and before that five stacked cards. The facts the cells carried
          beyond the strip are all below: the refresh stamp is in the intro
          block, the warnings under "What would make this recommendation
          wrong?", the flip condition under "Confidence and reliability
          limits". No link on this page's copy — the explanation is the page.
          The id stays: the rail, the search command and three in-page links
          point at #trust-snapshot as "System status", and the strip is that. */}
      <section
        id="trust-snapshot"
        data-page-section="trust-snapshot"
        tabIndex={-1}
        aria-labelledby="section-trust-snapshot-heading"
        className="space-y-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400"
      >
        <h2 id="section-trust-snapshot-heading" className="sr-only">System status</h2>
        <TrustStrip {...trustStrip} />
        <p className="text-xs leading-5 text-slate-400">
          {/* PRIMARY_AUDIENCE_SUMMARY already opens with the "not an authority" sentence — don't restate it here. */}
          {PRIMARY_AUDIENCE_SUMMARY} Check the sources and add your own numbers before acting on anything you can't undo.
        </p>
      </section>

      <RunHistorySection runHistory={runHistory} />

      <FormulaReference positions={scorePositions} />

      <FrameworkSection />

      {!isFallback && warnings.length === 0 ? (
        <UrlDetails
          queryKey="sources"
          initialOpen={isDisclosureOpenInParams(resolvedSearchParams, "sources")}
          className="group mt-6 rounded-xl border border-[color:var(--border-default)] bg-slate-950/20 px-5 py-4"
          summaryClassName="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 type-eyebrow select-none"
          summary={
            <>
              <span>Detailed verification &amp; sources</span>
              <span aria-hidden="true" className="rounded-md border border-slate-700/50 bg-slate-950/50 px-2.5 py-1 text-xs text-slate-400 transition group-open:rotate-180">
                ▾
              </span>
            </>
          }
        >
          <div className="mt-6 space-y-8">
            {secondaryContent}
          </div>
        </UrlDetails>
      ) : (
        secondaryContent
      )}
    </ReportShell>
  );
}
