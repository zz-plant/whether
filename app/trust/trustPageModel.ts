import type { ComponentProps } from "react";
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
     fails soft, so it never lengthens the page past the report path's own bound. */
  const [{ reportData, snapshot }, runHistory] = await Promise.all([
    loadWeeklyBriefSnapshot(undefined, { route: "/trust" }),
    loadCronRunHistory(),
  ]);
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
  const trustStrip: Omit<TrustStripProps, "href"> = {
    recordDateLabel: reportData.recordDateLabel,
    sourcesLive: !isFallback && degradedSourceRows.length === 0,
    sourcesLabel: isFallback
      ? "Cached snapshot"
      : degradedSourceRows.length > 0
        ? `Partly cached · ${degradedSourceRows.length}`
        : "All sources live",
    confidenceLabel: homeBriefModel.confidenceLabel,
    couldChangeNextWeek: homeBriefModel.transitionWatch === "ON",
  };
  /* Where the two scores sit against their lines, for the ladders that open
     "How the score is built". Last week is read off the same dynamics the
     homepage's movement line uses: a signal missing from `changedSignals`
     moved under 0.01, and no previous reading at all is `"unavailable"`, which
     draws no hollow dot rather than a dot claiming a comparison nobody made. */
  const scores = reportData.assessment.scores;
  const thresholds = reportData.assessment.thresholds;
  const rails = buildSharedCorridorRails(reportData.actionStripItems ?? [], scores);
  const previousScore = (key: "tightness" | "riskAppetite") => {
    const dynamics = reportData.reportDynamics;
    if (dynamics.directionLabel === "unavailable") return null;
    const delta = dynamics.changedSignals.find((signal) => signal.key === key)?.delta ?? 0;
    return scores[key] - delta;
  };
  const positionFor = (key: "tightness" | "riskAppetite", callChange: number) => {
    const rail = rails.find((candidate) => candidate.metric === key);
    return {
      value: scores[key],
      previous: previousScore(key),
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
      // section already prints reportData.flipThreshold under "This
      // recommendation breaks if". Carrying the sentence here too put the same
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
        : "Confidence is back to high and the call has held for a second reading.",
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
     "Cite this call" — so the rail offered "Sources" and "Sources & freshness"
     next to each other, and the second went to a citation block. The id stays
     as it is; an anchor someone has already linked to outlives its label. */
  const sectionLinks = [
    { href: "#trust-snapshot", label: "System status" },
    // Only when the telemetry read is configured: an index entry for a section that
    // never renders is a broken anchor.
    ...(runHistory.status === "unconfigured" ? [] : [{ href: "#run-history", label: "Scheduled runs" }]),
    { href: "#source-board", label: "Sources" },
    { href: "#sources-freshness", label: "Cite this call" },
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
    pageTitle: "How much to trust this week's call",
    pageSummary: "Check whether this week's call is current enough to act on.",
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
    reportShellProps,
  };
}
