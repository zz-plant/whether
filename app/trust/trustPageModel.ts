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
import { buildDegradedSourceRows } from "../../lib/report/sourceHealth";
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
  /* The verdict is a colour on the System status strip, not a banner: emerald
     for ready, violet for a past week, amber for caution. A labelled banner
     above the strip used to say the same thing in words the five cells then
     repeated. */
  const trustVerdictToneClasses = trustStatusTone === "stable"
    ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-100"
    : trustStatusTone === "historical"
      ? "border-violet-400/35 bg-violet-500/10 text-violet-100"
      : "border-amber-400/35 bg-amber-500/10 text-amber-100";
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
    // The plain label ("Medium (mixed signal reliability)") is prose. The status
    // dot needs the code, and comparing the prose against "MED" never matched —
    // so every confidence level, HIGH included, painted the dot rose.
    confidenceCode: homeBriefModel.confidenceLabel,
    trustSummary,
    sourceCoverage,
    citationLine,
    warnings,
    meetingSnippet,
    revisitBullets,
    trustVerdictToneClasses,
    runHistory,
    reportShellProps,
  };
}
