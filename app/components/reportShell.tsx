/**
 * Shared report shell layout for Whether Report pages.
 * Keeps header, navigation, and layout consistent across multi-page views.
 */
import { Children, type ReactNode, isValidElement } from "react";
import { DisplayGuardian } from "./displayGuardian";
import { DisplayModeManager } from "./displayModeManager";
import { DisplayModeToggle } from "./displayModeToggle";
import type { DataProvenance } from "./dataProvenanceStrip";
import {
  ReportSectionNavigation,
  type ReportPageLink,
  type ReportSectionLink,
} from "./reportShellNavigation";
import { type ReportStageItem } from "./reportRevampElements";
import { INFORMATIONAL_NOTICE } from "../../lib/exportNotices";
import { serializeJsonLd } from "../../lib/seo";
import { AnchorFeedback } from "./anchorFeedback";
import { ReportCta } from "./reportCta";
import { ClimateBackdrop } from "./climateBackdrop";
import { RegimeIconType } from "./regimeIcons";
import { RegimeCommandBar, type RegimeCommandBarProps } from "./RegimeCommandBar";
import { ReportShellHeader, type ReportShellHeaderVariant } from "./reportShellHeader";
import { resolveTrustReadinessCopy } from "../../lib/report/trustStatus";
import { WebVitalsTracker } from "./webVitalsTracker";
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
  pageLinks: ReportPageLink[];
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
  pageNavVariant?: "full" | "compact";
  showPageNavigation?: boolean;
  headerVariant?: ReportShellHeaderVariant;
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
  inlineTrustPlacement?: "before-content" | "after-first-section";
  provenance?: DataProvenance;
  commandBar?: RegimeCommandBarProps;
  ambientMode?: "standard" | "tv";
};

type ReportShellModel = {
  status: Pick<ReportShellInput, "statusLabel" | "regime" | "recordDateLabel" | "fetchedAtLabel" | "treasurySource">;
  page: Pick<ReportShellInput, "pageTitle" | "pageSummary" | "pageSummaryLink" | "pageLinks" | "sectionLinks" | "currentPath">;
  trust: Pick<ReportShellInput, "trustStatusLabel" | "trustStatusDetail" | "trustStatusAction" | "trustStatusTone" | "outageType" | "outageSeverity" | "decisionImpactWindow" | "approvalBuckets" | "recoveryPlan" | "outageExitGate" | "degradedSourceRows" | "showOfflineBadge" | "offlineBadgeLabel" | "inlineTrustPlacement" | "provenance">;
  chrome?: Pick<ReportShellInput, "heroVariant" | "pageNavVariant" | "showPageNavigation" | "headerVariant" | "sidebarVariant" | "hideHeroChrome" | "ambientMode">;
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
    pageLinks: resolvedPageLinks,
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
    pageNavVariant: resolvedPageNavVariant = "full",
    showPageNavigation: resolvedShowPageNavigation = false,
    headerVariant: resolvedHeaderVariantInput,
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
  const resolvedExportCta = inputExportCta ?? { href: "/operations#ops-export-briefs", label: "Generate executive brief" };
  const resolvedNextRefreshLabel = nextRefreshLabel ?? (resolvedTrustStatusTone === "historical" ? "Fixed historical snapshot" : "15m cadence");
  const contentSections = Children.toArray(children);
  const summaryLink = resolvedPageSummaryLink ? <InternalAwareLink href={resolvedPageSummaryLink.href} className="inline-flex min-h-[44px] items-center text-xs font-semibold text-sky-200 underline decoration-slate-500/80 underline-offset-4">{resolvedPageSummaryLink.label}</InternalAwareLink> : null;
  const hasSidebar = resolvedSidebarVariant === "full";
  const missionSequenceLabels = ["Now", "Next", "Later"];
  const missionSequenceTitle = resolvedActionSequence?.title ?? "Plan";
  const missionSequenceItems = (resolvedActionSequence?.items ?? []).slice(0, 3).map((item, index) => ({ ...item, phase: missionSequenceLabels[index] ?? `Step ${index + 1}` }));
  const sourceHref = resolvedTreasurySource.startsWith("http") ? resolvedTreasurySource : undefined;
  const sourceLabel = sourceHref ? (() => { try { const hostname = new URL(sourceHref).hostname.replace(/^www\./, ""); if (hostname.includes("stlouisfed.org")) return "FRED"; if (hostname.includes("fiscaldata.treasury.gov")) return "Treasury Fiscal Data"; return hostname; } catch { return resolvedTreasurySource; } })() : resolvedTreasurySource;
  const resolvedHeaderVariant: ReportShellHeaderVariant = resolvedHeaderVariantInput ?? (resolvedHideHeroChrome ? "home-brief" : "standard");
  const headerExportCta = resolvedCurrentPath === "/" ? resolvedExportCta : null;
  const bodyExportCta = resolvedCurrentPath === "/" ? null : resolvedExportCta;
  const isPrimaryActionInSectionLinks = resolvedPrimaryCta ? resolvedSectionLinks.some((section) => section.href === resolvedPrimaryCta.href) : false;
  const showMobileActionCard = Boolean(resolvedPrimaryCta) && !isPrimaryActionInSectionLinks;
  const showInlineTrustBlock = !hasSidebar;
  const renderTrustBeforeContent = showInlineTrustBlock && resolvedInlineTrustPlacement === "before-content";
  const renderTrustAfterFirstSection = showInlineTrustBlock && resolvedInlineTrustPlacement === "after-first-section";
  const renderMobileTrustAfterFirstSection = hasSidebar;
  const enableTvAmbientMode = resolvedAmbientMode === "tv";
  const trustReadiness = resolveTrustReadinessCopy({
    trustStatusTone: resolvedTrustStatusTone,
    degradedSourceRows: resolvedDegradedSourceRows,
  });
  const maxSectionNavItemsDesktop = 4;
  const controlHeadline = trustReadiness.headline;
  const trustStatusDetailForDisplay = trustReadiness.tone === "warning"
    ? "Decision impact: keep the do now / hold / revisit path, but do not treat this as a clear read until freshness and confidence recover."
    : resolvedTrustStatusDetail;
  const trustStatusActionForDisplay = trustReadiness.tone === "warning"
    ? "Pause irreversible approvals until one verified live refresh lands."
    : resolvedTrustStatusAction;
  const extendedCommandBar = resolvedCurrentPath === "/" ? resolvedCommandBar : undefined;
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
    <>
      <main id="main-content" tabIndex={-1} className="weather-shell relative isolate min-h-screen overflow-x-clip text-slate-100">
        <ClimateBackdrop regime={resolvedRegime || "NEUTRAL"} />
        <WebVitalsTracker />
        {resolvedStructuredData ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(resolvedStructuredData) }} /> : null}
        {enableTvAmbientMode ? <DisplayModeManager /> : null}
        {enableTvAmbientMode ? <AnchorFeedback /> : null}
        {enableTvAmbientMode ? <DisplayGuardian /> : null}
        <div className="tv-rail-safe relative z-10 mx-auto max-w-[88rem] pb-[calc(env(safe-area-inset-bottom)+10rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)] pl-[calc(env(safe-area-inset-left)+1rem)] pr-[calc(env(safe-area-inset-right)+1rem)] sm:pb-10 sm:pt-5 sm:pl-[calc(env(safe-area-inset-left)+1.25rem)] sm:pr-[calc(env(safe-area-inset-right)+1.25rem)]">
          <ReportShellHeader
            variant={resolvedHeaderVariant}
            statusLabel={resolvedStatusLabel}
            fetchedAtLabel={resolvedFetchedAtLabel}
            recordDateLabel={resolvedRecordDateLabel}
            currentPath={resolvedCurrentPath}
            showPageNavigation={resolvedShowPageNavigation}
            pageLinks={resolvedPageLinks}
            pageTitle={resolvedPageTitle}
            pageNavVariant={resolvedPageNavVariant}
            exportCta={headerExportCta}
          />
          {resolvedHistoricalBanner}
          {extendedCommandBar ? <div className="mt-4"><RegimeCommandBar {...extendedCommandBar} /></div> : null}

          <div className={`mt-4 grid min-w-0 gap-5 xl:gap-6 ${hasSidebar ? "xl:grid-cols-[minmax(0,1fr)_minmax(18rem,20rem)] xl:items-start" : ""}`}>
            {hasSidebar ? (
              <aside className="order-2 hidden space-y-4 xl:order-none xl:col-start-2 xl:row-start-1 xl:block xl:sticky xl:top-28 xl:self-start">
                {resolvedSectionLinks.length ? (
                  <ReportSectionNavigation
                    sectionLinks={resolvedSectionLinks}
                    className="hidden xl:block"
                    maxItems={maxSectionNavItemsDesktop}
                  />
                ) : null}
                <HeroTrustProvenanceBlock {...trustBlockProps} />
              </aside>
            ) : null}

            <div className={`order-1 min-w-0 space-y-8 lg:space-y-10 xl:order-none xl:col-start-1 xl:row-start-1 ${hasSidebar ? "" : "mx-auto w-full max-w-[78rem]"}`}>
              {!resolvedHideHeroChrome ? <CommandCenterNavBlock heroVariant={resolvedHeroVariant} pageTitle={resolvedPageTitle} pageSummary={resolvedPageSummary} summaryLink={summaryLink} recordDateLabel={resolvedRecordDateLabel} roleSwitcher={resolvedRoleSwitcher} primaryCta={resolvedPrimaryCta} secondaryCta={resolvedSecondaryCta} exportCta={bodyExportCta} nextStep={resolvedNextStep} statusLabel={resolvedStatusLabel} trustStatusLabel={controlHeadline} fetchedAtLabel={resolvedFetchedAtLabel} resolvedNextRefreshLabel={resolvedNextRefreshLabel} trustStatusAction={trustStatusActionForDisplay} showOfflineBadge={resolvedShowOfflineBadge} offlineBadgeLabel={resolvedOfflineBadgeLabel} decisionBanner={resolvedDecisionBanner} missionSupportText={trustStatusDetailForDisplay} decisionDiffs={resolvedDecisionDiffs} missionSequenceTitle={missionSequenceTitle} missionSequenceItems={missionSequenceItems} /> : null}

              <SidebarSequenceBlock stageRail={resolvedStageRail} />

              {renderTrustBeforeContent ? <InlineTrustBlock {...trustBlockProps} /> : null}

              <div className="space-y-10 lg:space-y-12">
                {contentSections.map((section, index) => {
                  const sectionKey =
                    isValidElement(section) && section.key != null
                      ? section.key
                      : `section-${index}`;
                  return (
                    <div
                      key={sectionKey}
                      className={index === 0 ? "" : "border-t border-slate-800/70 pt-10 lg:pt-12"}
                    >
                      {section}
                      {renderTrustAfterFirstSection && index === 0 ? (
                        <div className="mt-4">
                          <InlineTrustBlock {...trustBlockProps} />
                        </div>
                      ) : null}
                      {renderMobileTrustAfterFirstSection && index === 0 ? (
                        <div className="mt-4 xl:hidden">
                          <InlineTrustBlock {...trustBlockProps} />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <footer className="mt-12 border-t border-slate-800/70 pt-6 text-xs font-semibold tracking-[0.18em] text-slate-300">
                <p>{INFORMATIONAL_NOTICE}</p>
              </footer>
            </div>
          </div>
        </div>

        {showMobileActionCard && resolvedPrimaryCta ? <div className="sm:hidden mt-6 px-4"><section className="weather-panel border-sky-500/40 bg-slate-950/95 px-3 py-3"><p className="text-[11px] font-semibold tracking-[0.14em] text-slate-300">Current posture</p><div className="mt-2 flex items-center justify-between gap-3"><p className="max-w-[16rem] text-xs font-semibold text-slate-100">{resolvedDecisionBanner?.decision ?? `${resolvedPrimaryCta.label}.`}</p><ReportCta href={resolvedPrimaryCta.href} copyText={resolvedPrimaryCta.copyText} copyTarget={resolvedPrimaryCta.copyTarget} label={resolvedPrimaryCta.label} className="weather-button-primary inline-flex min-h-[44px] flex-shrink-0 items-center justify-center rounded-full px-3 py-2 text-xs font-semibold tracking-[0.14em]">{resolvedPrimaryCta.label}</ReportCta></div></section></div> : null}

        {enableTvAmbientMode && resolvedPrimaryCta ? <aside className="tv-action-rail" aria-label="TV quick actions"><p className="text-xs font-semibold tracking-[0.18em] text-slate-400">Quick actions</p><div className="mt-2 grid gap-2"><ReportCta href={resolvedPrimaryCta.href} copyText={resolvedPrimaryCta.copyText} copyTarget={resolvedPrimaryCta.copyTarget} label={resolvedPrimaryCta.label} className="weather-button-primary inline-flex min-h-[56px] items-center justify-center px-4 py-2 text-center text-sm font-semibold tracking-[0.12em] text-slate-100">{resolvedPrimaryCta.label}</ReportCta>{resolvedSecondaryCta ? <InternalAwareLink href={resolvedSecondaryCta.href} className="weather-pill inline-flex min-h-[56px] items-center justify-center px-4 py-2 text-center text-sm font-semibold tracking-[0.12em] text-slate-200">{resolvedSecondaryCta.label}</InternalAwareLink> : null}<DisplayModeToggle /></div></aside> : null}
      </main>
    </>
  );
};
