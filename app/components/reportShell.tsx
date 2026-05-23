/**
 * Shared report shell layout for Whether Report pages.
 * Keeps header, navigation, and layout consistent across multi-page views.
 *
 * Uses PageShell for the outer container structure so hub and report pages
 * share consistent page-level padding, backdrop, and ambient behavior.
 */
import { Children, type ReactNode, isValidElement } from "react";
import { PageShell } from "./pageShell";
import { DisplayModeToggle } from "./displayModeToggle";
import type { DataProvenance } from "./dataProvenanceStrip";
import { type ReportSectionLink } from "./reportShellNavigation";
import { AppSidebar } from "./AppSidebar";
import { type ReportStageItem } from "./reportRevampElements";
import { INTERNAL_USE_LABEL } from "../../lib/exportNotices";
import { ReportCta } from "./reportCta";
import { RegimeIconType } from "./regimeIcons";
import { RegimeCommandBar, type RegimeCommandBarProps } from "./RegimeCommandBar";
import { resolveTrustReadinessCopy } from "../../lib/report/trustStatus";
import { InternalAwareLink } from "./report-shell/InternalAwareLink";
import { CommandCenterNavBlock } from "./report-shell/CommandCenterNavBlock";
import { SidebarSequenceBlock } from "./report-shell/SidebarSequenceBlock";
import {
  HeroTrustProvenanceBlock,
  InlineTrustBlock,
} from "./report-shell/TrustBlocks";
import type {
  ActionSequence,
  DecisionBanner,
  DecisionDiff,
  ExportCtaProps,
  ReportCtaProps,
  RoleSwitcher,
  SecondaryCtaProps,
} from "./report-shell/types";

type ReportShellInput = {
  statusLabel: string;
  regime?: RegimeIconType;
  recordDateLabel: string;
  fetchedAtLabel: string;
  treasurySource: string;
  pageTitle: string;
  pageSummary: string;
  pageSummaryLink?: { href: string; label: string };
  sectionLinks: ReportSectionLink[];
  trustStatusLabel: string;
  trustStatusDetail: string;
  trustStatusAction: string;
  trustStatusTone: "stable" | "warning" | "historical";
  outageType?: "live-data" | "feed-unavailable" | "stale-cache" | "source-divergence" | "historical-snapshot";
  outageSeverity?: "advisory" | "blocking" | "critical";
  decisionImpactWindow?: string;
  approvalBuckets?: Array<{ label: string; detail: string }>;
  recoveryPlan?: { owner: string; nextCheckpoint: string; exitCondition: string };
  outageExitGate?: { label: string; summary: string; metCount: number; totalCount: number };
  degradedSourceRows?: Array<{ sourceName: string; modeLabel: string; freshnessStatus: string }>;
  showOfflineBadge?: boolean;
  offlineBadgeLabel?: string;
  heroVariant?: "full" | "compact";
  sidebarVariant?: "full" | "hidden";
  hideHeroChrome?: boolean;
  primaryCta?: ReportCtaProps;
  secondaryCta?: SecondaryCtaProps;
  exportCta?: ExportCtaProps | null;
  structuredData?: unknown;
  historicalBanner?: ReactNode;
  currentPath: string;
  stageRail?: {
    title?: string;
    items: ReportStageItem[];
  };
  decisionBanner?: DecisionBanner;
  actionSequence?: ActionSequence;
  roleSwitcher?: RoleSwitcher;
  decisionDiffs?: DecisionDiff[];
  nextStep?: { description: string; href: string };
  nextRefreshLabel?: string;
  inlineTrustPlacement?: "before-content" | "after-first-section" | "hidden";
  provenance?: DataProvenance;
  commandBar?: RegimeCommandBarProps;
  ambientMode?: "standard" | "tv";
};

type ReportShellModel = {
  status: Pick<ReportShellInput, "statusLabel" | "regime" | "recordDateLabel" | "fetchedAtLabel" | "treasurySource">;
  page: Pick<ReportShellInput, "pageTitle" | "pageSummary" | "pageSummaryLink" | "sectionLinks" | "currentPath">;
  trust: Pick<ReportShellInput, "trustStatusLabel" | "trustStatusDetail" | "trustStatusAction" | "trustStatusTone" | "outageType" | "outageSeverity" | "decisionImpactWindow" | "approvalBuckets" | "recoveryPlan" | "outageExitGate" | "degradedSourceRows" | "showOfflineBadge" | "offlineBadgeLabel" | "inlineTrustPlacement" | "provenance">;
  chrome?: Pick<ReportShellInput, "heroVariant" | "sidebarVariant" | "hideHeroChrome" | "ambientMode">;
  actions?: Pick<ReportShellInput, "primaryCta" | "secondaryCta" | "exportCta" | "nextStep" | "nextRefreshLabel">;
  payloads?: Pick<ReportShellInput, "structuredData" | "historicalBanner" | "stageRail" | "decisionBanner" | "actionSequence" | "roleSwitcher" | "decisionDiffs" | "commandBar">;
};

type ReportShellProps = { children: ReactNode } & (
  | ({ model: ReportShellModel } & { [K in keyof ReportShellInput]?: never })
  | ({ model?: never } & ReportShellInput)
);

export { CommandCenterNavBlock } from "./report-shell/CommandCenterNavBlock";
export {
  HeroTrustProvenanceBlock,
  resolveTrustProvenance,
} from "./report-shell/TrustBlocks";
export { SidebarSequenceBlock } from "./report-shell/SidebarSequenceBlock";

const normalizeReportShellInput = (props: ReportShellProps): ReportShellInput => {
  if ("model" in props && props.model) {
    const { model } = props;
    return {
      ...model.status,
      ...model.page,
      ...model.trust,
      ...model.chrome,
      ...model.actions,
      ...model.payloads,
    };
  }

  return props;
};

export const ReportShell = (props: ReportShellProps) => {
  const { children } = props;
  const input = normalizeReportShellInput(props);
  const {
    statusLabel: resolvedStatusLabel,
    regime: resolvedRegime,
    recordDateLabel: resolvedRecordDateLabel,
    fetchedAtLabel: resolvedFetchedAtLabel,
    treasurySource: resolvedTreasurySource,
    pageTitle: resolvedPageTitle,
    pageSummary: resolvedPageSummary,
    pageSummaryLink: resolvedPageSummaryLink,
    sectionLinks: resolvedSectionLinks,
    currentPath: resolvedCurrentPath,
    trustStatusDetail: resolvedTrustStatusDetail,
    trustStatusAction: resolvedTrustStatusAction,
    trustStatusTone: resolvedTrustStatusTone,
    outageType: resolvedOutageType,
    outageSeverity: resolvedOutageSeverity,
    decisionImpactWindow: resolvedDecisionImpactWindow,
    approvalBuckets: resolvedApprovalBuckets,
    recoveryPlan: resolvedRecoveryPlan,
    outageExitGate: resolvedOutageExitGate,
    degradedSourceRows: resolvedDegradedSourceRows,
    showOfflineBadge: resolvedShowOfflineBadge = false,
    offlineBadgeLabel: resolvedOfflineBadgeLabel = "Cached snapshot",
    heroVariant: resolvedHeroVariant = "full",
    sidebarVariant: resolvedSidebarVariant = "full",
    hideHeroChrome: resolvedHideHeroChrome = false,
    primaryCta: inputPrimaryCta,
    secondaryCta: resolvedSecondaryCta,
    exportCta: inputExportCta,
    structuredData: resolvedStructuredData,
    historicalBanner: resolvedHistoricalBanner,
    stageRail: resolvedStageRail,
    decisionBanner: resolvedDecisionBanner,
    actionSequence: resolvedActionSequence,
    roleSwitcher: resolvedRoleSwitcher,
    decisionDiffs: resolvedDecisionDiffs,
    nextStep: resolvedNextStep,
    nextRefreshLabel,
    inlineTrustPlacement: resolvedInlineTrustPlacement = "before-content",
    provenance: resolvedProvenance,
    commandBar: resolvedCommandBar,
    ambientMode: resolvedAmbientMode = "standard",
  } = input;
  const resolvedPrimaryCta =
    inputPrimaryCta ?? (resolvedCurrentPath === "/" ? undefined : { href: "#weekly-action-summary", label: "This week" });
  const resolvedExportCta = inputExportCta ?? null;
  const resolvedNextRefreshLabel = nextRefreshLabel ?? (resolvedTrustStatusTone === "historical" ? "Fixed historical snapshot" : "15m cadence");
  const contentSections = Children.toArray(children);
  const summaryLink = resolvedPageSummaryLink ? <InternalAwareLink href={resolvedPageSummaryLink.href} className="inline-flex min-h-[44px] items-center text-xs font-semibold text-sky-200 underline decoration-slate-500/80 underline-offset-4">{resolvedPageSummaryLink.label}</InternalAwareLink> : null;
  const hasSidebar = resolvedSidebarVariant === "full";
  const sidebarEnabled = hasSidebar;
  const missionSequenceLabels = ["Now", "Next", "Later"];
  const missionSequenceTitle = resolvedActionSequence?.title ?? "Plan";
  const missionSequenceItems = (resolvedActionSequence?.items ?? []).slice(0, 3).map((item, index) => ({ ...item, phase: missionSequenceLabels[index] ?? `Step ${index + 1}` }));
  const sourceHref = resolvedTreasurySource.startsWith("http") ? resolvedTreasurySource : undefined;
  const sourceLabel = sourceHref ? (() => { try { const hostname = new URL(sourceHref).hostname.replace(/^www\./, ""); if (hostname.includes("stlouisfed.org")) return "FRED"; if (hostname.includes("fiscaldata.treasury.gov")) return "Treasury Fiscal Data"; return hostname; } catch { return resolvedTreasurySource; } })() : resolvedTreasurySource;
  const isPrimaryActionInSectionLinks = resolvedPrimaryCta ? resolvedSectionLinks.some((section) => section.href === resolvedPrimaryCta.href) : false;
  const showMobileActionCard = Boolean(resolvedPrimaryCta) && !isPrimaryActionInSectionLinks;
  const showIntroBlock = !resolvedHideHeroChrome;
  const renderTrustBeforeContent =
    !showIntroBlock
    && !hasSidebar
    && resolvedInlineTrustPlacement === "before-content";
  const renderTrustAfterFirstSection =
    !showIntroBlock
    && resolvedInlineTrustPlacement !== "hidden"
    && (hasSidebar || resolvedInlineTrustPlacement === "after-first-section");
  const enableTvAmbientMode = resolvedAmbientMode === "tv";
  const trustReadiness = resolveTrustReadinessCopy({
    trustStatusTone: resolvedTrustStatusTone,
    degradedSourceRows: resolvedDegradedSourceRows,
    trustStatusDetail: resolvedTrustStatusDetail,
  });
  const controlHeadline = trustReadiness.headline;
  const trustStatusDetailForDisplay = resolvedTrustStatusDetail;
  const trustStatusActionForDisplay = resolvedTrustStatusAction;
  const extendedCommandBar =
    showIntroBlock && resolvedCurrentPath === "/" ? resolvedCommandBar : undefined;
  const trustBlockProps = {
    trustStatusTone: trustReadiness.tone,
    trustStatusLabel: controlHeadline,
    trustStatusDetail: trustStatusDetailForDisplay,
    trustStatusAction: trustStatusActionForDisplay,
    outageType: resolvedOutageType,
    outageSeverity: resolvedOutageSeverity,
    decisionImpactWindow: resolvedDecisionImpactWindow,
    approvalBuckets: resolvedApprovalBuckets,
    recoveryPlan: resolvedRecoveryPlan,
    outageExitGate: resolvedOutageExitGate,
    degradedSourceRows: resolvedDegradedSourceRows,
    statusLabel: resolvedStatusLabel,
    fetchedAtLabel: resolvedFetchedAtLabel,
    resolvedNextRefreshLabel,
    sourceLabel,
    sourceHref,
    provenance: resolvedProvenance,
  } as const;

  return (
    <PageShell
      regime={resolvedRegime}
      structuredData={resolvedStructuredData}
      ambientMode={resolvedAmbientMode}
    >
          {resolvedHistoricalBanner}
          {extendedCommandBar ? <div className="mt-2"><RegimeCommandBar {...extendedCommandBar} /></div> : null}

          <div className={`mt-2 ${sidebarEnabled ? "md:grid md:grid-cols-[12rem_minmax(0,1fr)] md:gap-4 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-5" : ""}`}>
            {sidebarEnabled ? (
              <aside className="hidden md:block md:sticky md:top-4 md:self-start md:h-[calc(100vh-2rem)] md:overflow-y-auto">
                <AppSidebar sectionLinks={resolvedSectionLinks} />
              </aside>
            ) : null}

            <div className={`order-1 min-w-0 space-y-5 lg:space-y-6 ${sidebarEnabled ? "" : "mx-auto w-full max-w-[72rem]"}`}>
              {showIntroBlock ? <CommandCenterNavBlock heroVariant={resolvedHeroVariant} pageTitle={resolvedPageTitle} pageSummary={resolvedPageSummary} summaryLink={summaryLink} recordDateLabel={resolvedRecordDateLabel} roleSwitcher={resolvedRoleSwitcher} primaryCta={resolvedPrimaryCta} secondaryCta={resolvedSecondaryCta} exportCta={resolvedExportCta} nextStep={resolvedNextStep} statusLabel={resolvedStatusLabel} trustStatusLabel={controlHeadline} fetchedAtLabel={resolvedFetchedAtLabel} resolvedNextRefreshLabel={resolvedNextRefreshLabel} trustStatusAction={trustStatusActionForDisplay} showOfflineBadge={resolvedShowOfflineBadge} offlineBadgeLabel={resolvedOfflineBadgeLabel} decisionBanner={resolvedDecisionBanner} missionSupportText={trustStatusDetailForDisplay} decisionDiffs={resolvedDecisionDiffs} missionSequenceTitle={missionSequenceTitle} missionSequenceItems={missionSequenceItems} /> : null}

              <SidebarSequenceBlock stageRail={resolvedStageRail} />

              {renderTrustBeforeContent ? <InlineTrustBlock {...trustBlockProps} /> : null}

              <div className="divide-y divide-white/[0.04]">
                {contentSections.map((section, index) => {
                  const sectionKey =
                    isValidElement(section) && section.key != null
                      ? section.key
                      : `section-${index}`;
                  return (
                    <div key={sectionKey} className={index === 0 ? "pb-4 lg:pb-6" : "py-4 lg:py-6"}>
                      {section}
                      {renderTrustAfterFirstSection && index === 0 ? (
                        <div className="mt-4">
                          <InlineTrustBlock {...trustBlockProps} />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <footer className="mt-8 border-t border-white/[0.04] pt-4 text-fluid-xs font-semibold tracking-[0.18em] text-slate-400">
                <p>{INTERNAL_USE_LABEL}</p>
              </footer>
            </div>
          </div>

        {showMobileActionCard && resolvedPrimaryCta ? <div className="sm:hidden mt-6 px-4"><section className="weather-panel border-sky-500/40 bg-slate-950/95 px-3 py-3"><p className="text-fluid-xs font-semibold tracking-[0.14em] text-slate-300">Current posture</p><div className="mt-2 flex items-center justify-between gap-3"><p className="max-w-[16rem] text-xs font-semibold text-slate-100">{resolvedDecisionBanner?.decision ?? `${resolvedPrimaryCta.label}.`}</p><ReportCta href={resolvedPrimaryCta.href} copyText={resolvedPrimaryCta.copyText} copyTarget={resolvedPrimaryCta.copyTarget} label={resolvedPrimaryCta.label} className="weather-button-primary inline-flex min-h-[44px] flex-shrink-0 items-center justify-center rounded-sm px-3 py-2 text-xs font-semibold tracking-[0.14em]">{resolvedPrimaryCta.label}</ReportCta></div></section></div> : null}

        {enableTvAmbientMode && resolvedPrimaryCta ? <aside className="tv-action-rail" aria-label="TV quick actions"><p className="text-xs font-semibold tracking-[0.18em] text-slate-400">Quick actions</p><div className="mt-2 grid gap-2"><ReportCta href={resolvedPrimaryCta.href} copyText={resolvedPrimaryCta.copyText} copyTarget={resolvedPrimaryCta.copyTarget} label={resolvedPrimaryCta.label} className="weather-button-primary inline-flex min-h-[56px] items-center justify-center px-4 py-2 text-center text-sm font-semibold tracking-[0.12em] text-slate-100">{resolvedPrimaryCta.label}</ReportCta>{resolvedSecondaryCta ? <InternalAwareLink href={resolvedSecondaryCta.href} className="weather-pill inline-flex min-h-[56px] items-center justify-center px-4 py-2 text-center text-sm font-semibold tracking-[0.12em] text-slate-200">{resolvedSecondaryCta.label}</InternalAwareLink> : null}<DisplayModeToggle /></div></aside> : null}
    </PageShell>
  );
};
