import type { ReportData } from "../reportData";
import type { buildTrustStatus } from "../trustStatus";
import type { InterpretationLayer } from "../interpretationLayer";
import type { buildHomeBriefModel, buildWeeklyDecisionCardViewModel } from "../homeBriefModel";
import type { loadHomePageReportData } from "../homePageData";

export type ArtifactPayload = {
  boardSummary: string;
  boardSnippetText: string;
  weeklyOperatorBriefText: string;
  weeklyCallSnapshotText: string;
  deltaOnlyBriefText: string;
  callCitation: string;
};

export type HomePageDiagnosticsLane = {
  weeklyMemoLines: ReturnType<typeof buildHomeBriefModel>["weeklyMemoLines"];
  immediateDecision: string;
  revisitDecisions: boolean;
  guardrail: string;
  regimeDistance: ReturnType<typeof buildHomeBriefModel>["regimeDistance"];
  postureWithStageLabel: string;
  statusLabel: string;
  trendLabel: string;
  confidencePercent: number;
  decisionMatrix: ReturnType<typeof buildHomeBriefModel>["decisionMatrix"];
  decisionRules: ReturnType<typeof buildHomeBriefModel>["decisionRules"];
  roleAwareTemplates: ReturnType<typeof buildHomeBriefModel>["roleAwareTemplates"];
  evidenceItems: ReturnType<typeof buildHomeBriefModel>["evidenceItems"];
  reportDynamics: ReportData["reportDynamics"];
  weeklyMovement: ReturnType<typeof buildHomeBriefModel>["weeklyMovement"];
  transitionProbabilities: ReturnType<typeof buildHomeBriefModel>["transitionProbabilities"];
  failureModes: ReturnType<typeof buildHomeBriefModel>["failureModes"];
  historicalTimeline: ReturnType<typeof buildHomeBriefModel>["historicalTimeline"];
};

export type HomePageWorkspaceModel = {
  sectionLinks: { href: string; label: string }[];
  workspaceActions: {
    auditHref: string;
    operationsHref: string;
  };
  audit: {
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
    freshnessSummary: string;
    sourceCoverageLine: string;
    trustMarkerLabel: string;
    trustMarkerTone: "stable" | "warning" | "historical";
    trustMarkerDetail: string;
    sourceDegraded: boolean;
    sourceRows: Array<{
      sourceName: string;
      modeLabel: string;
      freshnessStatus: string;
    }>;
    degradedSourceRows: Array<{
      sourceName: string;
      modeLabel: string;
      freshnessStatus: string;
    }>;
    revisitHeadline: string;
    revisitDetail: string;
    flipHeadline: string;
    flipDetail: string;
    evidenceMovers: Array<{
      key: string;
      title: string;
      detail: string;
    }>;
  };
  replay: {
    initialDate: string;
    summary: string;
    openFullHref: string;
    preview: Array<{
      key: string;
      label: string;
      summary: string;
    }>;
  };
  operations: {
    continueHref: string;
    approvalHeadline: string;
    approvalDetail: string;
    topGuardrails: Array<{
      key: string;
      label: string;
      detail: string;
    }>;
    financeSnapshot: Array<{
      key: string;
      label: string;
      actionNow: string;
      reversalCondition: string;
    }>;
    exportActions: Array<{
      href: string;
      label: string;
    }>;
  };
  translate: {
    primaryPath: {
      href: string;
      title: string;
      detail: string;
      kicker: string;
    };
    fallbackUtility: {
      href: string;
      title: string;
      detail: string;
    };
    toolkitShortcuts: Array<{
      href: string;
      title: string;
      detail: string;
    }>;
  };
};

export type HomePageAssembly = {
  reportShell: {
    regime: ReportData["assessment"]["regime"];
    statusLabel: string;
    recordDateLabel: string;
    fetchedAtLabel: string;
    freshnessLine: string;
    treasurySource: ReportData["treasury"]["source"];
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
    degradedSourceRows: Array<{
      sourceName: string;
      modeLabel: string;
      freshnessStatus: string;
    }>;
    provenance: ReportData["treasuryProvenance"];
    showOfflineBadge: boolean;
    sectionLinks: { href: string; label: string }[];
    structuredData: unknown;
    commandBar: {
      regime: ReportData["assessment"]["regime"];
      call: string;
      doNow: string[];
      flipConditions: string[];
      updatedAt: string;
      postureLabel?: string;
      trendLabel?: ReturnType<typeof buildWeeklyDecisionCardViewModel>["status"]["trendLabel"];
      confidenceLabel?: ReturnType<typeof buildWeeklyDecisionCardViewModel>["status"]["confidenceLabel"];
      confidencePercent?: ReturnType<typeof buildWeeklyDecisionCardViewModel>["status"]["confidencePercent"];
      postureTrajectory?: ReturnType<typeof buildWeeklyDecisionCardViewModel>["diagnostics"]["postureTrajectory"];
      regimeDistance?: ReturnType<typeof buildWeeklyDecisionCardViewModel>["diagnostics"]["regimeDistance"];
    };
    historicalBanner: {
      banner: string;
      liveHref: string;
      previousHref?: string;
      timeMachineHref: string;
    } | null;
  };
  reportResult: Awaited<ReturnType<typeof loadHomePageReportData>>;
  weeklyDecisionCardModel: ReturnType<typeof buildWeeklyDecisionCardViewModel>;
  leadershipArtifactPayloadPromise: Promise<ArtifactPayload | null>;
  diagnosticsLanePromise: Promise<HomePageDiagnosticsLane>;
  workspaceModelPromise: Promise<HomePageWorkspaceModel>;
  interpretationLayer: InterpretationLayer;
  interpretationSearchParams?: Record<string, string | undefined>;
  fallbackActive: boolean;
  fallbackAlert: {
    lastCachedTimestamp: string;
    sourceLabel?: string;
    effectiveRecordDate?: string;
    fallbackReason?: string | null;
  } | null;
};
