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
import { FormulaReference } from "./formulaReference";
import { RunHistorySection } from "./runHistorySection";
import { SourceBoard } from "./sourceBoard";
import { ReaderReturnsSection } from "./readerReturnsSection";
import { buildTrustPageModel } from "./trustPageModel";
import { formatDecisionReversal } from "../../lib/report/reportFormatting";

export const runtime = "edge";
export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "How much to trust this week's guidance",
  description:
    "Check how fresh the sources are, how close conditions are to changing, and how the scores are built, before acting on anything you can't undo.",
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
    sourceBoardRows,
    warnings,
    revisitBullets,
    runHistory,
    readerReturns,
    reportShellModel,
  } = await buildTrustPageModel();

  /* What is folded on a healthy week: the limits, the confidence record and the
     warnings. The source board used to lead this group; it is open under the
     derivation now (`SourceBoard`), because it is the evidence the strip's
     "Sources" verdict was judged from. The citation and the meeting snippet
     that bracketed it moved to /share on 2026-10-08, which the header and the footer
     link (the page's own "Share or embed this →" line went on 2026-11-11); the snippet
     was folded into the agenda there on 2026-11-03. */
  const secondaryContent = (
    <>
      <ReportSection
        id="confidence-limits"
        title="How close conditions are to changing"
      >
        {/* Two columns under their own headings, not two cards inside the
            section (2026-10-09); the warnings below are set the same way. */}
        <div className="weather-switch gap-x-8 gap-y-6 [--col-min:18rem]">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-100">What to watch</h3>
            <ul className="space-y-2 text-sm text-slate-200">
              <li><span className="text-slate-400">{DECISION_CONTRACT_LABELS.watch.postureFlips}:</span> {reportData.flipThreshold}</li>
              <li><span className="text-slate-400">{DECISION_CONTRACT_LABELS.threshold.pauseIf}:</span> {reportData.guardrailThreshold}</li>
              {/* The lead area's restart line, as the brief and every paste print
                  it. This slot said "confidence is back to high and conditions
                  have held for a second reading" under the same label, so the
                  page named a second restart line the plan never uses. */}
              {reportData.actionStripItems[0]?.reversalCondition ? (
                <li><span className="text-slate-400">{DECISION_CONTRACT_LABELS.reversal.resumeWhen}:</span> {formatDecisionReversal(reportData.actionStripItems[0].reversalCondition)}</li>
              ) : null}
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-100">Escalation rule</h3>
            <p className="text-sm text-slate-200">
              If a warning below is active, check the source dates before going ahead.
            </p>
            {/* No buttons to #source-board and #revisit-call (2026-10-09): the page's
                index names both sections, and "Check source dates" closes the
                section below. */}
          </div>
        </div>
        {/* The study moved to /calibration — it is original research and deserved
            an address, and two indexable URLs carrying it would compete. One line
            here, under the room it grades (2026-11-11): it was a section of its own,
            a heading and a sentence over one link. */}
        <p className="mt-6 text-sm text-slate-300">
          How often conditions held at each room before a change, across the whole archive:{" "}
          <ActionLink href="/calibration" variant="inline">
            read the calibration study
          </ActionLink>
          .
        </p>
      </ReportSection>

      <ReportSection id="revisit-call" title="What would make this guidance wrong?">
        <div className="weather-switch gap-x-8 gap-y-6 [--col-min:18rem]">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-100">Active warnings</h3>
            {warnings.length === 0 ? (
              <p className="text-sm text-slate-300">No warning is active. Act on the guidance; the pause line still applies.</p>
            ) : (
              <ul className="space-y-4 text-sm text-slate-200">
                {warnings.map((warning) => (
                  <li key={warning.id}>
                    <p className="font-semibold text-slate-100">{warning.warning}</p>
                    <p className="mt-1 text-slate-300">{warning.mitigationCheck}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-100">Revisit checklist</h3>
            <ul className="space-y-4 text-sm text-slate-200">
              {revisitBullets.map((item) => (
                <li key={item.label}>
                  <p className="font-semibold text-slate-100">{item.label}</p>
                  {item.detail ? <p className="mt-1">{item.detail}</p> : null}
                  <Link href={item.href} className="inline-flex min-h-[44px] items-center text-sm font-medium text-sky-300 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">{item.linkLabel} →</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ReportSection>

    </>
  );

  return (
    <ReportShell model={reportShellModel}>
      {/* System status: the trust strip, which the shell draws in the intro
          directly above this section (record date, sources, confidence, could
          the call change), and the caveat that goes with it. This was a
          five-cell "System status" card — data, freshness, sources,
          confidence, warnings — and before that five stacked cards; the facts
          beyond the strip are below: the warnings under "What would make this
          recommendation wrong?", the flip condition under "Confidence and
          reliability limits". The id stays: the rail, the search command and
          three in-page links point at #trust-snapshot as "System status". */}


      <div className="weather-grid gap-8 [--col-min:28rem] [--grid-max:2] items-start">
        <SourceBoard
          rows={sourceBoardRows}
          treasurySourceUrl={reportData.treasuryProvenance.sourceUrl}
          macroSourceUrl={reportData.macroProvenance.sourceUrl}
        />
        <FormulaReference
          scoringBasis={reportData.scoringBasis}
          plainLanguageFolded={!isFallback && warnings.length === 0}
          plainLanguageOpen={isDisclosureOpenInParams(resolvedSearchParams, "derivation")}
        />
      </div>

      {/* The query key stays "sources": a link someone already shared with
          `?sources=1` still opens this panel, though the board itself is
          above it now. The summary names what is behind it (§XII). */}
      {!isFallback && warnings.length === 0 ? (
        <UrlDetails
          queryKey="sources"
          initialOpen={isDisclosureOpenInParams(resolvedSearchParams, "sources")}
          /* A row with the site's own chevron between the page's section rules, like the two
             disclosures above it (2026-11-10). It was the page's one filled, bordered box on
             the card radius with a framed chevron key, which read as a control panel. */
          className="weather-auto-chevron group py-2"
          summaryClassName="flex min-h-11 cursor-pointer list-none items-center gap-2 text-base font-semibold text-slate-100 select-none"
          summary="Limits and the lines that change the guidance"
        >
          <div className="mt-6 space-y-8">
            {secondaryContent}
          </div>
        </UrlDetails>
      ) : (
        /* The same spacing as inside the fold: three sections in one row had
           none between them, which the cards around their contents used to
           hide (2026-10-09). */
        <div className="space-y-10">{secondaryContent}</div>
      )}

      {/* The method moved to /about (2026-10-09): it is the product's thesis, and as
          the last section of the page a reader opens to check this week's reading
          it read as an appendix. One line points to it. */}
      <p className="text-sm text-slate-300">
        {/* The link is what it opens, not "About explains how…", a sentence about another page. */}
        <Link href="/about#method" className="font-semibold text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">
          How to use the pause and restart lines
        </Link>
        , with a worked example and a blank form.
      </p>
      <RunHistorySection runHistory={runHistory} />

      {readerReturns ? <ReaderReturnsSection line={readerReturns.line} generatedAt={readerReturns.generatedAt} /> : null}

      {/* Last, not first: this is the owner's cron-health panel, and it led a
          page a reader opens to check this week's reading. The anchor and the
          sr-only heading stay, so the rail and the search still land here. */}
      <section
        id="trust-snapshot"
        data-page-section="trust-snapshot"
        tabIndex={-1}
        aria-labelledby="section-trust-snapshot-heading"
        className="space-y-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400"
      >
        <h2 id="section-trust-snapshot-heading" className="sr-only">System status</h2>
        <p className="text-xs leading-5 text-slate-400">
          {/* PRIMARY_AUDIENCE_SUMMARY already opens with the "not an authority" sentence — don't restate it here. */}
          {PRIMARY_AUDIENCE_SUMMARY} Check the sources and add your own numbers before acting on anything you can't undo.
        </p>
      </section>

    </ReportShell>
  );
}
