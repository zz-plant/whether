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
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";

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
  const meetingSnippet = `Posture: ${reportData.statusLabel}\nDecision as-of: ${reportData.recordDateLabel}\nData refreshed: ${reportData.fetchedAtLabel}\nConfidence: ${confidenceLabel}\nTrust: ${trustSummary}\nFlip trigger: ${reportData.flipThreshold}\n${DECISION_CONTRACT_LABELS.action.actionNow}: ${reportData.actionNowShort}`;

  const revisitBullets: Array<{ label: string; detail?: string; href: string }> = [
    {
      // No detail: this row's own link points at #confidence-limits, and that
      // section already prints reportData.flipThreshold under "This
      // recommendation breaks if". Carrying the sentence here too put the same
      // long condition on screen twice within one section.
      label: "Trigger",
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

  const reportShellProps = {
    statusLabel: reportData.statusLabel,
    recordDateLabel: reportData.recordDateLabel,
    fetchedAtLabel: reportData.fetchedAtLabel,
    treasurySource: reportData.treasury.source,
    trustStatusLabel: trustSummary,
    trustStatusDetail: `Coverage: ${sourceCoverage}`,
    trustStatusAction,
    trustStatusTone,
    pageTitle: "Forecast confidence",

    currentPath: "/trust",
    pageSummary: "Check whether this week's forecast is current enough to act on.",
    pageSummaryLink: { href: "#trust-snapshot", label: "Snapshot ↓" },
    sectionLinks: sectionLinks.slice(0, 3),
    heroVariant: "compact",
    sidebarVariant: "hidden",
    primaryCta: { href: "#trust-snapshot", label: "Check trust snapshot" },
    secondaryCta: { href: "/", label: "Weekly Brief" },
    nextStep: {
      href: "/signals",
      description: "Check evidence",
    },
    decisionBanner: {
      label: "Trust",
      decision: "Is this week's brief ready to use, or only useful for comparison?",
      horizon: "This week",
      confidence: trustSummary,
      effectiveDate: reportData.recordDateLabel,
      evidenceHref: "#trust-snapshot",
    },
    commandBar: {
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
    },
    structuredData: breadcrumbStructuredData,
  } satisfies ReportShellProps;

  return {
    reportData,
    isFallback,
    confidenceLabel,
    trustSummary,
    sourceCoverage,
    citationLine,
    warnings,
    meetingSnippet,
    revisitBullets,
    trustVerdict,
    reportShellProps,
  };
}
