import { formatGuidance } from "../../lib/export/briefBuilders";
import { buildTrustStripProps } from "../../lib/report/evidenceReaderModel";
import type { ReportShellModel } from "../components/reportShell";
import { buildTrustStructuredData } from "../../lib/seo/reportPageStructuredData";
import { buildTrustQuestions } from "./trustQuestions";
import {
  buildCompactTrustSummary,
  buildTrustWarnings,
} from "../../lib/report/trustStatus";
import { buildDegradedSourceRows, buildSourceBoardRows } from "../../lib/report/sourceHealth";
import type { TrustStripProps } from "../components/trustStrip";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { loadCronRunHistory } from "../../lib/telemetry/runHistory";
import { formatActivationFunnelLine } from "../../lib/telemetry/activationFunnelReport";
import { readStoredActivationFunnel } from "../../lib/telemetry/recordActivationFunnel";
import { evaluateRegime } from "../../lib/regimeEngine";
import { buildScoreComposition } from "../../lib/report/scoreComposition";
import { buildRateDial } from "../../lib/report/rateScenario";


export async function buildTrustPageModel() {
  /* Read alongside the brief, not after it: the run history has its own deadline and
     fails soft, so it never lengthens the page past the report path's own bound. The
     funnel is a KV get of a record the Monday cron already wrote, so it costs one read
     and cannot fail into a slow page the way an Analytics Engine query would. */
  const [{ reportData, snapshot }, runHistory, storedFunnel] = await Promise.all([
    loadWeeklyBriefSnapshot(undefined, { route: "/trust" }),
    loadCronRunHistory(),
    readStoredActivationFunnel(),
  ]);
  /* Null in both directions that matter: no run has ever written a record, or the
     record's two weeks both held nothing. The section renders on the line alone, so a
     measured zero and an unmeasured week stay out of the markup rather than becoming
     "0 readers" in a place no reader can tell apart from the other. */
  const readerReturnsLine = storedFunnel ? formatActivationFunnelLine({ status: "ok", weeks: storedFunnel.weeks }) : null;
  const homeBriefModel = snapshot.homeBriefModel;
  const isFallback = snapshot.isFallback;
  const degradedSourceRows = buildDegradedSourceRows(reportData.sourceHealth);
  const trustSummary = buildCompactTrustSummary({
    confidenceLabel: homeBriefModel.confidenceLabel,
    freshnessLabel: reportData.fetchedAtLabel,
    isFallbackSnapshot: isFallback,
    isHistoricalSelection: Boolean(reportData.historicalSelection),
  });
  /* The strip under the h1: the four facts a reader checks before acting, in
     the slot every reading route gives them. The sources cell keeps the words
     the five-cell System status strip used for the same three states. */
  const trustStrip: Omit<TrustStripProps, "href"> = buildTrustStripProps({
    recordDateLabel: reportData.recordDateLabel,
    isFallback,
    isHistorical: Boolean(reportData.historicalSelection),
    degradedSourceCount: degradedSourceRows.length,
    confidenceLabel: homeBriefModel.confidenceLabel,
    assessment: reportData.assessment,
    scoringBasis: reportData.scoringBasis,
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

  /* The row labels used to be "Trigger", "Impact" and "Recovery" — three nouns
     from the incident-review register, on a page addressed to someone deciding
     whether to act this week. Each is now the question the row answers. */
  /* A "What would go wrong" row led these until 2026-10-09: no detail, because
     #confidence-limits above prints the condition, and only a link back to that
     section. */
  const revisitBullets: Array<{ label: string; detail?: string; href: string; linkLabel: string }> = [
    {
      label: "What a warning would put at risk",
      /* The guidance as the page and every paste print it. This was the loader's
         `actionNowShort`, the action the headline stopped leading with on 2026-10-09. */
      detail: formatGuidance(snapshot.weeklyCall),
      href: "#trust-snapshot",
      linkLabel: "Check system status",
    },
    {
      label: "How you'd know a warning cleared",
      detail: isFallback
        ? "One live refresh has landed from every source."
        : "The scores are clear of a change and conditions have held for a second reading.",
      href: "#source-board",
      linkLabel: "Check source dates",
    },
  ];
  /* The home model's verdict, which /brief.md prints. This page built a second
     one from the freshness label alone and without the hold, so a held week
     clear of the lines was Act here and Act with caution in the home model. */
  const trustStatusTone = homeBriefModel.decisionReadiness.tone;
  /* Each label is the section's own title. Two had drifted: "Snapshot" for a
     section headed "System status", and "Sources & freshness" for one headed
     "Cite this call" (now "Cite this guidance") — so the rail offered "Sources" and "Sources & freshness"
     next to each other, and the second went to a citation block. The id stays
     as it is; an anchor someone has already linked to outlives its label.
     In page order (§XI). The rail listed Sources second and the thresholds
     method before the revisit triggers, while the page drew the formula first,
     the method next and every other section folded at its foot. */
  const sectionLinks = [
    /* The two open sections by the questions their headings ask (2026-11-25), short. */
    { href: "#source-board", label: "Is the data current?" },
    { href: "#formula-reference", label: "What goes into the scores?" },
    { href: "#confidence-limits", label: "How close to changing" },
    { href: "#revisit-call", label: "When to look again" },
    // Only when the telemetry read is configured: an index entry for a section that
    // never renders is a broken anchor.
    ...(runHistory.status === "unconfigured" ? [] : [{ href: "#run-history", label: "Scheduled runs" }]),
    // Same rule: an index entry for a section that never renders is a broken anchor.
    ...(readerReturnsLine ? [{ href: "#reader-returns", label: "Reader returns" }] : []),
    /* Last, with the section itself: the owner's cron-health panel led a page a
       reader opens to check this week's reading. */
    { href: "#trust-snapshot", label: "System status" },
  ];

  const sourceBoardRows = buildSourceBoardRows(reportData.sourceHealth);
  /* The page's questions and the sentence that answers each, answer first: the h1 and the
     line under it, the board's and the derivation's leads, and the limits fold's summary.
     The markup reads the same entries. */
  const questions = buildTrustQuestions({
    rows: sourceBoardRows,
    strip: trustStrip,
    regime: reportData.assessment.regime,
    flipThreshold: reportData.flipThreshold,
  });
  /* The limits fold is a summary only on a healthy week (app/trust/page.tsx); the markup
     carries its question only when the page prints it. */
  const limitsFolded = !isFallback && warnings.length === 0;

  const reportShellModel: ReportShellModel = {
    status: {
      statusLabel: reportData.statusLabel,
      regime: reportData.assessment.regime,
      recordDateLabel: reportData.recordDateLabel,
      recordDate: reportData.treasury.record_date,
      fetchedAtLabel: reportData.fetchedAtLabel,
    },
    page: {
      /* The nav's question, asked by the page and answered under it (2026-11-25). The
         title was "How much to trust this week's guidance" with no summary, since
         "Check whether this week's guidance is current enough to act on." said the
         title again (2026-10-09); the answer says something the title does not. */
      pageTitle: questions.page.question,
      pageSummary: questions.page.answer,
      sectionLinks,
      currentPath: "/trust",
    },
    trust: {
      trustStatusTone,
      degradedSourceRows,
      showOfflineBadge: isFallback,
      // No link: the strip's link points here.
      strip: { ...trustStrip, recordDate: reportData.treasury.record_date },
    },
    chrome: {
      sidebarVariant: "full",
    },
    // No closing "Open the record" card (2026-10-09): Record is a header tab.
    payloads: {
      structuredData: buildTrustStructuredData({
        questions: [questions.page, questions.sources, questions.scores, ...(limitsFolded ? [questions.limits] : [])],
        recordDateIso: reportData.treasury.record_date,
      }),
    },
  };

  /* This week's scores split by input, for "What goes into the scores?": the
     engine's own stages over the inputs this reading was scored from, and the
     source board's Treasury link for the rate terms. */
  const scoreComposition = buildScoreComposition({
    assessment: reportData.assessment,
    treasury: reportData.treasury,
    macroSeries: reportData.macroSeries,
    treasurySource: {
      label: reportData.treasuryProvenance.sourceLabel,
      url: reportData.treasuryProvenance.sourceUrl,
    },
    scoringBasis: reportData.scoringBasis,
    evaluate: evaluateRegime,
  });
  /* Funding pressure at every hundredth of the short rate, for the control on its bar:
     the same re-scoring, judged against this week's rules for each area. */
  const rateDial = scoreComposition
    ? buildRateDial({
        assessment: reportData.assessment,
        treasury: reportData.treasury,
        macroSeries: reportData.macroSeries,
        evaluate: evaluateRegime,
        rules: snapshot.weeklyDecisionCardModel.decision.decisionRules ?? [],
        changeLines: {
          tightness: reportData.assessment.thresholds.tightnessRegime,
          riskAppetite: reportData.assessment.thresholds.riskAppetiteRegime,
        },
        regime: reportData.assessment.regime,
      })
    : null;

  return {
    reportData,
    scoreComposition,
    rateDial,
    isFallback,
    degradedSourceRows,
    sourceBoardRows,
    questions,
    limitsFolded,
    trustSummary,
    warnings,
    revisitBullets,
    trustStrip,
    runHistory,
    readerReturns: storedFunnel && readerReturnsLine ? { line: readerReturnsLine, generatedAt: storedFunnel.generatedAt } : null,
    reportShellModel,
  };
}
