import type { ComponentProps } from "react";
import { previousScoresFromDynamics } from "../../lib/export/scoreReference";
import { buildTrustStripProps } from "../../lib/report/evidenceReaderModel";
import type { ReportShell } from "../components/reportShell";
import { buildBreadcrumbList } from "../../lib/seo";
import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import {
  buildCompactTrustSummary,
  buildDecisionReadinessState,
  buildTrustWarnings,
  buildWeeklyCitationMetaLine,
} from "../../lib/report/trustStatus";
import { formatConfidencePlainLabel } from "../../lib/report/reportFormatting";
import { buildSharedCorridorRails } from "../../lib/report/operatingCalls";
import { buildDegradedSourceRows } from "../../lib/report/sourceHealth";
import { buildLadderLines } from "../components/ui/scoreLadder";
import type { TrustStripProps } from "../components/trustStrip";
import type { ScorePositions } from "./formulaReference";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { loadCronRunHistory } from "../../lib/telemetry/runHistory";
import { formatActivationFunnelLine } from "../../lib/telemetry/activationFunnelReport";
import { readStoredActivationFunnel } from "../../lib/telemetry/recordActivationFunnel";

type ReportShellProps = Omit<ComponentProps<typeof ReportShell>, "children">;

export async function buildTrustPageModel() {
  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    ...buildBreadcrumbList(
      createBreadcrumbTrail([
        { path: "/" },
        { path: "/trust" },
      ]),
    ),
  };
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
     "How the score is built". Last week comes from `previousScoresFromDynamics`,
     the derivation the homepage and every export use: no previous reading at
     all is `"unavailable"`, which draws no hollow dot rather than a dot claiming
     a comparison nobody made, and a move past the weekly sanity limit counts. */
  const scores = reportData.assessment.scores;
  const thresholds = reportData.assessment.thresholds;
  const rails = buildSharedCorridorRails(reportData.actionStripItems ?? [], scores);
  const previousScores = previousScoresFromDynamics(reportData.reportDynamics, scores);
  const positionFor = (key: "tightness" | "riskAppetite", callChange: number) => {
    const rail = rails.find((candidate) => candidate.metric === key);
    return {
      value: scores[key],
      previous: previousScores?.[key] ?? null,
      lines: buildLadderLines({ pause: rail?.guardrail, resume: rail?.clearsAt, callChange }),
    };
  };
  const scorePositions: ScorePositions = {
    tightness: positionFor("tightness", thresholds.tightnessRegime),
    riskAppetite: positionFor("riskAppetite", thresholds.riskAppetiteRegime),
  };
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
  const meetingSnippet = `Conditions: ${reportData.statusLabel}\nAs of: ${reportData.recordDateLabel}\nData refreshed: ${reportData.fetchedAtLabel}\nConfidence: ${confidenceLabel}\nTrust: ${trustSummary}\n${DECISION_CONTRACT_LABELS.watch.postureFlips}: ${reportData.flipThreshold}\n${DECISION_CONTRACT_LABELS.action.actionNow}: ${reportData.actionNowShort}`;

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
     as it is; an anchor someone has already linked to outlives its label. */
  const sectionLinks = [
    { href: "#trust-snapshot", label: "System status" },
    // Only when the telemetry read is configured: an index entry for a section that
    // never renders is a broken anchor.
    ...(runHistory.status === "unconfigured" ? [] : [{ href: "#run-history", label: "Scheduled runs" }]),
    // Same rule: an index entry for a section that never renders is a broken anchor.
    ...(readerReturnsLine ? [{ href: "#reader-returns", label: "Reader returns" }] : []),
    { href: "#source-board", label: "Sources" },
    { href: "#sources-freshness", label: "Cite this guidance" },
    { href: "#confidence-limits", label: "Confidence & limits" },
    { href: "#formula-reference", label: "Formula reference" },
    { href: "#framework", label: "Using the thresholds" },
    { href: "#revisit-call", label: "Revisit triggers" },
    { href: "#meeting-snippet", label: "Meeting snippet" },
  ];

  const reportShellProps = {
    statusLabel: reportData.statusLabel,
    regime: reportData.assessment.regime,
    recordDateLabel: reportData.recordDateLabel,
    fetchedAtLabel: reportData.fetchedAtLabel,
    trustStatusTone,
    degradedSourceRows,
    showOfflineBadge: isFallback,
    pageTitle: "How much to trust this week's guidance",
    pageSummary: "Check whether this week's guidance is current enough to act on.",
    sectionLinks,
    activeStep: "posture",
    sidebarVariant: "full",
    nextStep: {
      href: "/signals",
      description: "Check evidence",
    },
    structuredData: breadcrumbStructuredData,
  } satisfies ReportShellProps;

  return {
    reportData,
    isFallback,
    degradedSourceRows,
    confidenceLabel,
    trustSummary,
    citationLine,
    warnings,
    meetingSnippet,
    revisitBullets,
    trustStrip,
    scorePositions,
    runHistory,
    readerReturns: storedFunnel && readerReturnsLine ? { line: readerReturnsLine, generatedAt: storedFunnel.generatedAt } : null,
    reportShellProps,
  };
}
