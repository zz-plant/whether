import {
  decideHomeRecommendedToolkitSlugs,
  findToolkitDefinition,
  situationUseCaseDefinitions,
} from "../../decisionDomainCatalog";
import { formatSourceFreshnessLabel, formatSourceModeLabel } from "../sourceHealth";
import type { buildWeeklyDecisionCardViewModel } from "../homeBriefModel";
import type { ReportData, ReportDataFallback } from "../reportData";
import type { buildTrustStatus } from "../trustStatus";
import type { HomePageDiagnosticsLane, HomePageWorkspaceModel } from "./contracts";

const buildSourceCoverageLine = (rows: ReportData["sourceHealth"] | ReportDataFallback["sourceHealth"]) => {
  const liveRows = rows.filter((row) => row.mode === "live").map((row) => row.sourceName);
  const snapshotRows = rows.filter((row) => row.mode === "snapshot").map((row) => row.sourceName);
  const fallbackRows = rows.filter((row) => row.mode === "fallback").map((row) => row.sourceName);
  const parts: string[] = [];

  if (liveRows.length > 0) {
    parts.push(`Live: ${liveRows.join(", ")}`);
  }

  if (snapshotRows.length > 0) {
    parts.push(`Slower cadence: ${snapshotRows.join(", ")}`);
  }

  if (fallbackRows.length > 0) {
    parts.push(`Degraded: ${fallbackRows.join(", ")}`);
  }

  return parts.join(" · ");
};

export const buildHomeWorkspaceModel = ({
  reportData,
  diagnosticsLane,
  weeklyDecisionCardModel,
  trustStatusLabel,
  trustStatusDetail,
  trustStatusAction,
  trustStatusTone,
  outageType,
  outageSeverity,
  decisionImpactWindow,
  approvalBuckets,
  recoveryPlan,
  outageExitGate,
  freshnessLabel,
  trustMarkerLabel,
  trustMarkerTone,
  trustMarkerDetail,
  sourceDegraded,
  sectionLinks,
}: {
  reportData: ReportData | ReportDataFallback;
  diagnosticsLane: HomePageDiagnosticsLane;
  weeklyDecisionCardModel: ReturnType<typeof buildWeeklyDecisionCardViewModel>;
  trustStatusLabel: string;
  trustStatusDetail: string;
  trustStatusAction: string;
  trustStatusTone: ReturnType<typeof buildTrustStatus>["trustStatusTone"];
  outageType: ReturnType<typeof buildTrustStatus>["outageType"];
  outageSeverity: ReturnType<typeof buildTrustStatus>["outageSeverity"];
  decisionImpactWindow: ReturnType<typeof buildTrustStatus>["decisionImpactWindow"];
  approvalBuckets: ReturnType<typeof buildTrustStatus>["approvalBuckets"];
  recoveryPlan: ReturnType<typeof buildTrustStatus>["recoveryPlan"];
  outageExitGate: ReturnType<typeof buildTrustStatus>["outageExitGate"];
  freshnessLabel: string;
  trustMarkerLabel: string;
  trustMarkerTone: "stable" | "warning" | "historical";
  trustMarkerDetail: string;
  sourceDegraded: boolean;
  sectionLinks: { href: string; label: string }[];
}): HomePageWorkspaceModel => {
  const actionStripItems = weeklyDecisionCardModel.decision.actionStripItems ?? [];
  const financeSummaryItems = actionStripItems.filter((item) =>
    item.lever === "investment-pace" || item.lever === "risk-tolerance"
  );
  const currentSituationPath = diagnosticsLane.weeklyMovement.direction === "defensive"
    ? (situationUseCaseDefinitions.find((entry) => entry.slug === "avoid-premature-scaling") ?? situationUseCaseDefinitions[0])
    : (situationUseCaseDefinitions.find((entry) => entry.slug === "roadmap-focus") ?? situationUseCaseDefinitions[0]);
  const toolkitShortcuts = decideHomeRecommendedToolkitSlugs
    .map((slug) => findToolkitDefinition(slug))
    .filter((toolkit): toolkit is NonNullable<typeof toolkit> => Boolean(toolkit))
    .slice(0, 3);
  const replayPreview = diagnosticsLane.historicalTimeline
    .slice(-4)
    .map((entry) => ({
      key: `${entry.label}-${entry.recordDate ?? entry.year ?? "current"}`,
      label: entry.month && entry.year ? `${entry.label} ${String(entry.month).padStart(2, "0")}/${entry.year}` : entry.label,
      summary: entry.summary ?? entry.posture,
    }));

  return {
    sectionLinks,
    workspaceActions: {
      auditHref: "#audit-this-call",
      operationsHref: "#approve-this-weeks-plan",
    },
    audit: {
      trustStatusLabel,
      trustStatusDetail,
      trustStatusAction,
      trustStatusTone,
      outageType,
      outageSeverity,
      decisionImpactWindow,
      approvalBuckets,
      recoveryPlan,
      outageExitGate,
      freshnessSummary: freshnessLabel,
      sourceCoverageLine: buildSourceCoverageLine(reportData.sourceHealth),
      trustMarkerLabel,
      trustMarkerTone,
      trustMarkerDetail,
      sourceDegraded,
      sourceRows: reportData.sourceHealth.map((row) => ({
        sourceName: row.sourceName,
        modeLabel: formatSourceModeLabel(row.mode),
        freshnessStatus: formatSourceFreshnessLabel(row),
      })),
      degradedSourceRows: reportData.sourceHealth
        .filter((row) => row.mode !== "live")
        .map((row) => ({
          sourceName: row.sourceName,
          modeLabel: formatSourceModeLabel(row.mode),
          freshnessStatus: formatSourceFreshnessLabel(row),
        })),
      revisitHeadline: diagnosticsLane.revisitDecisions
        ? "YES — revisit this week's approvals now."
        : "NO — hold the current weekly baseline.",
      revisitDetail: diagnosticsLane.guardrail,
      flipHeadline: reportData.flipThreshold,
      flipDetail: weeklyDecisionCardModel.decision.reversalTrigger,
      evidenceMovers: diagnosticsLane.evidenceItems.slice(0, 3).map((item) => ({
        key: item.key,
        title: item.title,
        detail: item.immediateImplication,
      })),
    },
    replay: {
      initialDate: `${reportData.selectedYear}-${String(reportData.selectedMonth).padStart(2, "0")}-01`,
      summary: reportData.historicalSelection
        ? `Viewing ${reportData.historicalSelection.banner}. Use Weekly Brief as the source of truth before approving live commitments.`
        : "Choose any date to swap the home workspace to the closest cached monthly snapshot.",
      openFullHref: "/signals?advanced=1#time-machine",
      preview: replayPreview,
    },
    operations: {
      continueHref: "/operations#ops-monthly-action-summary",
      approvalHeadline: weeklyDecisionCardModel.decision.immediateDecision,
      approvalDetail: diagnosticsLane.revisitDecisions
        ? "Revisit last week's approvals before you add fixed cost or sequence new bets."
        : "Hold the current weekly baseline unless a flip condition or trust warning fires.",
      topGuardrails: actionStripItems.slice(0, 3).map((item) => ({
        key: item.lever,
        label: item.label,
        detail: item.triggerThreshold,
      })),
      financeSnapshot: financeSummaryItems.map((item) => ({
        key: item.lever,
        label: item.label,
        actionNow: item.actionNow,
        reversalCondition: item.reversalCondition,
      })),
      exportActions: [
        { href: "/operations#ops-export-briefs", label: "Open share brief" },
      ],
    },
    translate: {
      primaryPath: {
        href: `/decide/${currentSituationPath.slug}`,
        title: currentSituationPath.title,
        detail: "Use the most concrete operating path first before widening into broader browse.",
        kicker: "Recommended unresolved path",
      },
      fallbackUtility: {
        href: "/decide/ship-checklist",
        title: "Whether to ship checklist",
        detail: "Score one go / wait / kill launch decision against the current regime.",
      },
      toolkitShortcuts: toolkitShortcuts.map((toolkit) => ({
        href: `/toolkits/${toolkit.slug}`,
        title: toolkit.title,
        detail: toolkit.decisionThisSession,
      })),
    },
  };
};
