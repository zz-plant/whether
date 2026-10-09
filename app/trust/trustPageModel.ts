import { previousScoresFromDynamics } from "../../lib/export/scoreReference";
import { comparisonBasis } from "../../lib/report/comparisonBasis";
import { buildTrustStripProps } from "../../lib/report/evidenceReaderModel";
import type { ReportShellModel } from "../components/reportShell";
import { buildBreadcrumbList } from "../../lib/seo";
import { navigationGroupByKey } from "../../lib/navigation/informationArchitecture";
import { graph } from "../../lib/seo/pageStructuredData";
import { buildGroupBreadcrumbs } from "../../lib/navigation/breadcrumbs";
import {
  buildCompactTrustSummary,
  buildDecisionReadinessState,
  buildTrustWarnings,
} from "../../lib/report/trustStatus";
import { formatConfidencePlainLabel } from "../../lib/report/reportFormatting";
import { buildSharedCorridorRails } from "../../lib/report/operatingCalls";
import { buildDegradedSourceRows, buildSourceBoardRows } from "../../lib/report/sourceHealth";
import { buildLadderLines } from "../components/ui/scoreLadder";
import type { TrustStripProps } from "../components/trustStrip";
import type { ScorePositions } from "./formulaReference";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { loadCronRunHistory } from "../../lib/telemetry/runHistory";
import { formatActivationFunnelLine } from "../../lib/telemetry/activationFunnelReport";
import { readStoredActivationFunnel } from "../../lib/telemetry/recordActivationFunnel";


export async function buildTrustPageModel() {
  const breadcrumbStructuredData = graph([buildBreadcrumbList(buildGroupBreadcrumbs("/trust"))]);
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
  const confidenceLabel = formatConfidencePlainLabel(homeBriefModel.confidenceLabel);
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
  });
  /* Where the two scores sit against their lines, for the ladders that open
     "How the scores are built". The earlier reading comes from `previousScoresFromDynamics`,
     the derivation the homepage and every export use: no previous reading at
     all is `"unavailable"`, which draws no hollow dot rather than a dot claiming
     a comparison nobody made, and a move past the weekly sanity limit counts.
     The dot is named by the date of that reading, not "last week". */
  const scores = reportData.assessment.scores;
  const thresholds = reportData.assessment.thresholds;
  const rails = buildSharedCorridorRails(reportData.actionStripItems ?? [], scores);
  const previousScores = previousScoresFromDynamics(reportData.reportDynamics, scores);
  const positionFor = (key: "tightness" | "riskAppetite", callChange: number) => {
    const rail = rails.find((candidate) => candidate.metric === key);
    return {
      value: scores[key],
      previous: previousScores?.[key] ?? null,
      previousLabel: comparisonBasis(previousScores?.comparedWith).label,
      lines: buildLadderLines({ pause: rail?.guardrail, resume: rail?.clearsAt, callChange }),
    };
  };
  const scorePositions: ScorePositions = {
    tightness: positionFor("tightness", thresholds.tightnessRegime),
    riskAppetite: positionFor("riskAppetite", thresholds.riskAppetiteRegime),
  };
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
  const revisitBullets: Array<{ label: string; detail?: string; href: string; linkLabel: string }> = [
    {
      // No detail: this row's own link points at #confidence-limits, and that
      // section already prints reportData.flipThreshold under "Call changes
      // if". Carrying the sentence here too put the same
      // long condition on screen twice within one section.
      label: "What would go wrong",
      href: "#confidence-limits",
      linkLabel: "Check the limits",
    },
    {
      label: "What it would change",
      detail: reportData.actionNowShort,
      href: "#trust-snapshot",
      linkLabel: "Check system status",
    },
    {
      label: "How you'd know it cleared",
      detail: isFallback
        ? "One live refresh has landed from every source."
        : "Confidence is back to high and conditions have held for a second reading.",
      href: "#source-board",
      linkLabel: "Check source dates",
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
  /* Each label is the section's own title. Two had drifted: "Snapshot" for a
     section headed "System status", and "Sources & freshness" for one headed
     "Cite this call" (now "Cite this guidance") — so the rail offered "Sources" and "Sources & freshness"
     next to each other, and the second went to a citation block. The id stays
     as it is; an anchor someone has already linked to outlives its label.
     In page order (§XI). The rail listed Sources second and the thresholds
     method before the revisit triggers, while the page drew the formula first,
     the method next and every other section folded at its foot. */
  const sectionLinks = [
    { href: "#trust-snapshot", label: "System status" },
    // Only when the telemetry read is configured: an index entry for a section that
    // never renders is a broken anchor.
    ...(runHistory.status === "unconfigured" ? [] : [{ href: "#run-history", label: "Scheduled runs" }]),
    // Same rule: an index entry for a section that never renders is a broken anchor.
    ...(readerReturnsLine ? [{ href: "#reader-returns", label: "Reader returns" }] : []),
    { href: "#formula-reference", label: "Formula reference" },
    { href: "#source-board", label: "Sources" },
    // "Cite this guidance" and "Meeting snippet" moved to /share on 2026-10-08,
    // with every other paste of the week.
    { href: "#confidence-limits", label: "Confidence & limits" },
    { href: "#revisit-call", label: "Revisit triggers" },
    { href: "#framework", label: "Using the thresholds" },
  ];

  const reportShellModel: ReportShellModel = {
    status: {
      statusLabel: reportData.statusLabel,
      regime: reportData.assessment.regime,
      recordDateLabel: reportData.recordDateLabel,
      fetchedAtLabel: reportData.fetchedAtLabel,
    },
    page: {
      pageTitle: "How much to trust this week's guidance",
      pageSummary: "Check whether this week's guidance is current enough to act on.",
      sectionLinks,
      currentPath: "/trust",
    },
    trust: {
      trustStatusTone,
      degradedSourceRows,
      showOfflineBadge: isFallback,
      // No link: the strip's link points here.
      strip: trustStrip,
    },
    chrome: {
      sidebarVariant: "full",
    },
    actions: {
      // Into Record. Why it changed is a tab above this page now; what a reader
      // judging the reading needs next is how readings like it held up.
      nextStep: {
        href: navigationGroupByKey.record.href,
        description: navigationGroupByKey.record.description,
        label: `Open the ${navigationGroupByKey.record.label.toLowerCase()}`,
      },
    },
    payloads: {
      structuredData: breadcrumbStructuredData,
    },
  };

  return {
    reportData,
    isFallback,
    degradedSourceRows,
    sourceBoardRows: buildSourceBoardRows(reportData.sourceHealth),
    confidenceLabel,
    trustSummary,
    warnings,
    revisitBullets,
    trustStrip,
    scorePositions,
    runHistory,
    readerReturns: storedFunnel && readerReturnsLine ? { line: readerReturnsLine, generatedAt: storedFunnel.generatedAt } : null,
    reportShellModel,
  };
}
